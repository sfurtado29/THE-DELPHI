// Intelligence.js — Enterprise Redesign
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "./intellegence.css";

const API_BASE   = "http://127.0.0.1:8000";
const SESSION_ID = `user_${Math.random().toString(36).slice(2, 9)}`;

// ── Field definitions ────────────────────────────────────────────────────────

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
  revenue_range: "Lead Revenue",
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
  revenue_range: "Lead Revenue Ranges",
};

const ALL_FIELDS = [...PRODUCT_FIELD_ORDER, ...TARGETING_FIELD_ORDER];

// ── Utility: parse lead text strings ────────────────────────────────────────
function parseLeadText(text) {
  if (typeof text !== "string") return null;
  const row = {};
  const companyMatch = text.match(/Lead works at ([^.]+)\./);
  if (companyMatch) row["Company"] = companyMatch[1].trim();
  const pairs = [
    ["Industry",      /Industry:\s*([^.]+)\./],
    ["Job Title",     /Job title:\s*([^.]+)\./],
    ["Job Function",  /Job function:\s*([^.]+)\./],
    ["Seniority",     /Seniority:\s*([^.]+?)(?:\.|$)/],
    ["Employee Size", /Employee[_ ](?:size|count)?:\s*([^.]+)\./i],
    ["Revenue",       /Revenue[_ ]range:\s*([^.]+)\./i],
    ["Geography",     /Geography:\s*([^.]+)\./i],
    ["Domain",        /(?:domain|sector):\s*([^.]+)\./i],
  ];
  for (const [key, rx] of pairs) {
    const m = text.match(rx);
    if (m) row[key] = m[1].trim();
  }
  return Object.keys(row).length > 0 ? row : null;
}

function normalizeRow(row) {
  if (typeof row === "string") return parseLeadText(row) || { Profile: row };
  if (row && typeof row === "object") {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      out[label] = v ?? "—";
    }
    return out;
  }
  return { Value: String(row) };
}

const PRIORITY_COLS = [
  "Company", "Job Title", "Seniority", "Industry",
  "Job Function", "Domain", "Employee Size", "Revenue", "Geography",
];

function sortColumns(cols) {
  const priority = PRIORITY_COLS.filter(c => cols.includes(c));
  const rest = cols.filter(c => !PRIORITY_COLS.includes(c));
  return [...priority, ...rest];
}

// ── Seniority badge ──────────────────────────────────────────────────────────
const SENIORITY_COLORS = {
  "c level":       { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  "c-level":       { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  "chief":         { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  "ceo":           { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  "cto":           { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  "cfo":           { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  "vp":            { bg: "#ede9fe", text: "#4c1d95", border: "#c4b5fd" },
  "vice president":{ bg: "#ede9fe", text: "#4c1d95", border: "#c4b5fd" },
  "director":      { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  "manager":       { bg: "#dcfce7", text: "#14532d", border: "#86efac" },
  "senior":        { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
};

function SeniorityBadge({ value }) {
  if (!value) return <span className="lt-cell-dash">—</span>;
  const key = value.toLowerCase();
  const style = Object.entries(SENIORITY_COLORS).find(([k]) => key.includes(k))?.[1];
  if (!style) return <span className="lt-cell-text">{value}</span>;
  return (
    <span className="lt-seniority-badge"
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
      {value}
    </span>
  );
}

const INDUSTRY_ICONS = {
  software: "💻", technology: "💻", computers: "💻",
  healthcare: "🏥", health: "🏥",
  finance: "🏦", financial: "🏦", banking: "🏦", fintech: "🏦",
  manufacturing: "🏭",
  retail: "🛍️",
  education: "🎓",
  "real estate": "🏢",
  energy: "⚡",
  media: "📺", entertainment: "📺",
  telecommunications: "📡",
  agriculture: "🌾",
};

function IndustryCell({ value }) {
  if (!value) return <span className="lt-cell-dash">—</span>;
  const icon = Object.entries(INDUSTRY_ICONS).find(([k]) => value.toLowerCase().includes(k))?.[1] || "🏢";
  return (
    <span className="lt-industry-cell">
      <span>{icon}</span>
      {value}
    </span>
  );
}

// ── Leads Table ──────────────────────────────────────────────────────────────
function LeadsTable({ rows }) {
  const [page, setPage]             = useState(0);
  const [sortCol, setSortCol]       = useState(null);
  const [sortDir, setSortDir]       = useState("asc");
  const [search, setSearch]         = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const PAGE_SIZE = 15;

  const normalized = useMemo(() =>
    !rows?.length ? [] : rows.map(normalizeRow).filter(Boolean), [rows]);

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
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
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
        <div className="lt-empty-icon">🔍</div>
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
            <button className="lt-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
      </div>

      <div className="lt-scroll">
        <table className="lt-table">
          <thead>
            <tr>
              <th className="lt-th lt-th-num">#</th>
              {columns.map(col => (
                <th key={col}
                  className={`lt-th ${sortCol === col ? "lt-th-sorted" : ""}`}
                  onClick={() => handleSort(col)}
                >
                  <span className="lt-th-inner">
                    {col}
                    <span className="lt-sort-icon">
                      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "⇅"}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const absIdx = page * PAGE_SIZE + i;
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
                        {col === "Seniority"  ? <SeniorityBadge value={row[col]} /> :
                         col === "Industry"   ? <IndustryCell value={row[col]} /> :
                         col === "Company"    ? <span className="lt-cell-company">{row[col] || "—"}</span> :
                         col === "Job Title"  ? <span className="lt-cell-jobtitle">{row[col] || "—"}</span> :
                         <span className={row[col] && row[col] !== "—" ? "lt-cell-text" : "lt-cell-dash"}>
                           {row[col] || "—"}
                         </span>
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
          <span className="lt-page-info">Page {page + 1} of {totalPages} · {sorted.length} results</span>
          <div className="lt-page-btns">
            <button className="lt-page-btn" disabled={page === 0} onClick={() => setPage(0)}>«</button>
            <button className="lt-page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
            {pageWindow().map(p => (
              <button key={p}
                className={`lt-page-btn ${p === page ? "lt-page-btn-active" : ""}`}
                onClick={() => setPage(p)}
              >{p + 1}</button>
            ))}
            <button className="lt-page-btn" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
            <button className="lt-page-btn" disabled={page === totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar Panel ────────────────────────────────────────────────────────────
function SidebarPanel({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sidebar-panel">
      <button className="sidebar-panel-header" onClick={() => setOpen(v => !v)}>
        <span className="sidebar-panel-title">{title}</span>
        <span className={`sidebar-panel-chevron ${open ? "open" : ""}`}>›</span>
      </button>
      {open && <div className="sidebar-panel-body">{children}</div>}
    </div>
  );
}

// ── Context Pill ─────────────────────────────────────────────────────────────
function ContextPill({ label, value }) {
  return (
    <div className="context-pill">
      <span className="pill-label">{label}</span>
      <span className="pill-value" title={value}>{value}</span>
    </div>
  );
}

// ── Typing Dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="typing-indicator">
      <span /><span /><span />
    </div>
  );
}

// ── Suggestion Group ─────────────────────────────────────────────────────────
function SuggestionGroup({ field, items, onSelect }) {
  return (
    <div className="suggestion-group">
      <div className="suggestion-group-label">
        <span>{SUGGESTION_LABELS[field] || field}</span>
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

// ── Progress Bar ─────────────────────────────────────────────────────────────
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

// ── Phase Badge ──────────────────────────────────────────────────────────────
function PhaseBadge({ phase }) {
  if (!phase || phase === "complete") return null;
  const isProduct = phase === "product";
  const label = isProduct ? "Product & Campaign" : "Audience Targeting";
  const color = isProduct ? "var(--violet)" : "var(--accent)";
  const bg    = isProduct ? "var(--violet-soft)" : "var(--accent-soft)";
  return (
    <div className="phase-badge" style={{ background: bg, color, borderColor: color }}>
      <span className="phase-dot" style={{ background: color }} />
      {label}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function Intellegence() {
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [context,       setContext]       = useState({});
  const [suggestions,   setSuggestions]   = useState({});
  const [phase,         setPhase]         = useState("product");
  const [chatHistory,   setChatHistory]   = useState([]);
  const [activeChatId,  setActiveChatId]  = useState(null);
  const [chatTitle,     setChatTitle]     = useState("");
  const [isStarred,     setIsStarred]     = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [darkMode,      setDarkMode]      = useState(() => {
    return localStorage.getItem("delphi-theme") === "dark";
  });

  const bottomRef      = useRef(null);
  const textareaRef    = useRef(null);
  const sessionRef     = useRef(SESSION_ID);
  // Apply theme to document root
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
  }, [messages, suggestions, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  // Load user info from localStorage
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  const userInitials = useMemo(() => {
    const name = user.full_name || user.email || "D";
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }, [user]);

  const currentChatTitle = useMemo(() => {
    if (activeChatId) {
      const active = chatHistory.find(c => c.id === activeChatId);
      return active?.title || "Saved Search";
    }
    if (chatTitle) return chatTitle;
    const userMessage = messages.find(m => m.role === "user")?.text || "";
    return userMessage ? userMessage.slice(0, 42) : "New Search";
  }, [activeChatId, chatHistory, messages, chatTitle]);

  const toggleStarChat = (chatId) => {
    setChatHistory(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, starred: !chat.starred } : chat
    ));
  };

  const deleteChat = (chatId) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
      setContext({});
      setSuggestions({});
      setPhase("product");
      setChatTitle("");
    }
  };

  const pushMessage = useCallback(msg => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const finalText = (text || input).trim();
    if (!finalText || loading) return;

    pushMessage({ role: "user", text: finalText });
    setInput("");
    setLoading(true);
    setSuggestions({});

    try {
      const res = await fetch(`${API_BASE}/context/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionRef.current, message: finalText }),
      });

      const data = await res.json();
      console.log("[API Response]", data);

      if (data.context)  setContext(data.context);
      if (data.phase)    setPhase(data.phase);

      if (data.status === "complete") {
        if (data.summary) pushMessage({ role: "bot", text: data.summary });
        pushMessage({ role: "bot", table: data.leads || data.data || [] });
        setSuggestions({});
        setPhase("complete");
      } else {
        if (data.response) {
          pushMessage({
            role: "bot",
            text: data.response,
            editApplied: data.edit_applied || null,
          });
        }
        if (data.suggestions) {
          const filtered = {};
          for (const [k, v] of Object.entries(data.suggestions)) {
            if (Array.isArray(v) && v.length > 0) filtered[k] = v;
          }
          setSuggestions(filtered);
        }
      }
    } catch (err) {
      console.error(err);
      pushMessage({ role: "bot", text: "Something went wrong connecting to the server. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [input, loading, pushMessage]);

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = async () => {
    if (messages.length > 0) {
      const title = messages.find(m => m.role === "user")?.text?.slice(0, 42) || "Chat";
      setChatHistory(prev => [{ id: Date.now(), title, messages, context }, ...prev]);
    }
    try {
      await fetch(`${API_BASE}/context/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionRef.current }),
      });
    } catch {}
    setMessages([]);
    setInput("");
    setSuggestions({});
    setContext({});
    setPhase("product");
    setActiveChatId(null);
  };

  const loadChat = chat => {
    setMessages(chat.messages);
    setContext(chat.context || {});
    setSuggestions({});
    setActiveChatId(chat.id);
  };

  const filledProductFields   = PRODUCT_FIELD_ORDER.filter(f => context[f]);
  const filledTargetingFields = TARGETING_FIELD_ORDER.filter(f => context[f]);
  const totalFilled           = filledProductFields.length + filledTargetingFields.length;
  const hasAnyContext         = totalFilled > 0;

  const overallPct = Math.round((totalFilled / ALL_FIELDS.length) * 100);

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`}>

      {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
      <aside className="sidebar">

        {/* Header */}
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(v => !v)}
            title="Collapse sidebar"
          >‹</button>
        </div>

        {/* New chat */}
        <button className="new-chat-btn" onClick={startNewChat}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          New Search
        </button>

        {/* Phase */}
        <PhaseBadge phase={phase} />

        {/* Context panels */}
        <div className="sidebar-context-scroll">
          {filledProductFields.length > 0 && (
            <SidebarPanel title="Product & Campaign" defaultOpen>
              {filledProductFields.map(f => (
                <ContextPill key={f} label={PRODUCT_FIELD_LABELS[f]} value={context[f]} />
              ))}
            </SidebarPanel>
          )}

          {filledTargetingFields.length > 0 && (
            <SidebarPanel title="Audience Context" defaultOpen>
              {filledTargetingFields.map(f => (
                <ContextPill key={f} label={TARGETING_FIELD_LABELS[f]} value={context[f]} />
              ))}
            </SidebarPanel>
          )}

          {hasAnyContext && (
            <div className="overall-progress">
              <span className="overall-label">Profile complete</span>
              <ProgressBar filled={totalFilled} total={ALL_FIELDS.length} />
            </div>
          )}
        </div>

        {/* My Campaign placeholder — section coming soon */}
        <div className="sidebar-campaign-placeholder" />

        {/* Starred + History pinned to bottom */}
        <div className="sidebar-bottom">
          {chatHistory.some(c => c.starred) && (
            <div className="sidebar-history">
              <div className="history-section-label">⭐ Starred</div>
              <div className="history-list">
                {chatHistory.filter(c => c.starred).map(chat => (
                  <div
                    key={chat.id}
                    className={`history-item ${activeChatId === chat.id ? "active" : ""}`}
                    onClick={() => loadChat(chat)}
                  >
                    <span className="history-item-title">{chat.title}</span>
                    <span className="history-item-actions">
                      <button className="hist-action-btn starred" title="Unstar" onClick={e => { e.stopPropagation(); toggleStarChat(chat.id); }}>⭐</button>
                      <button className="hist-action-btn delete" title="Delete" onClick={e => { e.stopPropagation(); deleteChat(chat.id); }}>🗑</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sidebar-history">
            <div className="history-section-label">History</div>
            <div className="history-list">
              {messages.length > 0 && !activeChatId && (
                <div className="history-item active">
                  {messages.find(m => m.role === "user")?.text?.slice(0, 38) || "Current search"}
                </div>
              )}
              {chatHistory.filter(c => !c.starred).map(chat => (
                <div
                  key={chat.id}
                  className={`history-item ${activeChatId === chat.id ? "active" : ""}`}
                  onClick={() => loadChat(chat)}
                >
                  <span className="history-item-title">{chat.title}</span>
                  <span className="history-item-actions">
                    <button className="hist-action-btn" title="Star" onClick={e => { e.stopPropagation(); toggleStarChat(chat.id); }}>☆</button>
                    <button className="hist-action-btn delete" title="Delete" onClick={e => { e.stopPropagation(); deleteChat(chat.id); }}>🗑</button>
                  </span>
                </div>
              ))}
              {chatHistory.length === 0 && messages.length === 0 && (
                <p className="history-empty">Your searches will appear here</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Collapsed toggle */}
      {!sidebarOpen && (
        <button
          className="sidebar-reopen"
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
        >›</button>
      )}

      {/* ══ MAIN PANEL ═══════════════════════════════════════════ */}
      <main className="main-panel">
        <div className="chat-topbar">
          <span className="chat-title-text">{currentChatTitle || "New Search"}</span>
        </div>

        {/* Delphi hero search (empty state) */}
        {messages.length === 0 && (
          <div className="delphi-hero">
            <div className="delphi-logo">Welcome{user.full_name ? ` ${user.full_name.split(" ")[0].toLowerCase()}` : ""}</div>

            <h1 className="delphi-hero-title">How can I help you?</h1>
            <p className="delphi-hero-subtitle">Ask anything about leads, companies, competitors, market intelligence, or industry insights.</p>

            <div className="hero-cards">
              <button className="hero-card" onClick={() => sendMessage("Find high intent leads in SaaS")}> <span>Find high intent leads in SaaS</span> <span className="card-arrow">→</span> </button>
              <button className="hero-card" onClick={() => sendMessage("Analyze a company")}> <span>Analyze a company</span> <span className="card-arrow">→</span> </button>
              <button className="hero-card" onClick={() => sendMessage("Monitor competitor activities")}> <span>Monitor competitor activities</span> <span className="card-arrow">→</span> </button>
              <button className="hero-card" onClick={() => sendMessage("Latest market signals")}> <span>Latest market signals</span> <span className="card-arrow">→</span> </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className={`messages-area ${messages.length === 0 ? "no-scroll" : ""}`}>
          {messages.map(msg => (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              {msg.role === "bot" && (
                <div className="bot-avatar" title="Delphi AI">D</div>
              )}
              <div className="message-content">
                {msg.text && <div className="bubble">{msg.text}</div>}
                {msg.editApplied && (
                  <div className="edit-badge">
                    ✓ Updated: {msg.editApplied.field?.replace(/_/g, " ")} → {msg.editApplied.value}
                  </div>
                )}
                {msg.table !== undefined && <LeadsTable rows={msg.table} />}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row bot">
              <div className="bot-avatar">D</div>
              <div className="message-content">
                <div className="bubble"><TypingDots /></div>
              </div>
            </div>
          )}

          {!loading && Object.keys(suggestions).length > 0 && (
            <div className="suggestions-area">
              {Object.entries(suggestions).map(([field, items]) => (
                <SuggestionGroup key={field} field={field} items={items} onSelect={sendMessage} />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input: always visible at bottom */}
        <div className="input-zone">
          <div className="input-card">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Type your message here..."
              value={input}
              rows={1}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              title="Send (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}