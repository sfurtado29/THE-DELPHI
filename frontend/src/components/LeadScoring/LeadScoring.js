import React, { useEffect, useState } from "react";
import axios from "axios";
import TopLeadsTable from "./TopLeadsTable";

export default function LeadScoring() {
  const [campaigns, setCampaigns] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [countries, setCountries] = useState([]);
  const [jobLevels, setJobLevels] = useState([]);
  const [jobFunctions, setJobFunctions] = useState([]);
  const [employeeSizes, setEmployeeSizes] = useState([]);
  const [revenueSizes, setRevenueSizes] = useState([]);
  const [qaStatuses, setQaStatuses] = useState([]);

  

  const [filters, setFilters] = useState({
    campaign_id: "",
    country: "",
    industry: "",
    job_level: "",
    job_function: "",
    employee_size: "",
    revenue_size: "",
    qa_status: "",
    campaign_suppression: "all",
    tal_suppression: "all",
    start_date: "",
    end_date: "",
    limit: 1000
  });

  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [runInfo, setRunInfo] = useState(null);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState(100);

  const isCampaignSelected = Boolean(filters.campaign_id);
  const isAnyOtherFilterSelected = Boolean(
    filters.country || filters.industry || filters.job_level || 
    filters.job_function || filters.employee_size || filters.revenue_size || 
    filters.qa_status || filters.start_date || filters.end_date
  );

  const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

  const ENDPOINTS = {
    campaigns: `${API_BASE}/leadscores/filters/campaigns`,
    industries: `${API_BASE}/leadscores/filters/industries`,
    countries: `${API_BASE}/leadscores/filters/countries`,
    job_levels: `${API_BASE}/leadscores/filters/job_levels`,
    job_functions: `${API_BASE}/leadscores/filters/job_functions`,
    employee_sizes: `${API_BASE}/leadscores/filters/employee_sizes`,
    revenue_sizes: `${API_BASE}/leadscores/filters/revenue_sizes`,
    qa_statuses: `${API_BASE}/leadscores/filters/qa-statuses`,
    campaignLeads: `${API_BASE}/leadscores/leads/campaign-leads`,
  };

  const isAnyFilterSelected = Object.values(filters).some(v => v !== "" && v !== null);

  useEffect(() => {
  defaultScoring();
  fetchAllFilters();
  // eslint-disable-next-line
}, [pageSize]);

useEffect(() => {
  if (!loading) {
    runScoring();
  }
  // eslint-disable-next-line
}, [filters.campaign_suppression, filters.tal_suppression, filters.campaign_id]);

  const fetchAllFilters = async () => {
    try {
      await Promise.all([
        fetchCampaigns(), fetchIndustries(), fetchCountries(),
        fetchJobLevels(), fetchJobFunctions(), fetchEmployeeSizes(),
        fetchRevenueSizes(), fetchQaStatuses()
      ]);
    } catch (e) { console.error("Filter Fetch Error", e); }
  };

  const toOptions = (arr, idKey = "id", labelKey = "label") => {
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => ({
      id: it[idKey] ?? it.id ?? it.value ?? "",
      label: it[labelKey] ?? it.label ?? it.name ?? String(it[idKey] ?? it.id ?? "")
    }));
  };

  const fetchJson = async (url) => {
    const res = await axios.get(url);
    return res.data;
  };

  const fetchCampaigns = async () => {
    const data = await fetchJson(ENDPOINTS.campaigns);
    const raw = data.campaigns || [];
    setCampaigns(toOptions(raw, "Order_key_id", "Campaign_name"));
  };

  const fetchIndustries = async () => {
    const data = await fetchJson(ENDPOINTS.industries);
    setIndustries(toOptions(data.industries || []));
  };

  const fetchCountries = async () => {
    const data = await fetchJson(ENDPOINTS.countries);
    setCountries(toOptions(data.countries || []));
  };

  const fetchJobLevels = async () => {
    const data = await fetchJson(ENDPOINTS.job_levels);
    setJobLevels(toOptions(data.job_levels || []));
  };

  const fetchJobFunctions = async () => {
    const data = await fetchJson(ENDPOINTS.job_functions);
    setJobFunctions(toOptions(data.job_functions || []));
  };

  const fetchEmployeeSizes = async () => {
    const data = await fetchJson(ENDPOINTS.employee_sizes);
    setEmployeeSizes(toOptions(data.employee_sizes || []));
  };

  const fetchRevenueSizes = async () => {
    const data = await fetchJson(ENDPOINTS.revenue_sizes);
    setRevenueSizes(toOptions(data.revenue_sizes || []));
  };

  const fetchQaStatuses = async () => { 
    const data = await fetchJson(ENDPOINTS.qa_statuses);
    setQaStatuses(toOptions(data.qa_statuses || []));
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      campaign_id: "", country: "", industry: "", job_level: "",
      job_function: "", employee_size: "", revenue_size: "", campaign_suppression: "all",
      tal_suppression: "all", qa_status: "", start_date: "", end_date: "", limit: 100
    });
    setResults([]);
    setRunInfo(null);
    setError("");
  };

  const runScoring = async () => {
    setError("");
    setLoading(true);
    try {
      const params = { page: 1 };

      if (pageSize !== "ALL") {
        params.page_size = pageSize;
      }


      if (filters.campaign_id) {
        params.order_id = filters.campaign_id;
        params.suppression = filters.campaign_suppression;
      } else {
        params.country_id = filters.country || null;
        params.industry_id = filters.industry || null;
        params.job_level_id = filters.job_level || null;
        params.job_function_id = filters.job_function || null;
        params.employee_size_id = filters.employee_size || null;
        params.revenue_size_id = filters.revenue_size || null;
        params.qa_status = filters.qa_status || null;
        params.suppression = filters.tal_suppression;
        params.start_date = filters.start_date || null;
        params.end_date = filters.end_date || null;
      }

      const res = await axios.get(ENDPOINTS.campaignLeads, { params });
      setResults(res.data.leads || []);
      setRunInfo({ total: res.data.total, total_pages: res.data.total_pages });
    } catch (err) {
      setError("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  const defaultScoring = async () => {
    setError("");
    setLoading(true);
    try {
      const params = { page: 1 };

      if (pageSize !== "ALL") {
        params.page_size = pageSize;
      }


      if (filters.campaign_id) {
        params.order_id = filters.campaign_id;
        params.suppression = filters.campaign_suppression;
      } else {
        params.country_id = filters.country || null;
        params.industry_id = filters.industry || null;
        params.job_level_id = filters.job_level || null;
        params.job_function_id = filters.job_function || null;
        params.employee_size_id = filters.employee_size || null;
        params.revenue_size_id = filters.revenue_size || null;
        params.qa_status = filters.qa_status || null;
        params.suppression = filters.tal_suppression;
        params.start_date = filters.start_date || null;
        params.end_date = filters.end_date || null;
      }

      const res = await axios.get(ENDPOINTS.campaignLeads, { params });
      setResults(res.data.leads || []);
      setRunInfo({ total: res.data.total, total_pages: res.data.total_pages });
    } catch (err) {
      setError("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid bg-light min-vh-100 py-4 px-md-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1 title-style">Lead Conversion Propensity</h3>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary px-4 fw-bold shadow-sm" onClick={runScoring} disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
            {loading ? "Scoring..." : "Run Scoring"}
          </button>
          <button className="btn btn-danger text-white btn-outline-secondary px-4 shadow-sm" onClick={()=>{clearFilters(); defaultScoring();}}>Reset</button>
        </div>
      </div>

      {error && <div className="alert alert-danger shadow-sm border-0 mb-4">{error}</div>}

      <div className="row g-4">
        {/* ================= SECTION 1: CAMPAIGN ================= */}
<div className="col-lg-3">
  <div className="card h-100 border-0 shadow-sm rounded-4">
    <div className="card-body p-4 border-start border-primary border-4 rounded-4">
      <h6 className="fw-bold text-primary mb-1">Leads As Per Campaign</h6>
      <p className="text-muted extra-small mb-3">
        Select a specific active delivery campaign
      </p>

      {/* Campaign Dropdown */}
      <label className="form-label small fw-semibold">Campaign Name</label>
      <select
        className="form-select bg-light border-0 py-2 mb-3"
        value={filters.campaign_id}
        onChange={(e) => updateFilter("campaign_id", e.target.value)}
        disabled={isAnyOtherFilterSelected}
      >
        <option value="">Choose Campaign</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>

      {/* Suppression Dropdown */}
      <label className="form-label small fw-semibold">Suppression</label>
      <select
        className="form-select bg-light border-0 py-2"
        value={filters.campaign_suppression}
        onChange={(e) => updateFilter("campaign_suppression", e.target.value)}
        disabled={!filters.campaign_id}
      >
        <option value="all">All Leads</option>
        <option value="suppressed">Suppressed Leads</option>
        <option value="not_suppressed">Unsuppressed Leads</option>
      </select>
    </div>
  </div>
</div>


        {/* ================= SECTION 2: AS PER TAL (FIRMOGRAPHICS & ENGAGEMENT) ================= */}
        <div className="col-lg-9">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4 border-start border-success border-4 rounded-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold text-success mb-0">As Per TAL (Target Account List)</h6>
                
              </div>

              <div className="row g-3">
                {/* Firmographics */}
                <div className="col-12"><small className="text-uppercase fw-bold text-muted letter-spacing-1">Demographics / Firmographics</small></div>
                <div className="col-md-3">
                  <select className="form-select form-select-sm" value={filters.country} onChange={(e) => updateFilter("country", e.target.value)} disabled={isCampaignSelected}>
                    <option value="">Country</option>
                    {countries.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <select className="form-select form-select-sm" value={filters.industry} onChange={(e) => updateFilter("industry", e.target.value)} disabled={isCampaignSelected}>
                    <option value="">Industry</option>
                    {industries.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <select className="form-select form-select-sm" value={filters.job_level} onChange={(e) => updateFilter("job_level", e.target.value)} disabled={isCampaignSelected}>
                    <option value="">Job Level</option>
                    {jobLevels.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <select className="form-select form-select-sm" value={filters.job_function} onChange={(e) => updateFilter("job_function", e.target.value)} disabled={isCampaignSelected}>
                    <option value="">Job Function</option>
                    {jobFunctions.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
                  </select>
                </div>

                {/* Company Size */}
                <div className="col-md-3">
                  <select className="form-select form-select-sm" value={filters.employee_size} onChange={(e) => updateFilter("employee_size", e.target.value)} disabled={isCampaignSelected}>
                    <option value="">Employee Size</option>
                    {employeeSizes.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <select className="form-select form-select-sm" value={filters.revenue_size} onChange={(e) => updateFilter("revenue_size", e.target.value)} disabled={isCampaignSelected}>
                    <option value="">Revenue Size</option>
                    {revenueSizes.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
                  </select>
                </div>

                {/* Sales & CRM Activity */}
                <div className="col-12 mt-3"><small className="text-uppercase fw-bold text-muted">Sales & CRM Activity / Engagement</small></div>
                <div className="col-md-3">
                  <select className="form-select form-select-sm" value={filters.qa_status} onChange={e => updateFilter("qa_status", e.target.value)} disabled={isCampaignSelected}>
                    <option value="">QA Status</option>
                    {qaStatuses.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
                  </select>
                </div>

                <div className="col-md-3">
                  <select
                    className="form-select form-select-sm"
                    value={filters.tal_suppression}
                    onChange={(e) => updateFilter("tal_suppression", e.target.value)}
                    disabled={isCampaignSelected}
                  >
                    <option value="all">All Leads</option>
                    <option value="suppressed">Supression Leads</option>
                    <option value="not_suppressed">Unsuppressed Leads</option>
                  </select>
                </div>

                <div className="col-md-3">
                  <input
                    type={filters.start_date ? "date" : "text"} // Switch to date if a value exists
                    className="form-control form-control-sm"
                    value={filters.start_date}
                    placeholder="Start Date"
                    onFocus={(e) => (e.target.type = "date")} // Switch to date on click
                    onBlur={(e) => !filters.start_date && (e.target.type = "text")} // Switch back to text if empty
                    onChange={(e) => updateFilter("start_date", e.target.value)}
                    disabled={isCampaignSelected}
                  />
                </div>

                <div className="col-md-3">
                  <input
                    type={filters.end_date ? "date" : "text"}
                    className="form-control form-control-sm"
                    value={filters.end_date}
                    placeholder="End Date"
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => !filters.end_date && (e.target.type = "text")}
                    onChange={(e) => updateFilter("end_date", e.target.value)}
                    disabled={isCampaignSelected}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table Section */}
      <div className="mt-5">
        <div className="d-flex justify-content-between align-items-end mb-3">
          <h5 className="fw-bold mb-0">Propensity Score Results</h5>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Show</span>
            <select className="form-select form-select-sm w-auto" value={pageSize} onChange={(e) => setPageSize(e.target.value === "ALL" ? "ALL" : parseInt(e.target.value))}>
              <option value={10}>10</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <TopLeadsTable leads={results} loading={loading} pageSize={pageSize} />
        </div>
      </div>
      
    </div>
  );
}