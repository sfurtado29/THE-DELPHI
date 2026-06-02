
// ./frontend/src/components/Persona/GeneratePersona.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

// ================================================================
// CONSTANTS
// ================================================================

const PRIORITY_STYLES = {
  "Very High": {
    bg: "bg-emerald-100", text: "text-emerald-700",
    dot: "bg-emerald-500", border: "border-emerald-200",
  },
  "High": {
    bg: "bg-blue-100",    text: "text-blue-700",
    dot: "bg-blue-500",   border: "border-blue-200",
  },
  "Medium": {
    bg: "bg-amber-100",   text: "text-amber-700",
    dot: "bg-amber-500",  border: "border-amber-200",
  },
  "Low": {
    bg: "bg-red-100",     text: "text-red-600",
    dot: "bg-red-400",    border: "border-red-200",
  },
  "Very Low": {
    bg: "bg-gray-100",    text: "text-gray-500",
    dot: "bg-gray-400",   border: "border-gray-200",
  },
};

const TIER_STYLES = {
  "Tier 1": { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  "Tier 2": { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200"   },
  "Tier 3": { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200"  },
  "Tier 4": { bg: "bg-gray-100",   text: "text-gray-500",   border: "border-gray-200"   },
};

/** Tailwind colour class based on numeric score value. */
const scoreColor = (s) => {
  const v = parseFloat(s) || 0;
  if (v >= 75) return "text-emerald-600 font-bold";
  if (v >= 55) return "text-blue-600 font-semibold";
  if (v >= 35) return "text-amber-600 font-semibold";
  return "text-red-500 font-semibold";
};

const PAGE_SIZE = 10;

const TABLE_COLUMNS = [
  "Sr.", "Lead ID", "Company", "Persona", "Job Title",
  "ICP Score", "Propensity", "Persona Score", "Persona Tier", "Persona Role",
  "Priority", "Recommended Action", "Report",
];


// ================================================================
// SHARED SUB-COMPONENTS
// ================================================================

/** Thin progress bar beneath a numeric score. */
const ScoreBar = ({ value, color = "bg-red-500" }) => (
  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
    <div
      className={`${color} h-1.5 rounded-full transition-all duration-500`}
      style={{ width: `${Math.min(100, Math.max(0, parseFloat(value) || 0))}%` }}
    />
  </div>
);

/** Coloured pill badge. */
const Badge = ({ label, styles }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
      border ${styles.bg} ${styles.text} ${styles.border}`}
  >
    {label}
  </span>
);

/** Convert snake_case / camelCase key to Title Case label. */
const toLabel = (k) =>
  k.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");


// ================================================================
// REPORT MODAL
// ================================================================

function ReportModal({ lead, onClose }) {
  if (!lead) return null;

  const bd = lead.score_breakdown || {};

  const sections = [
    {
      key  : "engagement",
      label: "Engagement Score",
      color: "from-violet-500 to-purple-600",
      bar  : "bg-violet-500",
    },
    {
      key  : "conversion",
      label: "Conversion Score",
      color: "from-blue-500 to-cyan-600",
      bar  : "bg-blue-500",
    },
    {
      key  : "velocity",
      label: "Deal Velocity Score",
      color: "from-amber-500 to-orange-500",
      bar  : "bg-amber-500",
    },
    {
      key  : "deal_size",
      label: "Deal Size Impact Score",
      color: "from-emerald-500 to-teal-600",
      bar  : "bg-emerald-500",
    },
  ];

  const tierStyle     = TIER_STYLES[lead.persona_tier]          || TIER_STYLES["Tier 4"];
  const priorityStyle = PRIORITY_STYLES[lead.combined_priority] || PRIORITY_STYLES["Low"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ─────────────────────────────────────── */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4
          flex items-start justify-between rounded-t-2xl z-10">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-0.5">
              Persona Report · Lead #{lead.lead_id}
            </p>
            <h2 className="text-xl font-bold text-gray-800">
              {lead.company_name || "—"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {lead.job_title || "—"}
              {lead.job_level_desc ? ` · ${lead.job_level_desc}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none mt-1 transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── Final Score Banner ──────────────────────────────── */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-5
            text-white flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75 mb-1">Final Persona Score</p>
              <p className="text-5xl font-black">{lead.final_persona_score}</p>
              <p className="text-sm opacity-70 mt-1">{lead.business_meaning}</p>
            </div>
            <div className="text-right space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold
                bg-white/20 border border-white/30">
                {lead.persona_tier}
              </span>
              <p className="text-sm font-semibold opacity-90 mt-1">{lead.persona_role}</p>
            </div>
          </div>

          {/* ── Summary Badges ──────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <Badge
              label={lead.persona}
              styles={{ bg: "bg-red-50", text: "text-red-700", border: "border-red-100" }}
            />
            <Badge label={lead.persona_tier}      styles={tierStyle}     />
            <Badge label={lead.combined_priority} styles={priorityStyle} />
            <Badge
              label={lead.persona_role}
              styles={{ bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" }}
            />
          </div>

          {/* ── Score Formula Cards ─────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Engagement", score: lead.engagement_score, weight: "30%", bar: "bg-violet-400" },
              { label: "Conversion", score: lead.conversion_score, weight: "40%", bar: "bg-blue-400"   },
              { label: "Velocity",   score: lead.velocity_score,   weight: "20%", bar: "bg-amber-400"  },
              { label: "Deal Size",  score: lead.deal_size_score,  weight: "10%", bar: "bg-emerald-400"},
            ].map((item) => (
              <div key={item.label}
                className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className="text-xs text-gray-400 font-medium mb-1">{item.label}</p>
                <p className={`text-2xl font-black ${scoreColor(item.score)}`}>
                  {item.score}
                </p>
                <ScoreBar value={item.score} color={item.bar} />
                <p className="text-xs text-gray-400 mt-1">× {item.weight}</p>
              </div>
            ))}
          </div>

          {/* ── Score Breakdown Sections ────────────────────────── */}
          {sections.map((sec) => {
            const section = bd[sec.key] || {};
            const params  = section.params || {};

            return (
              <div key={sec.key} className="border border-gray-100 rounded-xl overflow-hidden">

                {/* Section header */}
                <div className={`bg-gradient-to-r ${sec.color} px-4 py-3
                  flex justify-between items-center`}>
                  <span className="text-white font-semibold text-sm">{sec.label}</span>
                  <span className="text-white font-black text-lg">
                    {section.score ?? 0}
                  </span>
                </div>

                {/* Parameter rows */}
                <div className="divide-y divide-gray-50">
                  {Object.entries(params).map(([param, val]) => (
                    <div key={param} className="px-4 py-3 flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-36 flex-shrink-0">
                        {toLabel(param)}
                      </span>
                      <div className="flex-1">
                        <ScoreBar value={val.score} color={sec.bar} />
                      </div>
                      <span className={`text-sm font-bold w-10 text-right
                        ${scoreColor(val.score)}`}>
                        {val.score}
                      </span>
                      <span className="text-xs text-gray-400 w-14 text-right">
                        wt: {val.weight}
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            );
          })}

          {/* ── Recommended Action ──────────────────────────────── */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4
            flex items-center gap-3">
            <div className="w-2 h-10 bg-red-500 rounded-full flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">
                Recommended Action
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {lead.recommended_action}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


// ================================================================
// LOADING SKELETON  (shown while fetching)
// ================================================================

function TableSkeleton() {
  return (
    <div className="p-8 space-y-4">
      {[...Array(PAGE_SIZE)].map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-6"    />
          <div className="h-4 bg-gray-100 rounded w-14"   />
          <div className="h-4 bg-gray-100 rounded flex-1" />
          <div className="h-4 bg-gray-100 rounded w-28"   />
          <div className="h-4 bg-gray-100 rounded w-32"   />
          <div className="h-4 bg-gray-100 rounded w-16"   />
          <div className="h-4 bg-gray-100 rounded w-16"   />
          <div className="h-4 bg-gray-100 rounded w-20"   />
          <div className="h-4 bg-gray-100 rounded w-24"   />
          <div className="h-4 bg-gray-100 rounded w-20"   />
          <div className="h-4 bg-gray-100 rounded w-40"   />
          <div className="h-4 bg-gray-100 rounded w-20"   />
        </div>
      ))}
    </div>
  );
}


// ================================================================
// MAIN TABLE COMPONENT
// ================================================================

export default function GeneratePersona({ appliedFilters = null, onLoadingChange }) {

  

  const [leads,      setLeads]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [reportLead, setReportLead] = useState(null);

  const API_BASE  = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");
  const LEADS_URL = `${API_BASE}/leadscores/persona/leads`;

  // ── Core fetch function ────────────────────────────────────────
  const fetchLeads = useCallback(
    async (targetPage = 1, filters = appliedFilters) => {
      setLoading(true);
      onLoadingChange?.(true);
      setError("");

      try {
        const params = { page: targetPage, page_size: PAGE_SIZE };

        if (filters) {
          if (filters.country_id)         params.country_id         = filters.country_id;
          if (filters.industry_id)        params.industry_id        = filters.industry_id;
          if (filters.job_level_id)       params.job_level_id       = filters.job_level_id;
          if (filters.jobfunction_id)     params.jobfunction_id     = filters.jobfunction_id;
          if (filters.job_titles)         params.job_title          = filters.job_titles;
          if (filters.experience)         params.experience         = filters.experience;
          if (filters.call_engagement_id) params.call_engagement_id = filters.call_engagement_id;
          if (filters.call_rating_id)     params.call_rating_id     = filters.call_rating_id;
          if (filters.call_status_id)     params.call_status_id     = filters.call_status_id;
          if (filters.start_date)         params.start_date         = filters.start_date;
          if (filters.end_date)           params.end_date           = filters.end_date;
        }

        const res = await axios.get(LEADS_URL, { params });

        setLeads     (res.data.leads       || []);
        setTotal     (res.data.total       || 0);
        setTotalPages(res.data.total_pages || 1);
        setPage      (targetPage);

      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          "Failed to load persona data. Please try again.";
        setError(msg);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appliedFilters, LEADS_URL],
  );
  
  const handleOpenReport = (lead) => {

  sessionStorage.setItem(
    "persona_report_data",
    JSON.stringify(lead)
  );

  window.open(
    "/persona-report",
    "_blank"
  );

};

  // ── CSV Export function ─────────────────────────────────────────
  const handleExportCSV = async () => {
    try {
      setLoading(true);
      onLoadingChange?.(true);

      const params = {};

      if (appliedFilters) {
        if (appliedFilters.country_id)         params.country_id         = appliedFilters.country_id;
        if (appliedFilters.industry_id)        params.industry_id        = appliedFilters.industry_id;
        if (appliedFilters.job_level_id)       params.job_level_id       = appliedFilters.job_level_id;
        if (appliedFilters.jobfunction_id)     params.jobfunction_id     = appliedFilters.jobfunction_id;
        if (appliedFilters.job_titles)         params.job_title          = appliedFilters.job_titles;
        if (appliedFilters.experience)         params.experience         = appliedFilters.experience;
        if (appliedFilters.call_engagement_id) params.call_engagement_id = appliedFilters.call_engagement_id;
        if (appliedFilters.call_rating_id)     params.call_rating_id     = appliedFilters.call_rating_id;
        if (appliedFilters.call_status_id)     params.call_status_id     = appliedFilters.call_status_id;
        if (appliedFilters.start_date)         params.start_date         = appliedFilters.start_date;
        if (appliedFilters.end_date)           params.end_date           = appliedFilters.end_date;
      }

      // Build query string
      const queryString = new URLSearchParams(params).toString();
      const exportUrl = `${API_BASE}/leadscores/persona/leads/export${queryString ? `?${queryString}` : ''}`;

      // Fetch the CSV file
      const response = await fetch(exportUrl);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `persona_leads_${timestamp}.csv`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError("Failed to export CSV. Please try again.");
      console.error("Export error:", err);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  // ── Re-fetch on filter change ──────────────────────────────────
  useEffect(() => {
    fetchLeads(1, appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  // ── Pagination window (max 5 buttons) ─────────────────────────
  const pageNumbers = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3)       return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2)
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  })();

  return (
    <div className="max-w-full">

      {/* ── Full-page Loading Overlay ──────────────────────────── */}
      {loading && (
        <div className="icp-loading-overlay">
          <div className="text-center">
            <div className="icp-diamond-loader">
              <div className="icp-diamond one"   />
              <div className="icp-diamond two"   />
              <div className="icp-diamond three" />
              <div className="icp-diamond four"  />
            </div>
          </div>
        </div>
      )}

      
      {/* ── Error Message ────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* ── Data Card ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Persona Qualified Leads
            </h3>
            {total > 0 && (
              <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-bold">
                {total.toLocaleString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Export Button */}
            {!loading && total > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white 
                  text-xs font-semibold rounded-lg shadow-sm transition-all duration-200
                  flex items-center gap-2"
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
                Export CSV
              </button>
            )}
            
            {!loading && total > 0 && (
              <p className="text-xs text-gray-400">
                Page {page} of {totalPages} &middot; {PAGE_SIZE} per page
              </p>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && <TableSkeleton />}

        {/* Empty state */}
        {!loading && leads.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-gray-500 font-medium">No persona leads found</p>
            <p className="text-gray-400 text-sm mt-1">
              Apply filters and click Create Persona
            </p>
          </div>
        )}

        {/* ── Data Table ─────────────────────────────────────────── */}
        {!loading && leads.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead>
                <tr className="bg-gray-50 text-left">
                  {TABLE_COLUMNS.map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase
                        tracking-wide whitespace-nowrap border-b border-gray-100"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {leads.map((lead, i) => {
                  const pStyle = PRIORITY_STYLES[lead.combined_priority] || PRIORITY_STYLES["Low"];
                  const tStyle = TIER_STYLES[lead.persona_tier]          || TIER_STYLES["Tier 4"];

                  return (
                    <tr
                      key={`${lead.lead_id}-${i}`}
                      className="hover:bg-gray-50/70 transition-colors"
                    >

                      {/* Sr. No. */}
                      <td className="px-4 py-3.5 text-xs text-gray-400 font-medium">
                        {lead.sr_no}
                      </td>

                      {/* Lead ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                          {lead.lead_id}
                        </span>
                      </td>

                      {/* Company + Country */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-800 text-sm whitespace-nowrap">
                          {lead.company_name || "—"}
                        </p>
                        {lead.country_name && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {lead.country_name}
                          </p>
                        )}
                      </td>

                      {/* Persona */}
                      <td className="px-4 py-3.5">
                        <span className="inline-block bg-red-50 text-red-700 border border-red-100
                          text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                          {lead.persona}
                        </span>
                      </td>

                      {/* Job Title + Level */}
                      <td className="px-4 py-3.5 max-w-[140px]">
                        <p className="text-xs text-gray-700 font-medium truncate"
                          title={lead.job_title}>
                          {lead.job_title || "—"}
                        </p>
                        {lead.job_level_desc && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {lead.job_level_desc}
                          </p>
                        )}
                      </td>

                      {/* ICP Score */}
                      <td className="px-4 py-3.5">
                        <span className={`text-sm ${scoreColor(lead.icp_score)}`}>
                          {lead.icp_score}
                        </span>
                        <ScoreBar value={lead.icp_score} color="bg-indigo-400" />
                      </td>

                      {/* Propensity Score */}
                      <td className="px-4 py-3.5">
                        <span className={`text-sm ${scoreColor(lead.propensity_score)}`}>
                          {lead.propensity_score}
                        </span>
                        <ScoreBar value={lead.propensity_score} color="bg-sky-400" />
                      </td>

                      {/* Persona Score + Tier badge */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${scoreColor(lead.final_persona_score)}`}>
                            {lead.final_persona_score}
                          </span>
                        </div>
                        <ScoreBar value={lead.final_persona_score} color="bg-red-400" />
                      </td>

                       <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border
                            ${tStyle.bg} ${tStyle.text} ${tStyle.border}`}>
                            {lead.persona_tier}
                          </span>
                        </div>
                        
                      </td>
                      

                      {/* Persona Role */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-600 font-medium">
                          {lead.persona_role}
                        </span>
                      </td>

                      {/* Combined Priority */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                          text-xs font-semibold border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pStyle.dot}`} />
                          {lead.combined_priority}
                        </span>
                      </td>

                      {/* Recommended Action */}
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {lead.recommended_action}
                        </p>
                      </td>

                      {/* Report Button */}
                      <td className="px-4 py-3.5">
                        {/* <button
                          onClick={() => setReportLead(lead)} 
                          className="px-3 py-1.5 bg-white border border-red-200
                            hover:bg-red-600 hover:text-white hover:border-red-600
                            text-red-600 text-xs font-semibold rounded-lg shadow-sm
                            transition-all duration-200 whitespace-nowrap"
                        >
                          View Report
                        </button> */}

                        <button
                        onClick={() => handleOpenReport(lead)}
                        className="px-3 py-1.5 bg-white border border-red-200
                          hover:bg-red-600 hover:text-white hover:border-red-600
                          text-red-600 text-xs font-semibold rounded-lg shadow-sm
                          transition-all duration-200 whitespace-nowrap"
                      >
                        View Report
                      </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">

            <p className="text-xs text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}&ndash;
              {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} leads
            </p>

            <div className="flex items-center gap-2">

              {/* Previous */}
              <button
                disabled={page <= 1}
                onClick={() => fetchLeads(page - 1)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg
                  hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all text-gray-600"
              >
                Previous
              </button>

              {/* Page number buttons */}
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  onClick={() => fetchLeads(p)}
                  className={`w-8 h-8 text-xs font-semibold rounded-lg transition-all
                    ${p === page
                      ? "bg-red-600 text-white shadow"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {p}
                </button>
              ))}

              {/* Next */}
              <button
                disabled={page >= totalPages}
                onClick={() => fetchLeads(page + 1)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg
                  hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all text-gray-600"
              >
                Next
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}