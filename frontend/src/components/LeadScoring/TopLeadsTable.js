// ============================================================================
// TopLeadsTable.js
// High Propensity Leads Results Table
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 10;

export default function TopLeadsTable({
  leads = [],
  loading = false,
}) {
  const navigate = useNavigate();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [currentPage, setCurrentPage] = useState(1);

  // ==========================================================================
  // RESET PAGE ON DATA CHANGE
  // ==========================================================================

  useEffect(() => {
    setCurrentPage(1);
  }, [leads]);

  // ==========================================================================
  // SORT LEADS
  // ==========================================================================

  const sortedLeads = useMemo(() => {
    return [...leads].sort(
      (a, b) => Number(b.score || 0) - Number(a.score || 0)
    );
  }, [leads]);

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  const totalPages = Math.ceil(
    sortedLeads.length / ITEMS_PER_PAGE
  );

  const startIndex =
    (currentPage - 1) * ITEMS_PER_PAGE;

  const endIndex =
    startIndex + ITEMS_PER_PAGE;

  const currentLeads = sortedLeads.slice(
    startIndex,
    endIndex
  );

  // ==========================================================================
  // PAGINATION WINDOW
  // ==========================================================================

  const visiblePages = useMemo(() => {
    const pages = [];

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    if (start > 1) {
      pages.push(1);

      if (start > 2) {
        pages.push("...");
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const openLeadAnalysis = (leadId) => {
    window.open(
      `/leads/${leadId}`,
      "_blank"
    );
  };

  const getLeadStatus = (lead) => {
    return Boolean(lead?.Supressreason_desc);
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (loading) {
    return (
      <div className="icp-loading-overlay">
        <div className="text-center">

          <div className="icp-diamond-loader">
            <div className="icp-diamond one"></div>
            <div className="icp-diamond two"></div>
            <div className="icp-diamond three"></div>
            <div className="icp-diamond four"></div>
          </div>

          <div className="mt-3 text-muted">
            Calculating propensity scores...
          </div>

        </div>
      </div>
    );
  }

  // ==========================================================================
  // EMPTY STATE
  // ==========================================================================

  if (!sortedLeads.length) {
    return (
      <div className="text-center py-5 bg-white">
        <h6 className="text-muted mb-1">
          No Leads Found
        </h6>

        <small className="text-secondary">
          Try adjusting your filters and run scoring again.
        </small>
      </div>
    );
  }

  // ==========================================================================
  // UI
  // ==========================================================================

  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">

      {/* =============================================================== */}
      {/* TABLE */}
      {/* =============================================================== */}

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">

          <thead className="table-light">
            <tr>
              <th className="ps-4">Rank</th>
              <th className="text-center">Score</th>
              <th>Company / Geography</th>
              <th>Job Profile</th>
              <th>Industry</th>
              <th>Status</th>
              <th className="text-end pe-4">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentLeads.map((lead, index) => {
              const rank = startIndex + index + 1;
              const isSuppressed = getLeadStatus(lead);

              return (
                <tr key={`${lead.Lead_id}-${index}`}>

                  {/* Rank */}
                  <td className="ps-4 fw-bold text-muted">
                    #{rank}
                  </td>

                  {/* Score */}
                  <td className="text-center">
                    <span className="fw-bold fs-6">
                      {Number(
                        lead.score || 0
                      ).toFixed(1)}
                    </span>
                  </td>

                  {/* Company */}
                  <td>
                    <div className="fw-semibold">
                      {lead.Company_name || "—"}
                    </div>

                    <small className="text-muted">
                      {lead.country || "—"}
                    </small>
                  </td>

                  {/* Job */}
                  <td>
                    <div className="fw-semibold">
                      {lead.Job_title || "—"}
                    </div>

                    <small className="text-muted">
                      {lead.Job_level_desc || "—"}
                    </small>
                  </td>

                  {/* Industry */}
                  <td>
                    {lead.industry || "—"}
                  </td>

                  {/* Status */}
                  <td>
                    {isSuppressed ? (
                      <span className="badge bg-danger">
                        {lead.Supressreason_desc}
                      </span>
                    ) : (
                      <span className="badge bg-success">
                        Unsuppressed
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-outline-primary rounded-pill"
                      onClick={() =>
                        openLeadAnalysis(
                          lead.Lead_id
                        )
                      }
                    >
                      View Analysis
                    </button>
                  </td>

                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

      {/* =============================================================== */}
      {/* FOOTER */}
      {/* =============================================================== */}

      <div className="card-footer bg-white py-3 px-4">

        <div className="d-flex justify-content-between align-items-center">

          <div className="text-muted small">
            Showing{" "}
            <strong>
              {startIndex + 1}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(
                endIndex,
                sortedLeads.length
              )}
            </strong>{" "}
            of{" "}
            <strong>
              {sortedLeads.length}
            </strong>{" "}
            leads
          </div>

          {totalPages > 1 && (
            <ul className="pagination pagination-sm mb-0">

              <li
                className={`page-item ${
                  currentPage === 1
                    ? "disabled"
                    : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() =>
                    setCurrentPage(
                      currentPage - 1
                    )
                  }
                >
                  Previous
                </button>
              </li>

              {visiblePages.map((page, index) =>
                page === "..." ? (
                  <li
                    key={index}
                    className="page-item disabled"
                  >
                    <span className="page-link">
                      ...
                    </span>
                  </li>
                ) : (
                  <li
                    key={index}
                    className={`page-item ${
                      currentPage === page
                        ? "active"
                        : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() =>
                        setCurrentPage(page)
                      }
                    >
                      {page}
                    </button>
                  </li>
                )
              )}

              <li
                className={`page-item ${
                  currentPage === totalPages
                    ? "disabled"
                    : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() =>
                    setCurrentPage(
                      currentPage + 1
                    )
                  }
                >
                  Next
                </button>
              </li>

            </ul>
          )}

        </div>

      </div>

    </div>
  );
}