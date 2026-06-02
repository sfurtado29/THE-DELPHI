import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";

export default function TopLeadsTable({ leads = [], loading, pageSize }) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerSubPage = 10; 

  useEffect(() => {
    setCurrentPage(1);
  }, [leads, pageSize]);

  if (loading) {
    return (
      <div className="text-center py-5">
        {/* <div className="spinner-border text-primary" role="status"></div> */}
        {/* <div className="mt-2 text-muted small">Calculating Propensity Scores...</div> */}
        {loading && (
        <div className="icp-loading-overlay">
          <div className="text-center">
            <div className="icp-diamond-loader">
              <div className="icp-diamond one"></div>
              <div className="icp-diamond two"></div>
              <div className="icp-diamond three"></div>
              <div className="icp-diamond four"></div>
            </div>

           
          </div>
        </div>
      )}
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="text-center py-5 border rounded-4 bg-white shadow-sm">
        <p className="text-muted">No leads found for the selected criteria.</p>
      </div>
    );
  }

  const sortedLeads = [...leads].sort((a, b) => (b.score || 0) - (a.score || 0));

  const totalPages = Math.ceil(sortedLeads.length / itemsPerSubPage);
  const indexOfLastItem = currentPage * itemsPerSubPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerSubPage;
  const currentItems = sortedLeads.slice(indexOfFirstItem, indexOfLastItem);

  const getPages = () => {
    const pages = [];
    const window = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };
  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mt-3">
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="bg-light text-muted small">
            <tr>
              <th className="ps-4 py-3 border-0">RANK</th>
              <th className="py-3 border-0 text-center">SCORE</th>
              <th className="py-3 border-0">COMPANY / GEO</th>
              <th className="py-3 border-0">JOB PROFILE</th>
              <th className="py-3 border-0">INDUSTRY</th>
              <th className="py-3 border-0">STATUS</th>
              <th className="py-3 border-0 text-end pe-4">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((l, i) => {
              const rank = indexOfFirstItem + i + 1;
              const isSuppressed = !!l.Supressreason_desc;  
              return (
                <tr key={`${l.Lead_id}-${i}`}>
                  <td className="ps-4 fw-bold text-muted">{rank}</td>
                  <td className="text-center fw-bold">{Number(l.score || 0).toFixed(1)}</td>
                  <td>
                    <div className="fw-bold">{l.Company_name}</div>
                    <div className="text-muted small">{l.country}</div>
                  </td>
                  <td>
                    <div className="small fw-semibold">{l.Job_title || "—"}</div>
                    <div className="text-muted extra-small">{l.Job_level_desc}</div>
                  </td>

                  <td>{l.industry || "—"}</td>

                   <td>
                    {isSuppressed ? (
                      <span className="badge bg-danger">
                        {l.Supressreason_desc}
                      </span>
                    ) : (
                      <span className="badge bg-success">Unsuppressed</span>
                    )}
                  </td>

                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-outline-primary rounded-pill"
                      onClick={() => window.open(`/leads/${l.Lead_id}`, "_blank")}
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

      <div className="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center">
        <div className="text-muted small">
          Showing <strong>{indexOfFirstItem + 1}</strong> to{" "}
          <strong>{Math.min(indexOfLastItem, sortedLeads.length)}</strong> of{" "}
          <strong>{sortedLeads.length}</strong> leads
        </div>

        {totalPages > 1 && (
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>
                  Previous
                </button>
              </li>

              {getPages().map((p, i) =>
                p === "..." ? (
                  <li key={i} className="page-item disabled">
                    <span className="page-link">…</span>
                  </li>
                ) : (
                  <li key={i} className={`page-item ${currentPage === p ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p)}>
                      {p}
                    </button>
                  </li>
                )
              )}

              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
