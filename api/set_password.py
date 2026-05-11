"""
CLI: create or update a Horizon Launch admin user's password.

Usage:
  python set_password.py <email> [--name "Denise Edinger"]

If no password is piped via stdin, prompts interactively.
"""

import argparse
import getpass
import sqlite3
import sys
import time
from pathlib import Path

from passlib.context import CryptContext

DB_PATH = Path(__import__("os").environ.get("HL_DB_PATH", "data/site.db")).resolve()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def main():
	parser = argparse.ArgumentParser(description="Set Horizon Launch admin password")
	parser.add_argument("email", help="user email (lowercased for storage)")
	parser.add_argument("--name", default=None, help="display name")
	parser.add_argument("--password", default=None, help="password (omit for interactive prompt)")
	args = parser.parse_args()

	email = args.email.strip().lower()
	password = args.password
	if not password:
		if sys.stdin.isatty():
			password = getpass.getpass("Password: ")
			confirm = getpass.getpass("Confirm: ")
			if password != confirm:
				print("Passwords don't match.", file=sys.stderr)
				sys.exit(1)
		else:
			password = sys.stdin.readline().rstrip("\n")
	if len(password) < 8:
		print("Password must be at least 8 characters.", file=sys.stderr)
		sys.exit(1)

	password_hash = pwd_ctx.hash(password)
	now = int(time.time())

	DB_PATH.parent.mkdir(parents=True, exist_ok=True)
	conn = sqlite3.connect(DB_PATH)
	conn.execute("""
		CREATE TABLE IF NOT EXISTS users (
			email TEXT PRIMARY KEY,
			password_hash TEXT NOT NULL,
			display_name TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	""")
	conn.execute(
		"INSERT INTO users (email, password_hash, display_name, created_at, updated_at) "
		"VALUES (?, ?, ?, ?, ?) "
		"ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, display_name=COALESCE(excluded.display_name, users.display_name), updated_at=excluded.updated_at",
		(email, password_hash, args.name, now, now),
	)
	conn.commit()
	conn.close()
	print(f"Set password for {email}")


if __name__ == "__main__":
	main()
