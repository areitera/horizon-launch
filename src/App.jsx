import { useState, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, Mail, ArrowRight, Lock,
  Edit2, Trash2, Plus, X, Check, Globe, Menu,
  AlertCircle, LogOut, ExternalLink
} from 'lucide-react';

// ============================================================
// BRAND TOKENS — Sunrise Horizon
// ============================================================
const C = {
  navy: '#0A1F44',
  navyDeep: '#050D1F',
  amber: '#F4A338',
  amberSoft: '#F4A33833',
  coral: '#E36B4F',
  cream: '#FAF6EE',
  creamMuted: '#F0E9DA',
  charcoal: '#1A1A1A',
  charcoalSoft: '#3A3A3A',
  white: '#FFFFFF',
  plum: '#4A2545',
  border: 'rgba(10,31,68,0.12)',
};
const F = {
  display: '"Playfair Display", "DM Serif Display", Georgia, serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// ============================================================
// API CLIENT
// ============================================================
const api = {
  async listEvents() {
    const r = await fetch('/api/events');
    if (!r.ok) throw new Error(`events: ${r.status}`);
    return r.json();
  },
  async createEvent(event) {
    const r = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!r.ok) throw new Error(`create: ${r.status}`);
    return r.json();
  },
  async updateEvent(id, event) {
    const r = await fetch(`/api/admin/events/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!r.ok) throw new Error(`update: ${r.status}`);
    return r.json();
  },
  async deleteEvent(id) {
    const r = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(`delete: ${r.status}`);
    return r.json();
  },
  async submitContact(form) {
    const r = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!r.ok) throw new Error(`contact: ${r.status}`);
    return r.json();
  },
  async whoami() {
    try {
      const r = await fetch('/api/whoami');
      if (!r.ok) return { email: null };
      return r.json();
    } catch { return { email: null }; }
  },
  async login(email, password) {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const detail = (await r.json().catch(() => ({}))).detail || `HTTP ${r.status}`;
      throw new Error(detail);
    }
    return r.json();
  },
  async logout() {
    await fetch('/api/logout', { method: 'POST' });
  },
};

// ============================================================
// HELPERS
// ============================================================
const formatDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });
const monthAbbrev = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short' }).toUpperCase();
const dayNum = (iso) => new Date(iso + 'T00:00:00').getDate();
const isPastEvent = (iso) => {
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(iso + 'T00:00:00') < today;
};

// ============================================================
// GLOBAL STYLES
// ============================================================
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { margin: 0; font-family: ${F.body}; color: ${C.charcoal}; background: ${C.cream}; }
      button { cursor: pointer; font-family: ${F.body}; }
      input, textarea, select { font-family: ${F.body}; }
      a { color: inherit; text-decoration: none; }

      .hl-display { font-family: ${F.display}; letter-spacing: -0.02em; }
      .hl-eyebrow { font-family: ${F.body}; font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; }
      .hl-line { position: relative; padding-top: 28px; }
      .hl-line::before { content: ''; position: absolute; top: 0; left: 0; width: 48px; height: 1px; background: ${C.amber}; }

      @keyframes hlFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      .hl-fade-up { animation: hlFadeUp 0.7s ease-out backwards; }
      @keyframes hlGlow { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.75; } }
      .hl-glow { animation: hlGlow 6s ease-in-out infinite; }
      .hl-lift { transition: transform 0.25s ease, box-shadow 0.25s ease; }
      .hl-lift:hover { transform: translateY(-3px); }

      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: ${C.cream}; }
      ::-webkit-scrollbar-thumb { background: ${C.navy}; border-radius: 5px; }
    `}</style>
  );
}

// ============================================================
// LOGO
// ============================================================
function Logo({ light = false }) {
  const color = light ? C.cream : C.navy;
  return (
    <div className="flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M12 2 L19 12 L12 22 L5 12 Z" fill={C.amber} stroke={C.amber} strokeWidth="0.5"/>
        <circle cx="12" cy="12" r="2.5" fill={C.navy}/>
      </svg>
      <div style={{ lineHeight: 1.1 }}>
        <div className="hl-display" style={{ color, fontSize: 18, fontWeight: 700 }}>Horizon Launch</div>
        <div style={{ color: light ? 'rgba(250,246,238,0.6)' : 'rgba(10,31,68,0.55)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500 }}>
          Financial Solutions
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NAVIGATION
// ============================================================
function Nav({ page, setPage }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'events', label: 'Events' },
    { id: 'contact', label: 'Contact' },
  ];
  const go = (id) => { setPage(id); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,246,238,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}` }}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={() => go('home')} className="flex items-center" style={{ background: 'none', border: 'none', padding: 0 }}>
          <Logo />
        </button>

        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <button key={l.id} onClick={() => go(l.id)}
              style={{
                background: 'none', border: 'none', padding: '4px 0',
                color: page === l.id ? C.navy : C.charcoalSoft,
                fontWeight: page === l.id ? 600 : 500,
                fontSize: 14,
                borderBottom: page === l.id ? `2px solid ${C.amber}` : '2px solid transparent',
              }}>
              {l.label}
            </button>
          ))}
          <button onClick={() => go('contact')}
            style={{ background: C.amber, color: C.navy, padding: '10px 20px', borderRadius: 999, border: 'none', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            Book a call <ArrowRight size={14} />
          </button>
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', color: C.navy }}>
          {mobileOpen ? <X size={24}/> : <Menu size={24}/>}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden px-6 pb-6" style={{ borderTop: `1px solid ${C.border}` }}>
          {links.map(l => (
            <button key={l.id} onClick={() => go(l.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 0', color: page === l.id ? C.navy : C.charcoalSoft, fontWeight: page === l.id ? 600 : 500, borderBottom: `1px solid ${C.border}` }}>
              {l.label}
            </button>
          ))}
          <button onClick={() => go('contact')}
            style={{ marginTop: 16, width: '100%', background: C.amber, color: C.navy, padding: '12px', borderRadius: 999, border: 'none', fontWeight: 600 }}>
            Book a call →
          </button>
        </div>
      )}
    </nav>
  );
}

// ============================================================
// HOME
// ============================================================
function HomePage({ setPage }) {
  return (
    <>
      <section style={{ background: C.navy, position: 'relative', overflow: 'hidden', minHeight: '92vh', display: 'flex', alignItems: 'center' }}>
        <div className="hl-glow" style={{ position: 'absolute', bottom: '-20%', left: '50%', transform: 'translateX(-50%)', width: '140%', height: '70%', background: `radial-gradient(ellipse at 50% 100%, ${C.amber}66 0%, ${C.coral}22 30%, transparent 65%)` }} />
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '60%', opacity: 0.3 }}>
          {[...Array(40)].map((_,i) => (
            <circle key={i} cx={`${(i*37+13)%100}%`} cy={`${(i*53+7)%80}%`} r={i % 7 === 0 ? 1.5 : 0.8} fill={C.cream} />
          ))}
        </svg>

        <div className="relative max-w-7xl mx-auto px-6 py-24 w-full">
          <div className="hl-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="hl-eyebrow" style={{ color: C.amber, marginBottom: 24 }}>Independent · Alberta-Based · Family-First</div>
          </div>
          <h1 className="hl-display hl-fade-up" style={{ color: C.cream, fontSize: 'clamp(40px, 6.5vw, 84px)', fontWeight: 700, lineHeight: 1.05, maxWidth: '14ch', animationDelay: '0.15s' }}>
            Financial planning for the families big banks{' '}
            <span style={{ color: C.amber, fontStyle: 'italic', fontWeight: 600 }}>overlook</span>.
          </h1>
          <p className="hl-fade-up" style={{ color: 'rgba(250,246,238,0.78)', fontSize: 'clamp(16px, 1.6vw, 20px)', maxWidth: '52ch', marginTop: 28, lineHeight: 1.55, animationDelay: '0.3s' }}>
            Built for the middle. Honest about the math. Clear about what we do — and what we don't. We help Alberta families protect income, retire with confidence, and leave a legacy worth leaving.
          </p>
          <div className="hl-fade-up flex flex-wrap gap-4 mt-10" style={{ animationDelay: '0.45s' }}>
            <button onClick={() => setPage('contact')} className="hl-lift"
              style={{ background: C.amber, color: C.navy, padding: '16px 28px', borderRadius: 999, border: 'none', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
              Book a 30-min intro call <ArrowRight size={16}/>
            </button>
            <button onClick={() => setPage('services')}
              style={{ background: 'transparent', color: C.cream, padding: '16px 28px', borderRadius: 999, border: `1.5px solid rgba(250,246,238,0.4)`, fontWeight: 500, fontSize: 15 }}>
              See how we work
            </button>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.amber}88, transparent)` }}/>
      </section>

      <section style={{ background: C.cream, padding: '120px 0' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="hl-line max-w-2xl mb-20">
            <div className="hl-eyebrow" style={{ color: C.charcoalSoft, marginBottom: 12 }}>What we focus on</div>
            <h2 className="hl-display" style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, color: C.navy, lineHeight: 1.1 }}>
              Three priorities. Built around your family — not a sales script.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Income Protection', body: "Life, disability, and critical illness coverage that actually fits how your family lives. The basics done well, without upselling what you don't need.", accent: C.amber },
              { num: '02', title: 'Retirement Income', body: 'A plan for converting RRSPs and savings into reliable income — without outliving the money or leaving a tax mess for your kids.', accent: C.coral },
              { num: '03', title: 'Generational Wealth', body: 'Estate-aware strategies for middle-income families who want their money to land softly with the next generation, not the CRA.', accent: C.plum },
            ].map((p) => (
              <div key={p.num} className="hl-lift" style={{ background: C.white, padding: '40px 32px', borderRadius: 4, border: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: p.accent }}/>
                <div className="hl-display" style={{ fontSize: 56, color: p.accent, fontWeight: 800, lineHeight: 1, opacity: 0.4 }}>{p.num}</div>
                <h3 className="hl-display" style={{ fontSize: 26, fontWeight: 700, color: C.navy, marginTop: 16, marginBottom: 12 }}>{p.title}</h3>
                <p style={{ color: C.charcoalSoft, lineHeight: 1.6, fontSize: 15 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: C.navy, padding: '120px 0', color: C.cream }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="hl-line">
                <div className="hl-eyebrow" style={{ color: C.amber, marginBottom: 12 }}>The team</div>
                <h2 className="hl-display" style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, lineHeight: 1.1, color: C.cream }}>
                  Three women. Three former careers. One reason for being here.
                </h2>
              </div>
              <p style={{ color: 'rgba(250,246,238,0.75)', fontSize: 17, lineHeight: 1.65, marginTop: 28, maxWidth: '46ch' }}>
                Denise, Catherine, and Tracy each came to financial planning the long way — through pharmacy, healthcare, and 30 years of equestrian coaching. They know what it's like to figure out money the hard way. That's exactly why they built Horizon Launch.
              </p>
              <button onClick={() => setPage('about')} className="hl-lift"
                style={{ marginTop: 32, background: 'transparent', color: C.cream, padding: '14px 24px', borderRadius: 999, border: `1.5px solid ${C.amber}`, fontWeight: 500, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Meet the team <ArrowRight size={14}/>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { initials: 'DE', accent: C.amber },
                { initials: 'CS', accent: C.coral },
                { initials: 'TC', accent: C.plum },
              ].map(p => (
                <div key={p.initials} style={{ aspectRatio: '3/4', background: p.accent, position: 'relative', overflow: 'hidden' }}>
                  <div className="hl-display" style={{ position: 'absolute', bottom: 16, left: 16, color: C.navy, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{p.initials}</div>
                  <div style={{ position: 'absolute', top: 16, right: 16, color: C.navy, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', opacity: 0.7 }}>PHOTO</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: C.cream, padding: '100px 0' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="hl-display" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700, color: C.navy, lineHeight: 1.15 }}>
            Thirty minutes. No sales pitch. No pressure.
          </h2>
          <p style={{ color: C.charcoalSoft, fontSize: 18, marginTop: 20, lineHeight: 1.6 }}>
            That's our first call. You bring your questions. We bring straight answers. If we're not the right fit, we'll tell you who is.
          </p>
          <button onClick={() => setPage('contact')} className="hl-lift"
            style={{ marginTop: 36, background: C.navy, color: C.cream, padding: '18px 32px', borderRadius: 999, border: 'none', fontWeight: 600, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            Book the conversation <ArrowRight size={16}/>
          </button>
        </div>
      </section>
    </>
  );
}

// ============================================================
// ABOUT
// ============================================================
function AboutPage() {
  const founders = [
    { initials: 'DE', name: 'Denise Edinger', role: 'Co-Founder', accent: C.amber,
      bio: "Pharmacist for 23 years. Became a client of this firm almost 20 years ago and realized she did not understand how money worked — and her family's income was nowhere near protected. Pivoted in 2014 while raising kids, running a horse farm, and supporting her husband's career. Now mentors families and other advisors with the freedom to control her own schedule and income." },
    { initials: 'CS', name: 'Catherine Sakowsky', role: 'Co-Founder', accent: C.coral,
      bio: 'Mom of two, spouse, and serial career builder. Twenty years in healthcare. Ten years running a trades business with her husband. Found her actual calling helping families take control of their money — starting with reducing debt and showing them how to make every dollar work. Holistic, no-jargon approach.' },
    { initials: 'TC', name: 'Tracy Comte', role: 'Co-Founder', accent: C.plum,
      bio: 'Thirty-plus years as an equestrian coach training riders and horses to compete at the highest level. The same dedication, strategy, and patience now goes into financial coaching. Believes the principles that build a championship rider — preparation, discipline, long view — are the same ones that build a financial future.' },
  ];

  return (
    <>
      <section style={{ background: C.navy, padding: '100px 0 80px', color: C.cream, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, right: '-10%', width: '60%', height: '100%', background: `radial-gradient(circle at 80% 80%, ${C.amber}33 0%, transparent 60%)` }}/>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="hl-eyebrow" style={{ color: C.amber, marginBottom: 20 }}>About Horizon Launch</div>
          <h1 className="hl-display" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', fontWeight: 700, lineHeight: 1.05, maxWidth: '18ch' }}>
            Three career pivots, one shared belief about money.
          </h1>
        </div>
      </section>

      <section style={{ background: C.cream, padding: '100px 0' }}>
        <div className="max-w-5xl mx-auto px-6">
          {founders.map((f, i) => (
            <div key={f.initials} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 280px) 1fr', gap: 48, alignItems: 'start', padding: '64px 0', borderBottom: i < founders.length-1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ aspectRatio: '4/5', background: f.accent, position: 'relative', overflow: 'hidden', maxWidth: 280 }}>
                <div className="hl-display" style={{ position: 'absolute', bottom: 24, left: 24, color: C.navy, fontSize: 64, fontWeight: 800, lineHeight: 1 }}>{f.initials}</div>
                <div style={{ position: 'absolute', top: 16, right: 16, color: C.navy, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', opacity: 0.6 }}>PHOTO</div>
              </div>
              <div>
                <div className="hl-eyebrow" style={{ color: C.charcoalSoft, marginBottom: 8 }}>{f.role}</div>
                <h2 className="hl-display" style={{ fontSize: 38, fontWeight: 700, color: C.navy, marginBottom: 20 }}>{f.name}</h2>
                <p style={{ color: C.charcoalSoft, lineHeight: 1.7, fontSize: 16 }}>{f.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: C.navy, color: C.cream, padding: '100px 0' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="hl-eyebrow" style={{ color: C.amber, marginBottom: 20 }}>Our philosophy</div>
          <h2 className="hl-display" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 600, lineHeight: 1.25 }}>
            "Save 10% of every paycheque. Compound it. Protect it. Pass it on. The math hasn't changed in 100 years — only the products around it have."
          </h2>
        </div>
      </section>
    </>
  );
}

// ============================================================
// SERVICES
// ============================================================
function ServicesPage({ setPage }) {
  const plans = [
    { name: 'Cosmic Cadet', tagline: "Children's Plan", headline: 'Set their future in motion.',
      body: 'Build a financial foundation that grows with them — for education, milestones, and lifelong security.',
      includes: ['RESPs with government-backed grant matching', 'Child wealth plans (life + critical illness)', 'Million Dollar Baby Strategy', 'RDSPs for children with disabilities'],
      accent: C.amber },
    { name: 'Galaxy Guardian', tagline: 'Family Plan', headline: 'Protect what matters most.',
      body: 'Build wealth, reduce taxes, and create protection that lasts through every season of life.',
      includes: ['TFSA, FHSA, RRSP, RDSP investing', "Build your own pension when an employer doesn't", 'Insurance that builds wealth', 'Tax-efficient planning'],
      accent: C.coral },
    { name: 'Lunar Legacy', tagline: 'Retirement Plan', headline: 'Leave a lasting mark.',
      body: 'Design a tax-efficient drawdown strategy that sustains your lifestyle and creates a meaningful legacy.',
      includes: ['Bucket strategy for sustainable withdrawals', 'RRSP & RRIF transition planning', 'LIRA access strategies', 'Estate planning + segregated funds'],
      accent: C.plum },
  ];

  return (
    <>
      <section style={{ background: C.navy, color: C.cream, padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '60%', background: `radial-gradient(ellipse at center bottom, ${C.amber}33 0%, transparent 60%)` }}/>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="hl-eyebrow" style={{ color: C.amber, marginBottom: 20 }}>Services</div>
          <h1 className="hl-display" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', fontWeight: 700, lineHeight: 1.05, maxWidth: '20ch' }}>
            Three plans. One for every stage of the journey.
          </h1>
          <p style={{ color: 'rgba(250,246,238,0.75)', fontSize: 18, lineHeight: 1.6, marginTop: 24, maxWidth: '60ch' }}>
            Cosmic naming aside — these are the actual decisions every Alberta family faces. We pick the version of each that fits where you are right now.
          </p>
        </div>
      </section>

      <section style={{ background: C.cream, padding: '100px 0' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div key={p.name} className="hl-lift" style={{ background: C.white, padding: '40px 32px', borderRadius: 4, border: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: p.accent }}/>
                <div className="hl-eyebrow" style={{ color: p.accent, marginBottom: 8 }}>{p.tagline}</div>
                <h3 className="hl-display" style={{ fontSize: 32, fontWeight: 700, color: C.navy, marginBottom: 12 }}>{p.name}</h3>
                <p className="hl-display" style={{ fontSize: 18, color: C.charcoal, fontStyle: 'italic', marginBottom: 16 }}>{p.headline}</p>
                <p style={{ color: C.charcoalSoft, lineHeight: 1.6, fontSize: 15, marginBottom: 24 }}>{p.body}</p>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 'auto' }}>
                  <div className="hl-eyebrow" style={{ color: C.charcoalSoft, marginBottom: 12 }}>Includes</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {p.includes.map((item) => (
                      <li key={item} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 14, color: C.charcoal }}>
                        <Check size={16} color={p.accent} style={{ flexShrink: 0, marginTop: 2 }}/>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 80 }}>
            <button onClick={() => setPage('contact')} className="hl-lift"
              style={{ background: C.navy, color: C.cream, padding: '18px 32px', borderRadius: 999, border: 'none', fontWeight: 600, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              Find the right fit <ArrowRight size={16}/>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

// ============================================================
// EVENTS
// ============================================================
function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listEvents()
      .then(setEvents)
      .catch(() => setError('Could not load events.'))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = events.filter(e => !isPastEvent(e.date)).sort((a,b) => a.date.localeCompare(b.date));
  const past = events.filter(e => isPastEvent(e.date)).sort((a,b) => b.date.localeCompare(a.date));

  return (
    <>
      <section style={{ background: C.navy, color: C.cream, padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', background: `radial-gradient(circle at 100% 0%, ${C.coral}33 0%, transparent 60%)` }}/>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="hl-eyebrow" style={{ color: C.amber, marginBottom: 20 }}>Events</div>
          <h1 className="hl-display" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', fontWeight: 700, lineHeight: 1.05, maxWidth: '20ch' }}>
            Free financial education across Alberta — and online.
          </h1>
          <p style={{ color: 'rgba(250,246,238,0.75)', fontSize: 18, lineHeight: 1.6, marginTop: 24, maxWidth: '56ch' }}>
            No sales pitch. Just clear, practical answers to the questions middle-income families actually have.
          </p>
        </div>
      </section>

      <section style={{ background: C.cream, padding: '80px 0 60px' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="hl-line">
            <div className="hl-eyebrow" style={{ color: C.charcoalSoft, marginBottom: 8 }}>Upcoming</div>
            <h2 className="hl-display" style={{ fontSize: 32, fontWeight: 700, color: C.navy }}>
              {upcoming.length} session{upcoming.length === 1 ? '' : 's'} on the calendar
            </h2>
          </div>

          {loading && <div style={{ padding: 40, textAlign: 'center', color: C.charcoalSoft }}>Loading events…</div>}
          {error && <div style={{ padding: 16, background: '#fee', color: '#900', marginTop: 24, borderRadius: 4 }}>{error}</div>}

          {!loading && upcoming.length === 0 && !error && (
            <div style={{ padding: 60, textAlign: 'center', background: C.white, marginTop: 32, border: `1px solid ${C.border}` }}>
              <Calendar size={32} color={C.charcoalSoft} style={{ marginBottom: 16 }}/>
              <p style={{ color: C.charcoalSoft }}>Nothing scheduled right now. Check back soon — or follow us on social for the next announcement.</p>
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            {upcoming.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </div>
      </section>

      {past.length > 0 && (
        <section style={{ background: C.creamMuted, padding: '60px 0 100px' }}>
          <div className="max-w-5xl mx-auto px-6">
            <div className="hl-eyebrow" style={{ color: C.charcoalSoft, marginBottom: 16 }}>Past sessions</div>
            <div>
              {past.map(e => <EventCard key={e.id} event={e} isPast />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function EventCard({ event, isPast }) {
  const formatBadge = event.format === 'online'
    ? { label: 'Online', icon: <Globe size={12}/>, bg: C.amber, color: C.navy }
    : { label: 'In-Person', icon: <MapPin size={12}/>, bg: C.coral, color: C.cream };

  return (
    <div className="hl-lift" style={{ background: C.white, border: `1px solid ${C.border}`, marginBottom: 16, padding: 0, display: 'grid', gridTemplateColumns: '120px 1fr auto', alignItems: 'stretch', opacity: isPast ? 0.65 : 1 }}>
      <div style={{ background: isPast ? C.charcoalSoft : C.navy, color: C.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 12px' }}>
        <div className="hl-eyebrow" style={{ color: C.amber, fontSize: 11 }}>{monthAbbrev(event.date)}</div>
        <div className="hl-display" style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, marginTop: 4 }}>{dayNum(event.date)}</div>
        <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>{new Date(event.date+'T00:00:00').getFullYear()}</div>
      </div>

      <div style={{ padding: '24px 28px', minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ background: formatBadge.bg, color: formatBadge.color, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {formatBadge.icon} {formatBadge.label}
          </span>
          {isPast && (
            <span style={{ background: C.charcoalSoft, color: C.cream, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>Past event</span>
          )}
        </div>
        <h3 className="hl-display" style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 10, lineHeight: 1.25 }}>{event.title}</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: C.charcoalSoft, marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={13}/> {event.time}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={13}/> {event.location}</span>
        </div>
        <p style={{ color: C.charcoalSoft, fontSize: 14, lineHeight: 1.55, margin: 0 }}>{event.description}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '0 28px' }}>
        {!isPast && event.registration_url ? (
          <a href={event.registration_url} target="_blank" rel="noopener noreferrer"
            style={{ background: C.amber, color: C.navy, padding: '12px 20px', borderRadius: 999, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Register <ExternalLink size={13}/>
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================
// CONTACT
// ============================================================
function ContactPage() {
  const [state, setState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '', _honey: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (form._honey) return;
    setState('submitting');
    try {
      await api.submitContact(form);
      setState('submitted');
    } catch (err) {
      setErrorMsg(String(err.message || err));
      setState('error');
    }
  };

  return (
    <>
      <section style={{ background: C.navy, color: C.cream, padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '60%', height: '80%', background: `radial-gradient(circle at 0% 100%, ${C.amber}44 0%, transparent 60%)` }}/>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="hl-eyebrow" style={{ color: C.amber, marginBottom: 20 }}>Get in touch</div>
          <h1 className="hl-display" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', fontWeight: 700, lineHeight: 1.05, maxWidth: '18ch' }}>
            Thirty minutes. No pressure. No pitch.
          </h1>
        </div>
      </section>

      <section style={{ background: C.cream, padding: '80px 0' }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="hl-display" style={{ fontSize: 32, fontWeight: 700, color: C.navy, marginBottom: 24 }}>Send a message</h2>
            {state === 'submitted' ? (
              <div style={{ background: C.amber + '22', border: `1px solid ${C.amber}`, padding: 24, borderRadius: 4 }}>
                <Check size={24} color={C.navy}/>
                <h3 className="hl-display" style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginTop: 12 }}>Message received.</h3>
                <p style={{ color: C.charcoalSoft, marginTop: 8 }}>One of us will be in touch within one business day.</p>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                <Field label="Your name" value={form.name} onChange={v => setForm({...form, name: v})} required />
                <Field label="Email" type="email" value={form.email} onChange={v => setForm({...form, email: v})} required />
                <div>
                  <label className="hl-eyebrow" style={{ display: 'block', marginBottom: 6, color: C.charcoalSoft }}>What can we help with?</label>
                  <select value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} style={inputStyle}>
                    <option value="general">General question</option>
                    <option value="insurance">Insurance review</option>
                    <option value="retirement">Retirement planning</option>
                    <option value="estate">Estate / generational wealth</option>
                    <option value="event">Event question</option>
                  </select>
                </div>
                <Field label="Message" value={form.message} onChange={v => setForm({...form, message: v})} multiline />
                <input type="text" name="company_website" tabIndex={-1} autoComplete="off"
                  value={form._honey} onChange={e => setForm({...form, _honey: e.target.value})}
                  style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
                  aria-hidden="true" />
                {state === 'error' && (
                  <div style={{ display: 'flex', gap: 8, color: C.coral, fontSize: 13 }}>
                    <AlertCircle size={16}/> Could not send: {errorMsg}. Please try again, or email us directly.
                  </div>
                )}
                <button type="submit" disabled={state === 'submitting'}
                  style={{ background: C.navy, color: C.cream, border: 'none', padding: '14px 24px', borderRadius: 999, fontWeight: 600, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start', marginTop: 8, opacity: state === 'submitting' ? 0.6 : 1 }}>
                  {state === 'submitting' ? 'Sending…' : <>Send message <ArrowRight size={16}/></>}
                </button>
              </form>
            )}
          </div>

          <div>
            <h2 className="hl-display" style={{ fontSize: 32, fontWeight: 700, color: C.navy, marginBottom: 24 }}>Or book directly</h2>
            <div style={{ background: C.white, padding: 32, border: `1px solid ${C.border}`, borderRadius: 4 }}>
              <Calendar size={28} color={C.amber} style={{ marginBottom: 16 }}/>
              <h3 className="hl-display" style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 12 }}>30-minute intro call</h3>
              <p style={{ color: C.charcoalSoft, fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
                Pick a time that works for you. We'll listen first, then tell you whether we can actually help.
              </p>
              <a href="https://calendly.com/" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: C.amber, color: C.navy, padding: '14px 24px', borderRadius: 999, fontWeight: 600, fontSize: 14 }}>
                Open booking calendar <ExternalLink size={14}/>
              </a>
            </div>

            <div style={{ marginTop: 40 }}>
              <h3 className="hl-display" style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Office</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <MapPin size={16} color={C.amber} style={{ marginTop: 4, flexShrink: 0 }}/>
                <div style={{ color: C.charcoalSoft, fontSize: 14, lineHeight: 1.5 }}>
                  #201 - 646 Parsons Rd SW<br/>Edmonton, AB T6X 1N4
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Mail size={16} color={C.amber} style={{ marginTop: 4, flexShrink: 0 }}/>
                <div style={{ color: C.charcoalSoft, fontSize: 14, lineHeight: 1.7 }}>
                  denise.edinger@sbdfinancial.ca<br/>
                  catherine.sakowsky@sbdfinancial.ca<br/>
                  tracy.comte@sbdfinancial.ca
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const inputStyle = {
  width: '100%', padding: '12px 14px',
  border: `1px solid ${C.border}`, borderRadius: 4,
  background: C.white, fontSize: 14, color: C.charcoal,
  fontFamily: F.body,
};

function Field({ label, type='text', value, onChange, multiline, required }) {
  return (
    <div>
      <label className="hl-eyebrow" style={{ display: 'block', marginBottom: 6, color: C.charcoalSoft }}>
        {label}{required && <span style={{ color: C.coral }}> *</span>}
      </label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} required={required} rows={5} style={inputStyle}/>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} style={inputStyle}/>}
    </div>
  );
}

// ============================================================
// LOGIN — used by AdminPage when no session present
// ============================================================
function LoginCard({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await api.login(email.trim(), password);
      onSignedIn(u);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ background: C.navy, minHeight: '90vh', display: 'flex', alignItems: 'center', padding: '40px 0' }}>
      <div className="max-w-md mx-auto px-6 w-full">
        <div style={{ background: C.cream, padding: 40, borderRadius: 4 }}>
          <Lock size={28} color={C.amber}/>
          <h1 className="hl-display" style={{ fontSize: 28, fontWeight: 700, color: C.navy, marginTop: 16, marginBottom: 8 }}>
            Back office
          </h1>
          <p style={{ color: C.charcoalSoft, fontSize: 14, marginBottom: 24 }}>
            Sign in to manage events.
          </p>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field label="Password" type="password" value={password} onChange={setPassword} required />
            {error && (
              <div style={{ display: 'flex', gap: 8, color: C.coral, fontSize: 13 }}>
                <AlertCircle size={16}/> {error}
              </div>
            )}
            <button type="submit" disabled={submitting} style={{
              background: C.navy, color: C.cream, border: 'none',
              padding: '14px', borderRadius: 999, fontWeight: 600, fontSize: 15,
              opacity: submitting ? 0.6 : 1,
            }}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// ADMIN — self-hosted session auth (login form below)
// ============================================================
function AdminPage() {
  const [user, setUser] = useState(undefined); // undefined=loading, null=anon, {email}=logged-in
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    api.whoami().then(u => setUser(u && u.email ? u : null));
  }, []);

  useEffect(() => {
    if (user && user.email) load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.listEvents();
      setEvents(list);
    } catch (e) {
      flash('Failed to load: ' + e.message);
    }
    setLoading(false);
  };

  const flash = (msg) => { setStatusMsg(msg); setTimeout(() => setStatusMsg(''), 2500); };

  const handleSave = async (event) => {
    try {
      if (event.id) await api.updateEvent(event.id, event);
      else await api.createEvent(event);
      flash('Saved.');
      setEditing(null);
      load();
    } catch (e) {
      flash('Save failed: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.deleteEvent(id);
      flash('Deleted.');
      load();
    } catch (e) {
      flash('Delete failed: ' + e.message);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  if (user === undefined) {
    return <section style={{ background: C.cream, minHeight: '90vh', padding: '40px 0', textAlign: 'center', color: C.charcoalSoft }}>Loading…</section>;
  }

  if (user === null) {
    return <LoginCard onSignedIn={(u) => setUser(u)} />;
  }

  return (
    <section style={{ background: C.cream, minHeight: '90vh', padding: '40px 0 80px' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="hl-eyebrow" style={{ color: C.charcoalSoft, marginBottom: 6 }}>Back office</div>
            <h1 className="hl-display" style={{ fontSize: 36, fontWeight: 700, color: C.navy }}>Manage events</h1>
            <p style={{ color: C.charcoalSoft, marginTop: 8, fontSize: 14 }}>
              Changes go live on the public events page immediately.
              {user.email && <> Signed in as <span style={{ color: C.navy, fontWeight: 600 }}>{user.email}</span>.</>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleLogout} style={ghostBtn}><LogOut size={14}/> Sign out</button>
          </div>
        </div>

        {statusMsg && (
          <div style={{ background: C.amber, color: C.navy, padding: '10px 16px', borderRadius: 4, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Check size={16}/> {statusMsg}
          </div>
        )}

        {editing !== 'new' && !events.find(e => e.id === editing) && (
          <button onClick={() => setEditing('new')}
            style={{ background: C.navy, color: C.cream, border: 'none', padding: '14px 22px', borderRadius: 999, fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <Plus size={16}/> Add new event
          </button>
        )}

        {editing && (
          <EventForm event={editing === 'new' ? null : events.find(e => e.id === editing)}
            onSave={handleSave} onCancel={() => setEditing(null)} />
        )}

        {loading ? <div style={{ padding: 40, textAlign: 'center', color: C.charcoalSoft }}>Loading…</div> : (
          <div>
            <h2 className="hl-display" style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginTop: 32, marginBottom: 16 }}>
              All events ({events.length})
            </h2>
            {events.slice().sort((a,b) => b.date.localeCompare(a.date)).map(e => (
              <div key={e.id} style={{ background: C.white, border: `1px solid ${C.border}`, padding: 20, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 250 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: e.format === 'online' ? C.amber : C.coral, color: e.format === 'online' ? C.navy : C.cream, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{e.format === 'online' ? 'Online' : 'In-Person'}</span>
                    {isPastEvent(e.date) && (
                      <span style={{ background: C.charcoalSoft, color: C.cream, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>Past</span>
                    )}
                  </div>
                  <h3 className="hl-display" style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{e.title}</h3>
                  <div style={{ fontSize: 13, color: C.charcoalSoft }}>{formatDate(e.date)} · {e.time} · {e.location}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditing(e.id)} style={iconBtn}><Edit2 size={14}/> Edit</button>
                  <button onClick={() => handleDelete(e.id)} style={{ ...iconBtn, color: C.coral, borderColor: C.coral + '55' }}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const ghostBtn = { background: 'transparent', color: C.navy, padding: '8px 14px', borderRadius: 999, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 };
const iconBtn = { background: 'transparent', color: C.navy, padding: '8px 12px', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 };

function EventForm({ event, onSave, onCancel }) {
  const [form, setForm] = useState(event || { title: '', date: '', time: '', format: 'online', location: '', description: '', registration_url: '' });
  const upd = (k, v) => setForm({ ...form, [k]: v });

  const submit = (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    onSave(form);
  };

  return (
    <div style={{ background: C.white, border: `2px solid ${C.amber}`, padding: 28, borderRadius: 4, marginBottom: 24 }}>
      <h2 className="hl-display" style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 20 }}>
        {event ? 'Edit event' : 'New event'}
      </h2>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <Field label="Title" value={form.title} onChange={v => upd('title', v)} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Date" type="date" value={form.date} onChange={v => upd('date', v)} required />
          <Field label="Time" value={form.time} onChange={v => upd('time', v)} />
        </div>
        <div>
          <label className="hl-eyebrow" style={{ display: 'block', marginBottom: 6, color: C.charcoalSoft }}>Format</label>
          <select value={form.format} onChange={e => upd('format', e.target.value)} style={inputStyle}>
            <option value="online">Online</option>
            <option value="in-person">In-Person</option>
          </select>
        </div>
        <Field label="Location" value={form.location} onChange={v => upd('location', v)} />
        <Field label="Description" value={form.description} onChange={v => upd('description', v)} multiline />
        <Field label="Registration URL" value={form.registration_url} onChange={v => upd('registration_url', v)} />
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" style={{ background: C.navy, color: C.cream, border: 'none', padding: '12px 20px', borderRadius: 999, fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Check size={16}/> Save event
          </button>
          <button type="button" onClick={onCancel} style={ghostBtn}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// FOOTER
// ============================================================
function Footer({ setPage }) {
  return (
    <footer style={{ background: C.navyDeep, color: 'rgba(250,246,238,0.7)', padding: '60px 0 32px', marginTop: 0 }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <Logo light />
            <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 16, color: 'rgba(250,246,238,0.55)' }}>
              Independent financial planning for Alberta families and pre-retirees.
            </p>
          </div>
          <div>
            <div className="hl-eyebrow" style={{ color: C.amber, marginBottom: 12 }}>Site</div>
            {['home','about','services','events','contact'].map(p => (
              <button key={p} onClick={() => { setPage(p); window.scrollTo({top:0}); }}
                style={{ display: 'block', background: 'none', border: 'none', color: 'rgba(250,246,238,0.7)', padding: '4px 0', fontSize: 14, textTransform: 'capitalize', textAlign: 'left' }}>{p}</button>
            ))}
          </div>
          <div>
            <div className="hl-eyebrow" style={{ color: C.amber, marginBottom: 12 }}>Office</div>
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              #201 - 646 Parsons Rd SW<br/>
              Edmonton, AB T6X 1N4
            </div>
          </div>
          <div>
            <div className="hl-eyebrow" style={{ color: C.amber, marginBottom: 12 }}>Back office</div>
            <button onClick={() => { setPage('admin'); window.scrollTo({top:0}); }}
              style={{ background: 'transparent', color: 'rgba(250,246,238,0.7)', border: `1px solid rgba(250,246,238,0.2)`, padding: '8px 14px', borderRadius: 999, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Lock size={12}/> Sign in
            </button>
          </div>
        </div>
        <div style={{ borderTop: `1px solid rgba(250,246,238,0.12)`, paddingTop: 24, fontSize: 12, color: 'rgba(250,246,238,0.45)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>© {new Date().getFullYear()} Horizon Launch Financial Solutions</div>
          <div>Edmonton · Alberta · Canada</div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// MAIN — path-based routing so /admin can be Cloudflare-Access-gated
// ============================================================
const PAGES = ['home','about','services','events','contact','admin'];

function pageFromPath() {
  const p = window.location.pathname.replace(/^\/|\/$/g, '');
  return PAGES.includes(p) ? p : 'home';
}

export default function App() {
  const [page, setPageState] = useState(pageFromPath());

  const setPage = (p) => {
    const path = p === 'home' ? '/' : `/${p}`;
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setPageState(p);
  };

  useEffect(() => {
    const handler = () => setPageState(pageFromPath());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  return (
    <div style={{ background: C.cream, minHeight: '100vh' }}>
      <GlobalStyles />
      <Nav page={page} setPage={setPage} />
      {page === 'home' && <HomePage setPage={setPage} />}
      {page === 'about' && <AboutPage />}
      {page === 'services' && <ServicesPage setPage={setPage} />}
      {page === 'events' && <EventsPage />}
      {page === 'contact' && <ContactPage />}
      {page === 'admin' && <AdminPage />}
      <Footer setPage={setPage} />
    </div>
  );
}
