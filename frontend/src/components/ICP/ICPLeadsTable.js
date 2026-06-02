// frontend/src/components/ICP/ICPLeadsTable.js
import React from "react";
import { getICPQuadrant } from "./icpQuadrant";
import { ClipLoader } from "react-spinners";

export default function ICPLeadsTable({
  leads,
  loading,
  page,
  setPage,
  total,
  pageSize,
}) {
  const totalPages = Math.ceil(total / pageSize);
  

  // Loading UI
  // if (loading) {
  //   return (
  //     <div className="text-center py-5">
  //       <div className="spinner-border text-primary" role="status"></div>
  //       <div className="mt-2 text-muted small">
  //         Calculating ICP Scores...
          
  //       </div>
  //     </div>
  //   );
  // }
  if (loading) {
  return (
    <div className="icp-table-loader-wrapper">
      <div className="text-center">
        <div className="icp-diamond-loader">
          <div className="icp-diamond one"></div>
          <div className="icp-diamond two"></div>
          <div className="icp-diamond three"></div>
          <div className="icp-diamond four"></div>
        </div>

        {/* <div className="icp-loading-text mt-4 text-success">
           
                       Calculating <ClipLoader size={15} />
        </div> */}
      </div>
    </div>
  );
}

  // Empty UI
  if (!leads.length) {
    return (
      <div className="text-center py-5 border rounded-4 bg-white shadow-sm">
        <p className="text-muted">
          No leads found for the selected criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="bg-light text-muted small">
          <tr>
            <th className="ps-4">Rank</th>
            <th className="text-center">Propensity</th>
            <th className="text-center">ICP Score</th>
            <th>Company</th>
            <th>Job Title</th>
            <th>Industry</th>
            <th className="text-center">Quadrant</th>
            <th>Recommended Action</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((l, idx) => {
            const safePageSize = Number(pageSize);
            const rank = (page - 1) * safePageSize + idx + 1;
            const quadrant = getICPQuadrant(
            Number(l.icp_score),
            Number(l.propensity_score)
            
          );


          //-------------------------------------------------------
                      // Quadrant Priority Sort
            const sortedLeads = [...leads].sort((a, b) => {
              const quadA = getICPQuadrant(
                Number(a.icp_score),
                Number(a.propensity_score)
              );

              const quadB = getICPQuadrant(
                Number(b.icp_score),
                Number(b.propensity_score)
              );

              // Quadrant ranking order
              const quadrantPriority = {
                Q1: 1, // High ICP + High Propensity
                Q2: 2, // High ICP + Low Propensity
                Q3: 3, // Low ICP + High Propensity
                Q4: 4, // Low ICP + Low Propensity
              };

              const rankA = quadrantPriority[quadA?.quadrant] || 99;
              const rankB = quadrantPriority[quadB?.quadrant] || 99;

              // 1st Priority: Quadrant order
              if (rankA !== rankB) return rankA - rankB;

              // 2nd Priority: Higher ICP inside same quadrant
              if (Number(b.icp_score) !== Number(a.icp_score))
                return Number(b.icp_score) - Number(a.icp_score);

              // 3rd Priority: Higher Propensity inside same quadrant
              return Number(b.propensity_score) - Number(a.propensity_score);
            });

          //------------------------------------------------------- 


            return (
              <tr key={l.Lead_id}>
                <td className="ps-4 fw-bold">{rank}</td>

                <td className="text-center fw-bold">
                  {Number(l.propensity_score).toFixed(1)}
                </td>

                <td className="text-center fw-bold">
                  {Number(l.icp_score).toFixed(1)}
                </td>

                <td>
                  <div className="fw-bold">{l.Company_name || "—"}</div>
                  <div className="text-muted small">{l.country || "—"}</div>
                </td>

                <td>
                  <div className="small fw-semibold">{l.Job_title || "—"}</div>
                  <div className="text-muted small">
                    {l.Job_level_desc || "—"}
                  </div>
                </td>

                <td>{l.industry || "—"}</td>
                
                <td className="text-center">
                  <span className="badge text-dark bg-warning rounded-pill">
                    {quadrant?.quadrant || "—"}
                  </span>

                  <div className="text-muted small mt-1">
                    {quadrant?.meaning || ""}
                  </div>
                </td>

                <td className="small fw-semibold">
                  {!l.recommended_action ? (
                    "—"
                  ) : l.recommended_action.includes("Immediate") ? (
                    <span className="badge bg-success rounded-pill">
                      {l.recommended_action}
                    </span>
                  ) : l.recommended_action.includes("Nurture") ? (
                    <span className="badge bg-primary text-white rounded-pill">
                      {l.recommended_action}
                    </span>
                  )  : l.recommended_action.includes("Short-term capture ") ? (
                    <span className="badge bg-warning text-dark rounded-pill">
                      {l.recommended_action}
                    </span>):
                    l.recommended_action.includes("Cost Avoidance ") ? (
                    <span className="badge bg-danger text-dark rounded-pill">
                      {l.recommended_action}
                    </span>): (
                    <span className="badge bg-info text-dark rounded-pill">
                      {l.recommended_action}
                    </span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-warning rounded-pill"
                    onClick={() =>
                      window.open(`/icp/leads/${l.Lead_id}`, "_blank")
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center p-3">
          <span className="text-muted small">
            Page {page} of {totalPages} ({total} Leads)
          </span>

          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>

            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

