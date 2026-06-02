import React, { useEffect, useState } from "react";
import axios from "axios";
import TopLeadsTable from "./TopLeadsTable";

export default function LeadSupressionList() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

  const ENDPOINTS = {
    suppressedLeads: `${API_BASE}/leadscores/leads/recent-suppressed-top-leads`,
  };

  useEffect(() => {
    loadSuppressedLeads();
  }, [pageSize]);

  const loadSuppressedLeads = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.get(ENDPOINTS.suppressedLeads);
      setResults(res.data.leads || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch suppressed high propensity leads");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid bg-light min-vh-100 py-4 px-md-5">

      {error && <div className="alert alert-danger shadow-sm border-0 mb-4">{error}</div>}

      <div className="mt-3">
        <div className="d-flex justify-content-between align-items-end mb-3">
          <h5 className="fw-bold mb-0">Recently Suppressed High Propensity Leads (Last 6 Months)</h5>

          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Show</span>
            <select
              className="form-select form-select-sm w-auto"
              value={pageSize}
              onChange={(e) =>
                setPageSize(e.target.value === "ALL" ? "ALL" : parseInt(e.target.value))
              }
            >
              <option value={10}>10</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
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
