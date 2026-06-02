// ./frontend/src/components/Persona/CreatePersona.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import GeneratePersona from "./GeneratePersona";

export default function CreatePersona() {

  // ── Dropdown master data ─────────────────────────────────────────
  const [industries,      setIndustries]      = useState([]);
  const [countries,       setCountries]       = useState([]);
  const [jobLevels,       setJobLevels]       = useState([]);
  const [jobTitles,       setJobTitles]       = useState([]);
  const [jobFunctions,    setJobFunctions]    = useState([]);
  const [experience,      setExperience]      = useState([]);
  const [callEngagements, setCallEngagements] = useState([]);
  const [callRatings,     setCallRatings]     = useState([]);
  const [callStatuses,    setCallStatuses]    = useState([]);

  // ── Filter state ─────────────────────────────────────────────────
  const EMPTY_FILTERS = {
    country_id        : "",
    industry_id       : "",
    job_level_id      : "",
    job_titles        : "",
    jobfunction_id    : "",
    experience        : "",
    call_engagement_id: "",
    call_rating_id    : "",
    call_status_id    : "",
    start_date        : "",
    end_date          : "",
  };

  const [filters,        setFilters]        = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [error,          setError]          = useState("");
  const [loading,        setLoading]        = useState(false);

  const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

  const ENDPOINTS = {
    industries     : `${API_BASE}/leadscores/filters/industries`,
    countries      : `${API_BASE}/leadscores/filters/countries`,
    job_levels     : `${API_BASE}/leadscores/filters/job_levels`,
    job_titles     : `${API_BASE}/leadscores/filters/job_titles`,
    job_functions  : `${API_BASE}/leadscores/filters/job_functions`,
    experience     : `${API_BASE}/leadscores/filters/experience`,
    call_engagement: `${API_BASE}/leadscores/filters/call-engagement`,
    call_rating    : `${API_BASE}/leadscores/filters/call-rating`,
    call_status    : `${API_BASE}/leadscores/filters/call-status`,
  };

  // ── Normalize any API shape into { id, label } ───────────────────
  const toOptions = (arr, idKey = "id", labelKey = "label") => {
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => ({
      id   : it[idKey]    ?? it.id    ?? it.value ?? "",
      label: it[labelKey] ?? it.label ?? it.name  ?? String(it[idKey] ?? it.id ?? ""),
    }));
  };

  // ── Fetch all filter dropdowns in parallel ───────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ind, ctr, jl, jt, jf, exp, ce, cr, cs] = await Promise.all([
          axios.get(ENDPOINTS.industries),
          axios.get(ENDPOINTS.countries),
          axios.get(ENDPOINTS.job_levels),
          axios.get(ENDPOINTS.job_titles),
          axios.get(ENDPOINTS.job_functions),
          axios.get(ENDPOINTS.experience),
          axios.get(ENDPOINTS.call_engagement),
          axios.get(ENDPOINTS.call_rating),
          axios.get(ENDPOINTS.call_status),
        ]);
        setIndustries     (toOptions(ind.data.industries    || []));
        setCountries      (toOptions(ctr.data.countries     || []));
        setJobLevels      (toOptions(jl.data.job_levels     || []));
        setJobTitles      (toOptions(jt.data.job_titles     || []));
        setJobFunctions   (toOptions(jf.data.job_functions  || []));
        setExperience     (toOptions(exp.data?.data         || []));
        setCallEngagements(toOptions(ce.data?.data          || []));
        setCallRatings    (toOptions(cr.data?.data          || []));
        setCallStatuses   (toOptions(cs.data?.data          || []));
      } catch (e) {
        console.error("Filter fetch error:", e);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleApply = () => {
    setError("");
    setAppliedFilters({ ...filters });
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters({ ...EMPTY_FILTERS });
    setError("");
  };

  // ── Shared CSS helpers ───────────────────────────────────────────
  const selectCls =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 " +
    "focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 shadow-sm transition-all";

  const labelCls = "block text-sm font-medium text-gray-600 mb-2";

  // ── Dropdown filter definitions ──────────────────────────────────
  const filterFields = [
    { label: "Country",          key: "country_id",         opts: countries,       ph: "Select Country"    },
    { label: "Industry",         key: "industry_id",        opts: industries,      ph: "Select Industry"   },
    { label: "Job Level",        key: "job_level_id",       opts: jobLevels,       ph: "Select Job Level"  },
    { label: "Job Function",     key: "jobfunction_id",     opts: jobFunctions,    ph: "Select Function"   },
    { label: "Job Title",        key: "job_titles",         opts: jobTitles,       ph: "Select Job Title"  },
    { label: "Years Experience", key: "experience",         opts: experience,      ph: "Select Experience" },
    { label: "Call Engagement",  key: "call_engagement_id", opts: callEngagements, ph: "Select Engagement" },
    { label: "Call Rating",      key: "call_rating_id",     opts: callRatings,     ph: "Select Rating"     },
    { label: "Call Status",      key: "call_status_id",     opts: callStatuses,    ph: "Select Status"     },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <h6 className="title-style">Uncover Personas</h6>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl shadow-sm text-sm">
          {error}
        </div>
      )}

      {/* ── Filter Card ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8">

          <h3 className="text-lg font-semibold text-red-600 mb-6 border-l-4 border-red-500 pl-3">
            Persona Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Dropdown filters */}
            {filterFields.map((f) => (
              <div key={f.key}>
                <label className={labelCls}>{f.label}</label>
                <select
                  className={selectCls}
                  value={filters[f.key]}
                  onChange={(e) => updateFilter(f.key, e.target.value)}
                >
                  <option value="">{f.ph}</option>
                  {f.opts.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
            ))}

            {/* Start Date */}
            <div>
              <label className={labelCls}>Start Date</label>
              <input
                type="date"
                className={selectCls}
                value={filters.start_date}
                onChange={(e) => updateFilter("start_date", e.target.value)}
              />
            </div>

            {/* End Date */}
            <div>
              <label className={labelCls}>End Date</label>
              <input
                type="date"
                className={selectCls}
                value={filters.end_date}
                onChange={(e) => updateFilter("end_date", e.target.value)}
              />
            </div>

          </div>
        </div>

        {/* ── Action Buttons ─────────────────────────────────────── */}
        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={handleApply}
            disabled={loading}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold
              rounded-xl shadow-md transition-all duration-200 disabled:opacity-60"
          >
            {loading ? "Processing…" : "Create Persona"}
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-5 py-2.5 bg-white border border-red-500 hover:bg-gray-100
              text-red-500 font-medium rounded-xl shadow-sm transition-all disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Results Table ──────────────────────────────────────────── */}
      <GeneratePersona
        appliedFilters={appliedFilters}
        onLoadingChange={setLoading}
      />

    </div>
  );
}