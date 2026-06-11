// ============================================================================
// LeadSupressionList.js
// Recently Suppressed High Propensity Leads
// ============================================================================

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import TopLeadsTable from "./TopLeadsTable";

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

const ENDPOINTS = {
  suppressedLeads:
    `${API_BASE}/leadscores/leads/recent-suppressed-top-leads`,
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function LeadSupressionList() {

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState(10);

  // --------------------------------------------------------------------------
  // FETCH SUPPRESSED LEADS
  // --------------------------------------------------------------------------

  const fetchSuppressedLeads = useCallback(async () => {

    setLoading(true);
    setError("");

    try {

      const response = await axios.get(
        ENDPOINTS.suppressedLeads
      );

      setResults(response.data?.leads || []);

    } catch (error) {

      console.error("Suppressed Leads Fetch Error:", error);

      setError(
        "Failed to fetch recently suppressed high propensity leads."
      );

    } finally {

      setLoading(false);
    }

  }, []);

  // --------------------------------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------------------------------

  useEffect(() => {
    fetchSuppressedLeads();
  }, [fetchSuppressedLeads, pageSize]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="container-fluid bg-light min-vh-100 py-4 px-md-5">

      {/* ================================================================ */}
      {/* ERROR MESSAGE */}
      {/* ================================================================ */}

      {error && (
        <div className="alert alert-danger shadow-sm border-0 mb-4">
          {error}
        </div>
      )}

      {/* ================================================================ */}
      {/* HEADER SECTION */}
      {/* ================================================================ */}

      <div className="mt-3">

        <div className="d-flex justify-content-between align-items-end mb-3">

          <div>
            <h5 className="fw-bold mb-1">
              Recently Suppressed High Propensity Leads
            </h5>

            <small className="text-muted">
              Showing leads suppressed within the last 6 months
            </small>
          </div>

          <div className="d-flex align-items-center gap-2">

            <span className="text-muted small">
              Show
            </span>

            <select
              className="form-select form-select-sm w-auto"
              value={pageSize}
              onChange={(e) =>
                setPageSize(
                  e.target.value === "ALL"
                    ? "ALL"
                    : parseInt(e.target.value, 10)
                )
              }
            >
              <option value={10}>10</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

          </div>
        </div>

        {/* ============================================================ */}
        {/* RESULTS TABLE */}
        {/* ============================================================ */}

        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">

          <TopLeadsTable
            leads={results}
            loading={loading}
            pageSize={pageSize}
          />

        </div>

      </div>
    </div>
  );
}