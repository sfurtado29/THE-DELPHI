import React from "react";

export default function ScoreBreakdownTable({ title, rows }) {
  // Total weighted score
  const total = rows.reduce(
    (sum, r) => sum + Number(r.weighted_score || 0),
    0
  );

  return (
    <div className="card shadow-sm border-0 rounded-4 p-4">
      <h5 className="fw-bold mb-3">{title}</h5>

      {rows.length === 0 ? (
        <p className="text-muted">No breakdown available</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            {/* Header */}
            <thead className="table-light">
              <tr>
                <th>Parameter</th>
                <th className="text-center">Score</th>
                <th className="text-center">Calculation</th>
                <th className="text-end">Weighted Value</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {/* Parameter */}
                  <td>
                    <b>{r.parameter_name}</b>
                  </td>

                  {/* Raw Score */}
                  <td className="text-center">
                    <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-3">
                      {r.raw_score ?? "-"}
                    </span>
                  </td>

                  {/* Calculation */}
                  <td className="text-center text-muted">
                    {r.raw_score ?? 0} × {r.weight ?? 0}%
                  </td>

                  {/* Weighted Score */}
                  <td className="text-end fw-bold text-primary">
                    {Number(r.weighted_score).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Footer Total */}
            <tfoot>
              <tr>
                <td colSpan="3" className="text-end fw-bold">
                  Total Scored:
                </td>
                <td className="text-end fw-bold text-success">
                  {total.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
