
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import "./intellegence.css";

const API_BASE   = "http://127.0.0.1:8000";
const SESSION_ID = `user_${Math.random().toString(36).slice(2, 9)}`;

// ── Field definitions ─────────────────────────────────────────────────────────

const PRODUCT_FIELD_LABELS = {
  product_description:  "Product",
  product_name:         "Product Name",
  product_usps:         "USPs",
  product_pricing_tier: "Positioning",
  campaign_budget:      "Budget",
  ideal_buyer:          "Ideal Buyer",
  target_market_type:   "Market Type",
  buyer_stage:          "Buyer Stage",
};

const PRODUCT_FIELD_ORDER = [
  "product_description", "product_name", "product_usps",
  "product_pricing_tier", "campaign_budget", "ideal_buyer",
  "target_market_type", "buyer_stage",
];

const TARGETING_FIELD_LABELS = {
  geography:     "Geography",
  industry:      "Industry",
  job_function:  "Job Function",
  job_level:     "Seniority",
  employee_size: "Company Size",
  revenue_range: "Revenue Range",
};

const TARGETING_FIELD_ORDER = [
  "geography", "industry", "job_function",
  "job_level", "employee_size", "revenue_range",
];

const SUGGESTION_LABELS = {
  geography:     "Target Geographies",
  industry:      "Industries",
  job_function:  "Job Functions",
  job_level:     "Seniority Levels",
  employee_size: "Company Sizes",
  revenue_range: "Revenue Ranges",
};

const ALL_FIELDS = [...PRODUCT_FIELD_ORDER, ...TARGETING_FIELD_ORDER];


// ── Utility: normalise lead row from Cortex ──────────────────────────────────

function normalizeRow(row) {
  if (row && typeof row === "object") {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      const label = k
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
      out[label] = v ?? "—";
    }
    return out;
  }
  return { Value: String(row) };
}

const PRIORITY_COLS = [
  "Company", "Job Title", "Seniority", "Industry",
  "Job Function", "Employee Size", "Revenue", "Geography",
];

function sortColumns(cols) {
  const priority = PRIORITY_COLS.filter(c => cols.includes(c));
  const rest     = cols.filter(c => !PRIORITY_COLS.includes(c));
  return [...priority, ...rest];
}


// ── Seniority badge ───────────────────────────────────────────────────────────

const SENIORITY_COLORS = {
  // C-Suite — amber warmth
  "c level":        { bg: "rgba(217,119,6,0.10)",  text: "#92400e", border: "rgba(217,119,6,0.30)" },
  "c-level":        { bg: "rgba(217,119,6,0.10)",  text: "#92400e", border: "rgba(217,119,6,0.30)" },
  "chief":          { bg: "rgba(217,119,6,0.10)",  text: "#92400e", border: "rgba(217,119,6,0.30)" },
  "ceo":            { bg: "rgba(217,119,6,0.10)",  text: "#92400e", border: "rgba(217,119,6,0.30)" },
  "cto":            { bg: "rgba(217,119,6,0.10)",  text: "#92400e", border: "rgba(217,119,6,0.30)" },
  "cfo":            { bg: "rgba(217,119,6,0.10)",  text: "#92400e", border: "rgba(217,119,6,0.30)" },
  "coo":            { bg: "rgba(217,119,6,0.10)",  text: "#92400e", border: "rgba(217,119,6,0.30)" },
  // VP — violet
  "vp":             { bg: "rgba(109,40,217,0.08)", text: "#5B21B6", border: "rgba(109,40,217,0.25)" },
  "vice president": { bg: "rgba(109,40,217,0.08)", text: "#5B21B6", border: "rgba(109,40,217,0.25)" },
  // Director — blue
  "director":       { bg: "rgba(37,99,235,0.08)",  text: "#1D4ED8", border: "rgba(37,99,235,0.25)" },
  // Manager — emerald
  "manager":        { bg: "rgba(5,150,105,0.09)",  text: "#065F46", border: "rgba(5,150,105,0.28)" },
  // Senior — teal
  "senior":         { bg: "rgba(6,182,212,0.09)",  text: "#155E75", border: "rgba(6,182,212,0.28)" },
};

function SeniorityBadge({ value }) {
  if (!value) return <span className="lt-cell-dash">—</span>;
  const key   = value.toLowerCase();
  const style = Object.entries(SENIORITY_COLORS)
    .find(([k]) => key.includes(k))?.[1];
  if (!style) return <span className="lt-cell-text">{value}</span>;
  return (
    <span
      className="lt-seniority-badge"
      style={{
        background:  style.bg,
        color:       style.text,
        borderColor: style.border,
      }}
    >
      {value}
    </span>
  );
}


// ── Leads Table ───────────────────────────────────────────────────────────────

function LeadsTable({ rows }) {
  const [page,        setPage]        = useState(0);
  const [sortCol,     setSortCol]     = useState(null);
  const [sortDir,     setSortDir]     = useState("asc");
  const [search,      setSearch]      = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const PAGE_SIZE = 15;

  const normalized = useMemo(
    () => (!rows?.length ? [] : rows.map(normalizeRow).filter(Boolean)),
    [rows],
  );

  const columns = useMemo(() => {
    if (!normalized.length) return [];
    const allKeys = new Set();
    normalized.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
    return sortColumns([...allKeys]);
  }, [normalized]);

  const filtered = useMemo(() => {
    if (!search.trim()) return normalized;
    const q = search.toLowerCase();
    return normalized.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(q))
    );
  }, [normalized, search]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortCol] ?? "");
      const bv = String(b[sortCol] ?? "");
      return sortDir === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageRows   = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(0);
  };

  const pageWindow = () => {
    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  if (!rows?.length) {
    return (
      <div className="lt-empty">
        <p>No matching leads found for this criteria.</p>
      </div>
    );
  }

  return (
    <div className="lt-wrapper">
      <div className="lt-toolbar">
        <div className="lt-count">
          <span className="lt-count-num">{sorted.length}</span>
          <span className="lt-count-label">leads found</span>
        </div>
        <div className="lt-search-wrap">
          <svg className="lt-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            className="lt-search-input"
            placeholder="Filter results..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className="lt-search-clear" onClick={() => setSearch("")}>
              x
            </button>
          )}
        </div>
      </div>

      <div className="lt-scroll">
        <table className="lt-table">
          <thead>
            <tr>
              <th className="lt-th lt-th-num">#</th>
              {columns.map(col => (
                <th
                  key={col}
                  className={`lt-th ${sortCol === col ? "lt-th-sorted" : ""}`}
                  onClick={() => handleSort(col)}
                >
                  <span className="lt-th-inner">
                    {col}
                    <span className="lt-sort-icon">
                      {sortCol === col ? (sortDir === "asc" ? "^" : "v") : "-"}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const absIdx    = page * PAGE_SIZE + i;
              const isExpanded = expandedRow === absIdx;
              return (
                <React.Fragment key={absIdx}>
                  <tr
                    className={`lt-row ${isExpanded ? "lt-row-expanded" : ""}`}
                    onClick={() => setExpandedRow(isExpanded ? null : absIdx)}
                  >
                    <td className="lt-td lt-td-num">{absIdx + 1}</td>
                    {columns.map(col => (
                      <td key={col} className="lt-td">
                        {col === "Seniority"
                          ? <SeniorityBadge value={row[col]} />
                          : col === "Company"
                          ? <span className="lt-cell-company">{row[col] || "—"}</span>
                          : col === "Job Title"
                          ? <span className="lt-cell-jobtitle">{row[col] || "—"}</span>
                          : (
                            <span
                              className={
                                row[col] && row[col] !== "—"
                                  ? "lt-cell-text"
                                  : "lt-cell-dash"
                              }
                            >
                              {row[col] || "—"}
                            </span>
                          )
                        }
                      </td>
                    ))}
                  </tr>
                  {isExpanded && (
                    <tr className="lt-detail-row">
                      <td colSpan={columns.length + 1}>
                        <div className="lt-detail-grid">
                          {columns.map(col =>
                            row[col] && row[col] !== "—" && (
                              <div key={col} className="lt-detail-item">
                                <span className="lt-detail-label">{col}</span>
                                <span className="lt-detail-value">{row[col]}</span>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="lt-pagination">
          <span className="lt-page-info">
            Page {page + 1} of {totalPages} · {sorted.length} results
          </span>
          <div className="lt-page-btns">
            <button className="lt-page-btn" disabled={page === 0} onClick={() => setPage(0)}>
              First
            </button>
            <button className="lt-page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Prev
            </button>
            {pageWindow().map(p => (
              <button
                key={p}
                className={`lt-page-btn ${p === page ? "lt-page-btn-active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p + 1}
              </button>
            ))}
            <button className="lt-page-btn" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
            <button className="lt-page-btn" disabled={page === totalPages - 1} onClick={() => setPage(totalPages - 1)}>
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── ICP Table ─────────────────────────────────────────────────────────────────

function IcpTable({ rows }) {
  if (!rows?.length) return null;
  return (
    <div className="icp-wrapper">
      <div className="icp-header">Ideal Customer Profile</div>
      <table className="icp-table">
        <thead>
          <tr>
            <th className="icp-th">Attribute</th>
            <th className="icp-th">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="icp-row">
              <td className="icp-td icp-label">
                {row.Attribute || Object.keys(row)[0]}
              </td>
              <td className="icp-td icp-value">
                {row.Value || Object.values(row)[1] || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ── Campaign Cards ────────────────────────────────────────────────────────────

// ── Single expandable campaign card ──────────────────────────────────────────
function CampaignCard({ campaign, index, onSelect }) {
  const [expanded, setExpanded] = useState(false);

  const name   = campaign.campaign_name          || "Unnamed Campaign";
  const client = campaign.client_name            || "";
  const qty    = campaign.total_quantity         || "";
  const empSz  = campaign.target_employee_size   || "";
  const revSz  = campaign.target_revenue_size    || "";
  const ioNum  = campaign.insertion_order_number || "";
  const code   = campaign.campaign_code          || "";

  // ICP fields — displayed in the expanded grid
  const icpFields = [
    { label: "Leads Targeted",  value: qty   ? String(qty)   : "" },
    { label: "Company Size",    value: empSz },
    { label: "Revenue Range",   value: revSz },
    { label: "IO Number",       value: ioNum },
    { label: "Campaign Code",   value: code  },
  ].filter(f => f.value);

  const toggle = () => setExpanded(v => !v);

  return (
    <div className={`cc-card ${expanded ? "cc-card--open" : ""}`}>

      {/* ── Header — always visible ──────────────────────────────── */}
      <div
        className="cc-card__header"
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && toggle()}
        aria-expanded={expanded}
        aria-label={`Campaign ${index + 1}: ${name}. Click to ${expanded ? "collapse" : "expand"}.`}
      >
        {/* Numbered badge */}
        <div className="cc-card__index" aria-hidden="true">{index + 1}</div>

        {/* Name + client */}
        <div className="cc-card__title-group">
          <div className="cc-card__name">{name}</div>
          {client && (
            <div className="cc-card__client">{client}</div>
          )}
        </div>

        {/* Compact summary pills */}
        <div className="cc-card__pills">
          {qty && (
            <span className="cc-pill cc-pill--leads">
              {qty} leads
            </span>
          )}
          {empSz && (
            <span className="cc-pill cc-pill--size">{empSz}</span>
          )}
        </div>

        {/* Expand / collapse chevron */}
        <div
          className={`cc-card__chevron ${expanded ? "cc-card__chevron--open" : ""}`}
          aria-hidden="true"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2.5 4.5L6.5 8.5L10.5 4.5"
              stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* ── Expanded body — ICP details + action ────────────────── */}
      {expanded && (
        <div className="cc-card__body">

          {icpFields.length > 0 ? (
            <div className="cc-card__icp">
              <div className="cc-card__icp-label">Campaign Profile</div>
              <div className="cc-card__icp-grid">
                {icpFields.map(f => (
                  <div key={f.label} className="cc-card__icp-item">
                    <span className="cc-card__icp-key">{f.label}</span>
                    <span className="cc-card__icp-val">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="cc-card__icp">
              <p style={{
                fontSize:   "13px",
                color:      "var(--text-4)",
                lineHeight: "1.5",
                margin:     0,
              }}>
                No additional targeting data is available for this campaign.
              </p>
            </div>
          )}

          <div className="cc-card__actions">
            <button
              className="cc-card__action-btn cc-card__action-btn--primary"
              onClick={() =>
                onSelect(`Tell me more about campaign ${index + 1}: ${name}`)
              }
            >
              Explore ICP targeting
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M6 2l4 4-4 4"
                  stroke="currentColor" strokeWidth="1.7"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className="cc-card__action-btn cc-card__action-btn--ghost"
              onClick={toggle}
            >
              Collapse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Campaign cards list ───────────────────────────────────────────────────────
function CampaignCards({ campaigns, onSelect }) {
  if (!campaigns?.length) return null;
  return (
    <div className="campaign-cards">
      {campaigns.map((c, i) => (
        <CampaignCard
          key={i}
          campaign={c}
          index={i}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}


// ── Quick Replies ─────────────────────────────────────────────────────────────

function QuickReplies({ options, onSelect }) {
  if (!options?.length) return null;
  return (
    <div className="quick-replies">
      {options.map(opt => (
        <button
          key={opt}
          className="quick-reply-btn"
          onClick={() => onSelect(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}


// ── Product Selector ──────────────────────────────────────────────────────────

function ProductSelector({ profile, onSelect }) {
  if (!profile || (!profile.brands?.length && !profile.services?.length)) {
    return null;
  }

  const isProductBased = profile.brands?.length > 0;
  const isServiceBased = profile.services?.length > 0;

  return (
    <div className="product-selector">
      <div className="ps-header">
        <div className="ps-company">{profile.company_name}</div>
        <div className="ps-headline">
          Select a product or service to begin your campaign
        </div>
        <div className="ps-sub">
          We will search for past campaigns matching your selection, then help
          you define your target audience.
        </div>
      </div>

      {isProductBased && (
        <div className="ps-section">
          <div className="ps-section-label">Products</div>
          <div className="ps-chips">
            {profile.brands.map(b => (
              <button
                key={b}
                className="ps-chip ps-chip-brand"
                onClick={() => onSelect(b, "brand")}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {isServiceBased && (
        <div className="ps-section">
          <div className="ps-section-label">Services</div>
          <div className="ps-chips">
            {profile.services.map(s => (
              <button
                key={s}
                className="ps-chip ps-chip-service"
                onClick={() => onSelect(s, "service")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Sidebar Panel ─────────────────────────────────────────────────────────────

function SidebarPanel({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sidebar-panel">
      <button
        className="sidebar-panel-header"
        onClick={() => setOpen(v => !v)}
      >
        <span className="sidebar-panel-title">{title}</span>
        <span className={`sidebar-panel-chevron ${open ? "open" : ""}`}>
          {open ? "-" : "+"}
        </span>
      </button>
      {open && <div className="sidebar-panel-body">{children}</div>}
    </div>
  );
}


// ── Context Pill ──────────────────────────────────────────────────────────────

function ContextPill({ label, value }) {
  return (
    <div className="context-pill">
      <span className="pill-label">{label}</span>
      <span className="pill-value" title={value}>{value}</span>
    </div>
  );
}


// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="typing-indicator">
      <span /><span /><span />
    </div>
  );
}


// ── Suggestion Group ──────────────────────────────────────────────────────────

function SuggestionGroup({ field, items, onSelect }) {
  return (
    <div className="suggestion-group">
      <div className="suggestion-group-label">
        {SUGGESTION_LABELS[field] || field}
      </div>
      <div className="suggestion-chips">
        {items.map(item => (
          <button key={item} className="chip" onClick={() => onSelect(item)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}


// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ filled, total }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-label">{pct}%</span>
    </div>
  );
}


// ── Phase Badge ───────────────────────────────────────────────────────────────

function PhaseBadge({ phase }) {
  if (!phase || phase === "complete") return null;
  const config = {
    // campaign_active: { label: "Campaign Search",    color: "var(--amber)",   bg: "var(--amber-soft)" },
    // product:         { label: "Product Context",    color: "var(--violet)",  bg: "var(--violet-soft)" },
    // targeting:       { label: "Audience Targeting", color: "var(--accent)",  bg: "var(--accent-soft)" },
  };
  const cfg = config[phase];
  if (!cfg) return null;
  return (
    <div
      className="phase-badge"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color }}
    >
      <span className="phase-dot" style={{ background: cfg.color }} />
      {cfg.label}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Intelligence() {
  // ── UI State ────────────────────────────────────────────────────────────────
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [suggestions,  setSuggestions]  = useState({});
  const [chatHistory,  setChatHistory]  = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [darkMode,     setDarkMode]     = useState(
    () => localStorage.getItem("delphi-theme") === "dark"
  );

  // ── Campaign pipeline state ──────────────────────────────────────────────────
  const [profile,         setProfile]         = useState(null);
  const [profileLoaded,   setProfileLoaded]   = useState(false);
  const [campaignActive,  setCampaignActive]  = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ── Context pipeline state ───────────────────────────────────────────────────
  const [context, setContext] = useState({});
  const [phase,   setPhase]   = useState("product");

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const sessionRef  = useRef(SESSION_ID);

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("delphi-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
      localStorage.setItem("delphi-theme", "light");
    }
  }, [darkMode]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const userInitials = useMemo(() => {
    const name = user.full_name || user.email || "D";
    return name
      .split(" ")
      .map(w => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const userId = useMemo(() => {
    return user.user_id || user.id || null;
  }, [user]);

  // Fetch company profile on mount
  useEffect(() => {
    if (!userId) { setProfileLoaded(true); return; }
    fetch(`${API_BASE}/campaign/profile`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_id: userId }),
    })
      .then(r => r.json())
      .then(data => { if (data.success) setProfile(data); })
      .catch(err => console.warn("[Profile] fetch failed", err))
      .finally(() => setProfileLoaded(true));
  }, [userId]);

  // ── Message helpers ──────────────────────────────────────────────────────────

  const pushMessage = useCallback(msg => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }, []);

  // ── Campaign pipeline send ───────────────────────────────────────────────────

  const sendCampaignMessage = useCallback(async (text) => {
    if (!text?.trim()) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/campaign/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: sessionRef.current, message: text }),
      });
      const data = await res.json();
      console.log("[Campaign] response", data);

      if (data.response) {
        pushMessage({ role: "bot", text: data.response });
      }

      // Campaign cards list
      if (data.campaigns?.length) {
        pushMessage({ role: "bot", campaignCards: data.campaigns });
      }

      // ICP table
      if (data.icp_table?.length) {
        pushMessage({ role: "bot", icpTable: data.icp_table });
      }

      // Quick replies
      if (data.quick_replies?.length) {
        pushMessage({ role: "bot", quickReplies: data.quick_replies });
      }

      // Suggestions (geo or industry chips)
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }

      // Handle handoff or icp_accepted → context pipeline takes over
      if (
        data.status === "handoff" ||
        data.status === "no_results" ||
        data.status === "icp_accepted"
      ) {
        setCampaignActive(false);
        setPhase("product");

        // Pre-seed context pipeline with geo + industry
        if (data.context && Object.keys(data.context).length > 0) {
          try {
            const prefillRes = await fetch(`${API_BASE}/context/prefill`, {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                session_id: sessionRef.current,
                context:    data.context,
              }),
            });
            const prefillData = await prefillRes.json();
            if (prefillData.context) {
              setContext(prefillData.context);
              // Update phase based on prefilled context
              const filled = Object.keys(prefillData.context).length;
              setPhase(filled > 0 ? "targeting" : "product");
            }
          } catch (err) {
            console.warn("[Prefill] failed", err);
          }
        }

        // If ICP was accepted, the pipeline ends here — no context pipeline
        if (data.status === "icp_accepted") {
          return;
        }
      }
    } catch (err) {
      console.error("[Campaign] error", err);
      pushMessage({
        role: "bot",
        text: "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [pushMessage]);

  // ── Context pipeline send ────────────────────────────────────────────────────

  const sendContextMessage = useCallback(async (text) => {
    if (!text?.trim()) return;
    setLoading(true);
    setSuggestions({});
    try {
      const res  = await fetch(`${API_BASE}/context/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: sessionRef.current, message: text }),
      });
      const data = await res.json();
      console.log("[Context] response", data);

      if (data.response) {
        pushMessage({
          role:        "bot",
          text:        data.response,
          editApplied: data.edit_applied || null,
        });
      }

      if (data.context) {
        setContext(data.context);
      }

      if (data.phase) {
        setPhase(data.phase);
      }

      if (data.suggestions && Object.keys(data.suggestions).length > 0) {
        setSuggestions(data.suggestions);
      }

      if (data.leads?.length) {
        pushMessage({ role: "bot", table: data.leads });
      }

      if (data.summary && data.status === "complete") {
        pushMessage({ role: "bot", text: data.summary });
      }
    } catch (err) {
      console.error("[Context] error", err);
      pushMessage({
        role: "bot",
        text: "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [pushMessage]);

  // ── Product selected ─────────────────────────────────────────────────────────

  const handleProductSelected = useCallback(async (product) => {
    setSelectedProduct(product);
    setCampaignActive(true);
    setSuggestions({});
    pushMessage({ role: "user", text: `Campaign for: ${product}` });
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/campaign/start`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          session_id: sessionRef.current,
          brand:      product,
        }),
      });
      const data = await res.json();
      console.log("[Campaign start] data", data); // add this
    
      if (data.response) {
        pushMessage({ role: "bot", text: data.response });
      }
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
      setPhase("campaign_active");
    } catch (err) {
      console.error("[Campaign start] error", err);
      setCampaignActive(false);
    } finally {
      setLoading(false);
    }
  }, [pushMessage]);

  // ── Unified send ─────────────────────────────────────────────────────────────

  const handleSend = useCallback((text) => {
    const t = (text ?? input).trim();
    if (!t || loading) return;
    pushMessage({ role: "user", text: t });
    if (!text) setInput("");
    setSuggestions({});

    if (campaignActive) {
      sendCampaignMessage(t);
    } else {
      sendContextMessage(t);
    }
  }, [
    campaignActive,
    input,
    loading,
    pushMessage,
    sendCampaignMessage,
    sendContextMessage,
  ]);

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── New chat ──────────────────────────────────────────────────────────────────

  const startNewChat = async () => {
    if (messages.length > 0) {
      const title = messages.find(m => m.role === "user")?.text?.slice(0, 42) || "Search";
      setChatHistory(prev => [{ id: Date.now(), title, messages, context }, ...prev]);
    }
    try {
      await Promise.all([
        fetch(`${API_BASE}/context/reset`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ session_id: sessionRef.current }),
        }),
        fetch(`${API_BASE}/campaign/reset`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ session_id: sessionRef.current }),
        }),
      ]);
    } catch {}
    setMessages([]);
    setInput("");
    setSuggestions({});
    setContext({});
    setPhase("product");
    setCampaignActive(false);
    setSelectedProduct(null);
    setActiveChatId(null);
  };

  const loadChat = chat => {
    setMessages(chat.messages);
    setContext(chat.context || {});
    setSuggestions({});
    setActiveChatId(chat.id);
  };

  // ── Derived state ─────────────────────────────────────────────────────────────

  const filledProductFields   = PRODUCT_FIELD_ORDER.filter(f => context[f]);
  const filledTargetingFields = TARGETING_FIELD_ORDER.filter(f => context[f]);
  const totalFilled           = filledProductFields.length + filledTargetingFields.length;
  const hasAnyContext         = totalFilled > 0;

  const displayPhase = campaignActive ? "campaign_active" : phase;

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`}>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            Del<span>phi</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(v => !v)}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <button className="new-chat-btn" onClick={startNewChat}>
          New Search
        </button>

        <PhaseBadge phase={displayPhase} />

        <div className="sidebar-context-scroll">
          {selectedProduct && (
            <SidebarPanel title="Selected Product" defaultOpen>
              <ContextPill label="Product" value={selectedProduct} />
            </SidebarPanel>
          )}

          {filledProductFields.length > 0 && (
            <SidebarPanel title="Product Context" defaultOpen>
              {filledProductFields.map(f => (
                <ContextPill
                  key={f}
                  label={PRODUCT_FIELD_LABELS[f]}
                  value={context[f]}
                />
              ))}
            </SidebarPanel>
          )}

          {filledTargetingFields.length > 0 && (
            <SidebarPanel title="Audience Targeting" defaultOpen>
              {filledTargetingFields.map(f => (
                <ContextPill
                  key={f}
                  label={TARGETING_FIELD_LABELS[f]}
                  value={context[f]}
                />
              ))}
            </SidebarPanel>
          )}

          {hasAnyContext && (
            <div className="overall-progress">
              {/* <span className="overall-label">Profile complete</span>
              <ProgressBar
                filled={totalFilled}
                total={ALL_FIELDS.length}
              /> */}
            </div>
          )}
        </div>

        {(chatHistory.length > 0 || messages.length > 0) && (
          <div className="history-section-label">Recent searches</div>
        )}

        <div className="history-list">
          {messages.length > 0 && !activeChatId && (
            <div className="history-item active">
              {messages.find(m => m.role === "user")?.text?.slice(0, 38) ||
                "Current search"}
            </div>
          )}
          {chatHistory.map(chat => (
            <div
              key={chat.id}
              className={`history-item ${activeChatId === chat.id ? "active" : ""}`}
              onClick={() => loadChat(chat)}
            >
              {chat.title}
            </div>
          ))}
          {chatHistory.length === 0 && messages.length === 0 && (
            <p className="history-empty">
              Your searches will appear here
            </p>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="avatar">{userInitials}</div>
          <div className="user-info">
            <span className="user-name">
              {user.full_name || "Delphi User"}
            </span>
            <span className="user-email">
              {user.email || "B2B Lead Intelligence"}
            </span>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(v => !v)}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          className="sidebar-reopen"
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
          aria-label="Open sidebar"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M2 2L8 8L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* MAIN PANEL */}
      <main className="main-panel">

        {/* ── WELCOME SCREEN (no messages yet) ───────────────────────────
            Renders as a single scrollable column centred in the panel.
            ProductSelector and the fallback starter-prompts are mutually
            exclusive: selector shows when a company profile exists,
            starter-prompts show as a fallback.
        ─────────────────────────────────────────────────────────────── */}
        {messages.length === 0 && (
          <div className="welcome-screen">
            <div className="empty-eyebrow">B2B Lead Intelligence</div>
            <h1 className="empty-title">
              Find your <em>ideal leads</em> through a structured conversation
            </h1>
            <p className="empty-subtitle">
              Select a product below, or describe your campaign requirements
              directly to find qualified leads from the database.
            </p>

            {/* Product selector — shown when profile loaded with products */}
            {profileLoaded && !campaignActive && (
              profile?.brands?.length > 0 || profile?.services?.length > 0
            ) ? (
              <ProductSelector
                profile={profile}
                onSelect={(product, ptype) => handleProductSelected(product)}
              />
            ) : (
              /* Fallback starter prompts when no profile */
              <div className="starter-prompts">
                {[
                  "I want to target C-Level decision makers at mid-size manufacturing companies in the United States",
                  "Find marketing leads in the healthcare industry from India with 500 or more employees",
                  "Technology companies in Europe targeting VP-level and above with revenue above 50 million",
                ].map(prompt => (
                  <button
                    key={prompt}
                    className="starter-chip"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages — only rendered after conversation starts */}
        <div className={`messages-area ${messages.length === 0 ? "no-scroll" : ""}`}>
          {messages.map(msg => (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              {msg.role === "bot" && (
                <div className="bot-avatar" title="Delphi">D</div>
              )}
              <div className="message-content">
                {msg.text && (
                  <div className="bubble">{msg.text}</div>
                )}
                {msg.editApplied && (
                  <div className="edit-badge">
                    Updated: {msg.editApplied.field?.replace(/_/g, " ")} to{" "}
                    {msg.editApplied.value}
                  </div>
                )}
                {msg.table !== undefined && (
                  <LeadsTable rows={msg.table} />
                )}
                {msg.icpTable && (
                  <IcpTable rows={msg.icpTable} />
                )}
                {msg.campaignCards && (
                  <CampaignCards
                    campaigns={msg.campaignCards}
                    onSelect={text => {
                      pushMessage({ role: "user", text });
                      sendCampaignMessage(text);
                    }}
                  />
                )}
                {msg.quickReplies && (
                  <QuickReplies
                    options={msg.quickReplies}
                    onSelect={handleSend}
                  />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row bot">
              <div className="bot-avatar">D</div>
              <div className="message-content">
                <div className="bubble">
                  <TypingDots />
                </div>
              </div>
            </div>
          )}

          {!loading && Object.keys(suggestions).length > 0 && (
            <div className="suggestions-area">
              {Object.entries(suggestions).map(([field, items]) => (
                <SuggestionGroup
                  key={field}
                  field={field}
                  items={items}
                  onSelect={handleSend}
                />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="input-zone">
          <div className="input-card">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder={
                campaignActive
                  ? "Respond to the question above..."
                  : phase === "product"
                  ? "Describe your product or campaign goal..."
                  : phase === "targeting"
                  ? "Specify your target audience..."
                  : "Ask a follow-up question or refine your search..."
              }
              value={input}
              rows={1}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              title="Send (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M22 2L15 22L11 13L2 9L22 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <p className="input-hint" />
        </div>
      </main>
    </div>
  );
}