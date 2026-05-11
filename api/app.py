"""
Horizon Launch backend — FastAPI service.

Routes:
  GET    /api/events                — public list of events (sorted by date)
  POST   /api/contact               — public contact form, sent via Web3Forms
  POST   /api/login                 — public: email + password → session cookie
  POST   /api/logout                — clear session
  GET    /api/whoami                — current logged-in user (or null)
  GET    /api/health                — liveness probe
  POST   /api/admin/events          — admin: create event
  PUT    /api/admin/events/{id}     — admin: update event
  DELETE /api/admin/events/{id}     — admin: delete event

Auth: bcrypt-hashed passwords in SQLite. Login issues a random session token
stored in a sessions table and set as an HTTP-only Secure SameSite=Lax cookie.
Admin routes require a valid non-expired session.

Database: SQLite at $HL_DB_PATH (default ./data/site.db). Auto-creates schema
on first run.

Outbound: contact form posts to Web3Forms using HL_WEB3FORMS_KEY.
"""

from __future__ import annotations

import os
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

import bcrypt
import httpx
from fastapi import Cookie, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

DB_PATH = Path(os.environ.get("HL_DB_PATH", "data/site.db")).resolve()
WEB3FORMS_KEY = os.environ.get("HL_WEB3FORMS_KEY", "")
DEV_MODE = os.environ.get("HL_DEV", "") == "1"
SESSION_DAYS = int(os.environ.get("HL_SESSION_DAYS", "7"))
COOKIE_NAME = "hl_session"

# bcrypt has a 72-byte hard limit on the input. We pre-hash with sha256 first
# so passwords of any length verify correctly and consistently.
import hashlib


def _bcrypt_prep(password: str) -> bytes:
	# sha256 → 32 bytes (well under bcrypt's 72-byte cap), preserves entropy
	return hashlib.sha256(password.encode("utf-8")).digest()


def hash_password(password: str) -> str:
	return bcrypt.hashpw(_bcrypt_prep(password), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, hashed: str) -> bool:
	try:
		return bcrypt.checkpw(_bcrypt_prep(password), hashed.encode("ascii"))
	except (ValueError, TypeError):
		return False

TOPIC_ROUTING_DEFAULT = {
	"general": "denise.edinger@sbdfinancial.ca",
	"insurance": "catherine.sakowsky@sbdfinancial.ca",
	"retirement": "denise.edinger@sbdfinancial.ca",
	"estate": "tracy.comte@sbdfinancial.ca",
	"event": "denise.edinger@sbdfinancial.ca",
}


def topic_recipient(topic: str) -> str:
	env_key = f"HL_TOPIC_{topic.upper()}"
	return os.environ.get(env_key) or TOPIC_ROUTING_DEFAULT.get(topic, TOPIC_ROUTING_DEFAULT["general"])


# ----- DB -----

def db_connect() -> sqlite3.Connection:
	DB_PATH.parent.mkdir(parents=True, exist_ok=True)
	conn = sqlite3.connect(DB_PATH)
	conn.row_factory = sqlite3.Row
	conn.execute("PRAGMA journal_mode=WAL")
	conn.execute("PRAGMA foreign_keys=ON")
	return conn


def db_init():
	with db_connect() as conn:
		conn.executescript("""
			CREATE TABLE IF NOT EXISTS events (
				id               TEXT PRIMARY KEY,
				title            TEXT NOT NULL,
				date             TEXT NOT NULL,
				time             TEXT,
				format           TEXT NOT NULL DEFAULT 'online',
				location         TEXT,
				description      TEXT,
				registration_url TEXT,
				created_at       INTEGER NOT NULL,
				updated_at       INTEGER NOT NULL
			);
			CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

			CREATE TABLE IF NOT EXISTS contact_submissions (
				id          INTEGER PRIMARY KEY AUTOINCREMENT,
				name        TEXT NOT NULL,
				email       TEXT NOT NULL,
				topic       TEXT NOT NULL,
				message     TEXT,
				routed_to   TEXT,
				delivery    TEXT,
				created_at  INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS users (
				email         TEXT PRIMARY KEY,
				password_hash TEXT NOT NULL,
				display_name  TEXT,
				created_at    INTEGER NOT NULL,
				updated_at    INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS sessions (
				token       TEXT PRIMARY KEY,
				email       TEXT NOT NULL,
				expires_at  INTEGER NOT NULL,
				created_at  INTEGER NOT NULL,
				FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
			);
			CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email);
		""")
		count = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
		if count == 0:
			now = int(time.time())
			seed = [
				("evt-001", "Women & Wealth: Investing In Your Future", "2026-03-26",
				 "7:30 PM – 8:30 PM MT", "online", "Online via Zoom",
				 "Take control of your financial future with confidence. An exclusive session designed to empower women with the knowledge, tools, and mindset to build lasting wealth.",
				 "https://eventbrite.ca/"),
				("evt-002", "Critical Illness vs Life Insurance — Explained", "2026-04-22",
				 "7:00 PM – 8:00 PM MT", "online", "Online via Zoom",
				 "A 60-minute walkthrough of how critical illness and life insurance work together — not either/or. What your work benefits cover, and what they don't.",
				 "https://eventbrite.ca/"),
				("evt-003", "Renewing Your Mortgage in 2026? Run the Numbers First", "2026-06-18",
				 "6:30 PM – 8:00 PM MT", "in-person", "St Albert Inn & Suites, 156 St Albert Trail, St Albert",
				 "If your mortgage renews in 2026, your payment is changing. Walk through the math, the options, and what to do before you sign the renewal letter.",
				 "https://eventbrite.ca/"),
				("evt-past-001", "Money Matters: Building Wealth, Protecting Your Future", "2025-11-08",
				 "10:00 AM – 12:30 PM", "in-person", "The Thompson Hotel, 650 Victoria St, Kamloops",
				 "From paycheque to prosperity — practical strategies for every Canadian.",
				 ""),
			]
			for row in seed:
				conn.execute(
					"INSERT INTO events (id, title, date, time, format, location, description, registration_url, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
					(*row, now, now),
				)


@contextmanager
def db():
	conn = db_connect()
	try:
		yield conn
		conn.commit()
	except Exception:
		conn.rollback()
		raise
	finally:
		conn.close()


# ----- Session helpers -----

def session_lookup(token: Optional[str]) -> Optional[str]:
	if not token:
		return None
	now = int(time.time())
	with db() as conn:
		row = conn.execute(
			"SELECT email, expires_at FROM sessions WHERE token = ?",
			(token,),
		).fetchone()
		if not row:
			return None
		if row["expires_at"] < now:
			conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
			return None
	return row["email"]


def session_create(email: str) -> tuple[str, int]:
	token = secrets.token_urlsafe(32)
	now = int(time.time())
	expires = now + SESSION_DAYS * 86400
	with db() as conn:
		conn.execute(
			"INSERT INTO sessions (token, email, expires_at, created_at) VALUES (?,?,?,?)",
			(token, email, expires, now),
		)
	return token, expires


def session_delete(token: Optional[str]):
	if not token:
		return
	with db() as conn:
		conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def set_session_cookie(response: Response, token: str, expires: int):
	response.set_cookie(
		key=COOKIE_NAME,
		value=token,
		httponly=True,
		secure=not DEV_MODE,  # require HTTPS in production
		samesite="lax",
		expires=expires,
		path="/",
	)


def clear_session_cookie(response: Response):
	response.delete_cookie(key=COOKIE_NAME, path="/")


def require_admin(session_token: Optional[str]) -> str:
	email = session_lookup(session_token)
	if not email:
		raise HTTPException(status_code=401, detail="Not authenticated")
	return email


# ----- Schemas -----

class Event(BaseModel):
	id: Optional[str] = None
	title: str = Field(min_length=1, max_length=200)
	date: str = Field(min_length=10, max_length=10)
	time: str = ""
	format: str = Field(default="online", pattern="^(online|in-person)$")
	location: str = ""
	description: str = ""
	registration_url: str = ""


class ContactSubmission(BaseModel):
	name: str = Field(min_length=1, max_length=200)
	email: EmailStr
	topic: str = Field(default="general", max_length=40)
	message: str = Field(default="", max_length=5000)


class LoginRequest(BaseModel):
	email: EmailStr
	password: str = Field(min_length=1, max_length=200)


# ----- App -----

app = FastAPI(title="Horizon Launch API")

if DEV_MODE:
	app.add_middleware(
		CORSMiddleware,
		allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
		allow_credentials=True,
		allow_methods=["*"],
		allow_headers=["*"],
	)


@app.on_event("startup")
def _startup():
	db_init()


@app.get("/api/health")
def health():
	return {"ok": True}


@app.get("/api/whoami")
def whoami(hl_session: Optional[str] = Cookie(default=None)):
	email = session_lookup(hl_session)
	if not email:
		return {"email": None}
	return {"email": email}


@app.post("/api/login")
def login(req: LoginRequest, response: Response):
	with db() as conn:
		row = conn.execute(
			"SELECT email, password_hash FROM users WHERE email = ?",
			(req.email.lower(),),
		).fetchone()
	if row and verify_password(req.password, row["password_hash"]):
		ok = True
	else:
		# Run a hash against a dummy value to keep timing similar when user doesn't exist
		hash_password("dummy-to-equalize-timing")
		ok = False
	if not ok:
		raise HTTPException(status_code=401, detail="Invalid email or password")

	token, expires = session_create(row["email"])
	set_session_cookie(response, token, expires)
	return {"email": row["email"], "expires_at": expires}


@app.post("/api/logout")
def logout(response: Response, hl_session: Optional[str] = Cookie(default=None)):
	session_delete(hl_session)
	clear_session_cookie(response)
	return {"ok": True}


@app.get("/api/events")
def list_events():
	with db() as conn:
		rows = conn.execute("SELECT id, title, date, time, format, location, description, registration_url FROM events ORDER BY date").fetchall()
	return [dict(r) for r in rows]


@app.post("/api/admin/events")
def create_event(event: Event, hl_session: Optional[str] = Cookie(default=None)):
	require_admin(hl_session)
	now = int(time.time())
	event_id = event.id or f"evt-{uuid.uuid4().hex[:10]}"
	with db() as conn:
		conn.execute(
			"INSERT INTO events (id, title, date, time, format, location, description, registration_url, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
			(event_id, event.title, event.date, event.time, event.format, event.location, event.description, event.registration_url, now, now),
		)
	return {**event.model_dump(), "id": event_id}


@app.put("/api/admin/events/{event_id}")
def update_event(event_id: str, event: Event, hl_session: Optional[str] = Cookie(default=None)):
	require_admin(hl_session)
	now = int(time.time())
	with db() as conn:
		cur = conn.execute(
			"UPDATE events SET title=?, date=?, time=?, format=?, location=?, description=?, registration_url=?, updated_at=? WHERE id=?",
			(event.title, event.date, event.time, event.format, event.location, event.description, event.registration_url, now, event_id),
		)
		if cur.rowcount == 0:
			raise HTTPException(status_code=404, detail="Event not found")
	return {**event.model_dump(), "id": event_id}


@app.delete("/api/admin/events/{event_id}")
def delete_event(event_id: str, hl_session: Optional[str] = Cookie(default=None)):
	require_admin(hl_session)
	with db() as conn:
		cur = conn.execute("DELETE FROM events WHERE id=?", (event_id,))
		if cur.rowcount == 0:
			raise HTTPException(status_code=404, detail="Event not found")
	return {"ok": True}


@app.post("/api/contact")
async def submit_contact(req: Request, submission: ContactSubmission):
	now = int(time.time())
	routed_to = topic_recipient(submission.topic)
	delivery = "skipped"

	if WEB3FORMS_KEY:
		payload = {
			"access_key": WEB3FORMS_KEY,
			"subject": f"[Horizon Launch] {submission.topic}: {submission.name}",
			"from_name": submission.name,
			"email": submission.email,
			"replyto": submission.email,
			"to": routed_to,
			"message": submission.message,
			"topic": submission.topic,
			"_referrer": req.headers.get("referer", ""),
		}
		try:
			async with httpx.AsyncClient(timeout=10.0) as client:
				r = await client.post("https://api.web3forms.com/submit", json=payload)
				delivery = "sent" if r.status_code == 200 else f"web3forms-{r.status_code}"
		except Exception as e:
			delivery = f"web3forms-error: {type(e).__name__}"
	else:
		delivery = "no-key"

	with db() as conn:
		conn.execute(
			"INSERT INTO contact_submissions (name, email, topic, message, routed_to, delivery, created_at) VALUES (?,?,?,?,?,?,?)",
			(submission.name, submission.email, submission.topic, submission.message, routed_to, delivery, now),
		)

	return {"ok": True, "delivery": delivery, "routed_to": routed_to}
