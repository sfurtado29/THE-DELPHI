// AuthLayout.js — Shared split-screen layout for all Delphi AI auth pages
// Left: branding/storytelling  |  Right: form panel

import { useEffect, useRef } from "react";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --dp-bg:         #ffffff;
    --dp-panel:      #f8fafc;
    --dp-surface:    #ffffff;
    --dp-border:     rgba(15,23,42,0.10);
    --dp-focus:      rgba(59,130,246,0.22);
    --dp-input-bg:   #ffffff;
    --dp-cyan:       #63b3ed;
    --dp-cyan-dim:   rgba(99,179,237,0.10);
    --dp-lime:       #a3e635;
    --dp-lime-dim:   rgba(163,230,53,0.10);
    --dp-text:       #0f172a;
    --dp-muted:      #64748b;
    --dp-dim:        #94a3b8;
    --dp-error:      #fc8181;
    --dp-success:    #68d391;
    --dp-warn:       #f6ad55;
    --f-display:     'Barlow Condensed', sans-serif;
    --f-body:        'Space Grotesk', sans-serif;
  }

  html, body, #root { min-height: 100%; }

  /* ── Root layout ─────────────────────────── */
  .dp-root {
    display: flex;
    min-height: 100vh;
    background: var(--dp-bg);
    font-family: var(--f-body);
    color: var(--dp-text);
  }

  /* ── LEFT brand panel ────────────────────── */
  .dp-brand {
    position: sticky;
    top: 0;
    height: 100vh;
    flex: 0 0 42%;
    background: var(--dp-panel);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 52px 48px;
  }

  .dp-brand-noise {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 55% at 15% 25%, rgba(59,130,246,0.08) 0%, transparent 65%),
      radial-gradient(ellipse 60% 60% at 85% 85%, rgba(163,230,53,0.05) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at 50% 0%,  rgba(59,130,246,0.05) 0%, transparent 60%);
    pointer-events: none;
  }
  .dp-brand-lines {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(15,23,42,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15,23,42,0.03) 1px, transparent 1px);
    background-size: 52px 52px;
    pointer-events: none;
  }
  /* Diagonal accent stripe */
  .dp-brand-stripe {
    position: absolute;
    top: -80px; right: -60px;
    width: 3px; height: 130%;
    background: linear-gradient(180deg, transparent, rgba(59,130,246,0.18) 40%, rgba(163,230,53,0.12) 70%, transparent);
    transform: rotate(12deg);
    pointer-events: none;
  }

  .dp-brand-inner { position: relative; z-index: 1; }

  /* Logo */
  .dp-logo {
    font-family: var(--f-display);
    font-size: 30px;
    font-weight: 900;
    letter-spacing: 0.12em;
    color: var(--dp-text);
    margin-bottom: 64px;
    display: flex;
    align-items: center;
    gap: 0;
  }
  .dp-logo-delphi { color: var(--dp-text); }
  .dp-logo-dot {
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--dp-lime);
    margin: 0 3px 10px;
    box-shadow: 0 0 10px var(--dp-lime);
  }

  /* Tagline chip */
  .dp-tagline-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    border: 1px solid rgba(163,230,53,0.3);
    border-radius: 4px;
    background: var(--dp-lime-dim);
    font-family: var(--f-body);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--dp-lime);
    margin-bottom: 22px;
  }
  .dp-tagline-chip::before {
    content: '';
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--dp-lime);
    animation: dp-blink 1.8s ease-in-out infinite;
  }
  @keyframes dp-blink {
    0%,100% { opacity:1; } 50% { opacity:0.25; }
  }

  .dp-headline {
    font-family: var(--f-display);
    font-size: clamp(32px, 3.2vw, 50px);
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -0.01em;
    color: var(--dp-text);
    margin-bottom: 18px;
  }
  .dp-headline em {
    font-style: normal;
    color: var(--dp-cyan);
  }

  .dp-desc {
    font-size: 14.5px;
    font-weight: 300;
    line-height: 1.75;
    color: var(--dp-muted);
    max-width: 340px;
    margin-bottom: 44px;
  }

  /* Feature list */
  .dp-features { display: flex; flex-direction: column; gap: 16px; }
  .dp-feat {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }
  .dp-feat-line {
    flex-shrink: 0;
    width: 2px;
    height: 36px;
    background: linear-gradient(180deg, var(--dp-cyan), transparent);
    margin-top: 2px;
    border-radius: 1px;
  }
  .dp-feat-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text);
    margin-bottom: 2px;
  }
  .dp-feat-body {
    font-size: 12.5px;
    font-weight: 300;
    color: var(--dp-muted);
    line-height: 1.5;
  }

  /* Bottom meta bar */
  .dp-brand-meta {
    position: relative; z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dp-brand-pill {
    font-size: 11px;
    font-weight: 500;
    color: var(--dp-muted);
    letter-spacing: 0.05em;
  }
  .dp-brand-version {
    font-family: var(--f-display);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--dp-dim);
  }

  /* ── RIGHT form panel ────────────────────── */
  .dp-form-panel {
    flex: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    overflow-y: auto;
    padding: 52px 40px;
  }
  .dp-form-inner {
    width: 100%;
    max-width: 440px;
  }

  /* ── Form controls ──────────────────────── */
  .dp-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--dp-muted);
    margin-bottom: 7px;
  }
  .dp-input {
    display: block;
    width: 100%;
    background: var(--dp-input-bg);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 11px 14px;
    font-family: var(--f-body);
    font-size: 14.5px;
    font-weight: 400;
    color: var(--dp-text);
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    -webkit-appearance: none;
    appearance: none;
  }
  .dp-input::placeholder { color: var(--dp-dim); font-weight: 300; }
  .dp-input:focus {
    border-color: rgba(59,130,246,0.55);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.10);
  }
  .dp-input.err { border-color: rgba(252,129,129,0.5); }
  .dp-input.has-eye { padding-right: 44px; }

  /* password eye wrapper */
  .dp-pass-wrap { position: relative; }
  .dp-pass-wrap .dp-input { padding-right: 44px; }
  .dp-eye-btn {
    position: absolute;
    right: 12px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none;
    cursor: pointer; padding: 4px;
    color: var(--dp-muted);
    font-size: 14px;
    transition: color 0.15s;
    display: flex; align-items: center;
  }
  .dp-eye-btn:hover { color: var(--dp-text); }

  /* select arrow override */
  select.dp-input {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 38px;
    cursor: pointer;
  }
  select.dp-input option { background: #ffffff; color: #0f172a; }

  .dp-field-error {
    font-size: 11.5px;
    color: var(--dp-error);
    margin-top: 4px;
    font-weight: 500;
  }

  /* ── Buttons ────────────────────────────── */
  .dp-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px 20px;
    border: none;
    border-radius: 8px;
    font-family: var(--f-body);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s;
    letter-spacing: 0.02em;
    position: relative;
    overflow: hidden;
  }
  .dp-btn-primary {
    background: var(--dp-cyan);
    color: #0f172a;
  }
  .dp-btn-primary:hover:not(:disabled) {
    background: #90cdf4;
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(99,179,237,0.35);
  }
  .dp-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  .dp-btn-outline {
    background: transparent;
    border: 1px solid var(--dp-border);
    color: var(--dp-muted);
    font-size: 13px;
    padding: 10px 16px;
  }
  .dp-btn-outline:hover:not(:disabled) {
    border-color: rgba(59,130,246,0.4);
    color: var(--dp-text);
  }

  /* ── Alerts ─────────────────────────────── */
  .dp-alert {
    padding: 11px 14px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 400;
    margin-bottom: 18px;
    line-height: 1.5;
  }
  .dp-alert-error {
    background: rgba(252,129,129,0.08);
    border: 1px solid rgba(252,129,129,0.22);
    color: var(--dp-error);
  }
  .dp-alert-success {
    background: rgba(104,211,145,0.08);
    border: 1px solid rgba(104,211,145,0.22);
    color: var(--dp-success);
  }
  .dp-alert-warn {
    background: rgba(246,173,85,0.08);
    border: 1px solid rgba(246,173,85,0.22);
    color: var(--dp-warn);
  }

  /* ── Form heading ───────────────────────── */
  .dp-form-head { margin-bottom: 28px; }
  .dp-form-head h2 {
    font-family: var(--f-display);
    font-size: 30px;
    font-weight: 900;
    letter-spacing: 0.02em;
    color: var(--dp-text);
    margin-bottom: 5px;
  }
  .dp-form-head p {
    font-size: 14px;
    font-weight: 300;
    color: var(--dp-muted);
    line-height: 1.6;
  }

  /* ── Misc helpers ───────────────────────── */
  .dp-link {
    background: none; border: none; cursor: pointer;
    font-family: var(--f-body);
    font-size: 13.5px; font-weight: 500;
    color: var(--dp-cyan);
    padding: 0; text-decoration: none;
    transition: opacity 0.15s;
  }
  .dp-link:hover { opacity: 0.7; }

  .dp-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 22px 0;
    font-size: 12px; color: var(--dp-dim);
  }
  .dp-divider::before, .dp-divider::after {
    content: ''; flex: 1; height: 1px;
    background: var(--dp-border);
  }

  /* Spinner */
  .dp-spin {
    width: 16px; height: 16px;
    border: 2px solid rgba(15,23,42,0.18);
    border-top-color: #0f172a;
    border-radius: 50%;
    animation: dp-rotate 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes dp-rotate { to { transform: rotate(360deg); } }

  /* OTP grid */
  .dp-otp-row {
    display: flex; gap: 10px;
    justify-content: center;
    margin: 24px 0;
  }
  .dp-otp-cell {
    width: 54px; height: 62px;
    background: var(--dp-input-bg);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    text-align: center;
    font-family: var(--f-display);
    font-size: 24px; font-weight: 900;
    color: var(--dp-text);
    outline: none;
    caret-color: var(--dp-cyan);
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .dp-otp-cell:focus {
    border-color: rgba(59,130,246,0.55);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.10);
  }

  /* Step dots */
  .dp-step-dots {
    display: flex; gap: 6px;
    justify-content: center;
    margin-bottom: 30px;
  }
  .dp-dot {
    height: 3px; border-radius: 2px;
    transition: all 0.3s;
  }
  .dp-dot-active  { width: 32px; background: var(--dp-cyan); }
  .dp-dot-done    { width: 16px; background: rgba(99,179,237,0.45); }
  .dp-dot-pending { width: 16px; background: var(--dp-dim); }

  /* Step circles for enrichment */
  .dp-steps {
    display: flex; align-items: center;
    justify-content: center;
    gap: 0; margin-bottom: 32px;
  }
  .dp-step-node {
    width: 34px; height: 34px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--f-display);
    font-size: 13px; font-weight: 800;
    transition: all 0.25s;
  }
  .dp-step-node.active  { background: var(--dp-cyan);  color: #0f172a; box-shadow: 0 0 16px rgba(99,179,237,0.3); }
  .dp-step-node.done    { background: rgba(99,179,237,0.2); color: var(--dp-cyan); border: 1px solid rgba(99,179,237,0.4); }
  .dp-step-node.pending { background: var(--dp-surface); color: var(--dp-muted); border: 1px solid var(--dp-border); }
  .dp-step-bar {
    width: 48px; height: 2px;
    transition: background 0.25s;
  }
  .dp-step-bar.done    { background: rgba(99,179,237,0.35); }
  .dp-step-bar.pending { background: var(--dp-border); }

  /* Tag area */
  .dp-tag-area {
    display: flex; flex-wrap: wrap; gap: 8px;
    padding: 12px 14px;
    background: var(--dp-input-bg);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    min-height: 52px; max-height: 180px;
    overflow-y: auto;
    margin-bottom: 10px;
  }
  .dp-tag {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 100px;
    background: var(--dp-cyan-dim);
    border: 1px solid rgba(99,179,237,0.25);
    color: var(--dp-cyan);
    font-size: 12.5px; font-weight: 500;
  }
  .dp-tag-x {
    background: none; border: none; cursor: pointer;
    color: var(--dp-cyan); padding: 0;
    display: flex; align-items: center;
    opacity: 0.65; transition: opacity 0.15s;
    font-size: 13px; line-height: 1;
  }
  .dp-tag-x:hover { opacity: 1; }

  /* Enrichment 2-col grid */
  .dp-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .dp-full { grid-column: 1 / -1; }

  /* Responsive */
  @media (max-width: 860px) {
    .dp-brand { display: none; }
    .dp-form-panel { padding: 32px 20px; }
  }
  @media (max-width: 520px) {
    .dp-grid-2 { grid-template-columns: 1fr; }
    .dp-full   { grid-column: 1; }
  }
`;

const PAGE_META = {
  login: {
    chip: "Intelligence Platform",
    headline: <>Turn market signals into<br /><em>closed deals</em></>,
    desc: "Delphi AI gives your sales team real-time competitor intelligence, auto-enriched lead profiles, and buying-signal alerts — all in one place.",
    feats: [
      { t: "Smart Lead Scoring",     b: "AI ranks prospects by conversion likelihood in real time." },
      { t: "Buying Signal Alerts",   b: "Catch intent signals before your competitors see them." },
      { t: "Automated Enrichment",   b: "Full company intelligence built in seconds, not hours." },
    ],
    pill: "Trusted by sales teams",
  },
  register: {
    chip: "Get Started Free",
    headline: <>Turn market signals into<br /><em>closed deals</em></>,
    desc: "Delphi AI gives your sales team real-time competitor intelligence, automatically enriched lead profiles, and instant buying signal alerts.",
    feats: [
  { t: "Smart Lead Scoring", b: "Identify high-value leads automatically with AI." },
  { t: "Buying Signal Alerts", b: "Get notified when prospects show buying intent." },
  { t: "Automated Enrichment", b: "Keep contact and company data updated instantly." },
],
  
  },
  otp: {
    chip: "Secure Verification",
    headline: <>One step to<br /><em>unlock access</em></>,
    desc: "Multi-factor email verification keeps your account and all your intelligence data completely safe.",
    feats: [
      { t: "256-bit Encryption",      b: "All data encrypted at rest and in transit." },
      { t: "Time-Limited Codes",      b: "OTP codes expire in 10 minutes for safety." },
      { t: "Instant Delivery",        b: "Codes arrive in your inbox within 30 seconds." },
    ],
    pill: "Bank-grade security",
  },
  forgot: {
    chip: "Account Recovery",
    headline: <>Back on track in<br /><em>under 2 minutes</em></>,
    desc: "We'll send a one-time reset code to your registered email. Your data remains fully intact.",
    feats: [
      { t: "Instant Reset Code",      b: "Delivered to your inbox within seconds." },
      { t: "One-Time Security",       b: "Codes work once and expire in 10 minutes." },
      { t: "Zero Data Loss",          b: "All your settings and history stay untouched." },
    ],
    pill: "Secure reset process",
  },
  enrichment: {
    chip: "Onboarding",
    headline: <>Power up your<br /><em>intelligence engine</em></>,
    desc: "Tell us about your company. Delphi AI uses this to surface the most relevant leads, competitors, and market signals for your exact context.",
    feats: [
      { t: "Personalized Signals",    b: "Every insight tailored to your industry and products." },
      { t: "Website Auto-Detection",  b: "We scan your site to pre-fill brands and products." },
      { t: "Sharper Intelligence",    b: "More context means more relevant market signals." },
    ],
    pill: "Setup in 2 quick steps",
  },
};

export function useAuthStyles() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (!document.getElementById("dp-global-css")) {
      const el = document.createElement("style");
      el.id = "dp-global-css";
      el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
  }, []);
}

export default function AuthLayout({ page = "login", children }) {
  useAuthStyles();
  const meta = PAGE_META[page] || PAGE_META.login;

  return (
    <div className="dp-root">
      {/* ── LEFT ──────────────────────────────────────── */}
      <div className="dp-brand">
        <div className="dp-brand-noise" />
        <div className="dp-brand-lines" />
        <div className="dp-brand-stripe" />

        <div className="dp-brand-inner">
          {/* Logo */}
          <div className="dp-logo">
            <span className="dp-logo-delphi">DELPHI</span>
            <span className="dp-logo-dot" />
          </div>

          <div className="dp-tagline-chip">{meta.chip}</div>

          <h1 className="dp-headline">{meta.headline}</h1>
          <p className="dp-desc">{meta.desc}</p>

          <div className="dp-features">
            {meta.feats.map((f, i) => (
              <div key={i} className="dp-feat">
                <div className="dp-feat-line" />
                <div>
                  <div className="dp-feat-title">{f.t}</div>
                  <div className="dp-feat-body">{f.b}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dp-brand-meta">
          <span className="dp-brand-pill">{meta.pill}</span>

        </div>
      </div>

      {/* ── RIGHT ─────────────────────────────────────── */}
      <div className="dp-form-panel">
        <div className="dp-form-inner">
          {children}
        </div>
      </div>
    </div>
  );
}