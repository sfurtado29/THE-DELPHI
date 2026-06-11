// frontend/src/components/LeadScoring/LeadDetail.js

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_BASE = (
  process.env.REACT_APP_API_DOMAIN || ""
).replace(/\/$/, "");

export default function LeadDetail() {
  const { leadId } = useParams();

  const [lead, setLead] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // Fetch Lead Details
  // =====================================================

  const fetchLeadDetail = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await axios.get(
        `${API_BASE}/leadscores/leads/lead-detail/${leadId}`
      );

      setLead(data.lead || null);
      setBreakdown(data.score_breakdown || []);
    } catch (err) {
      console.error("Lead Detail Error:", err);
      setError("Failed to load lead details");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLeadDetail();
  }, [fetchLeadDetail]);

  // =====================================================
  // Helpers
  // =====================================================

  const getSubParameterValue = (criteria) => {
    if (!lead || !criteria) return "—";

    const key = criteria.toLowerCase();

    const mapping = {
      "job level": lead.Job_level_desc,
      function: lead.Jobfunction_desc,
      employee: lead.Employee_size_desc,
      revenue: lead.Revenue_size_desc,
      country: lead.country,
      industry: lead.industry,
      audit: lead.qa_status,
      "lead type": lead.Leadtype_desc,
      "call rating": lead.QAcallrating_desc,
      primary: lead.QAprimaryreason_desc,
    };

    const matched = Object.keys(mapping).find((k) =>
      key.includes(k)
    );

    return matched ? mapping[matched] : "—";
  };

  const totalWeight = breakdown.reduce(
    (sum, item) => sum + Number(item.weight || 0),
    0
  );

  const totalScore = breakdown.reduce(
    (sum, item) => sum + Number(item.weighted_score || 0),
    0
  );

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  // =====================================================
  // Loading / Error States
  // =====================================================

  if (loading) {
    return (
      <div className="p-4 text-center">
        Loading lead details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="alert alert-warning">
        Lead not found
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="container mt-4">

      {/* ================================================= */}
      {/* Lead Information */}
      {/* ================================================= */}

      <div className="card mb-4 shadow-sm border-0">
        <div className="card-body">

          <h4 className="fw-bold mb-1">
            {lead.name}
          </h4>

          <p className="text-muted mb-3">
            {lead.Email_id}
          </p>

          <div className="row g-2">

            <div className="col-md-4">
              <strong>Campaign ID:</strong>{" "}
              {lead.campaign_id || "—"}
            </div>

            <div className="col-md-4">
              <strong>Order ID:</strong>{" "}
              {lead.order_id || "—"}
            </div>

            <div className="col-md-4">
              <strong>Job Title:</strong>{" "}
              {lead.Job_title}
            </div>

            <div className="col-md-4">
              <strong>Job Level:</strong>{" "}
              {lead.Job_level_desc}
            </div>

            <div className="col-md-4">
              <strong>Phone:</strong>{" "}
              {lead.Phone_number || "—"}
            </div>

            <div className="col-md-4">
              <strong>Industry:</strong>{" "}
              {lead.industry}
            </div>

            <div className="col-md-4">
              <strong>Country:</strong>{" "}
              {lead.country}
            </div>

            <div className="col-md-4">
              <strong>Job Function:</strong>{" "}
              {lead.Jobfunction_desc}
            </div>

            <div className="col-md-4">
              <strong>Revenue Size:</strong>{" "}
              {lead.Revenue_size_desc}
            </div>

            <div className="col-md-4">
              <strong>Employee Size:</strong>{" "}
              {lead.Employee_size_desc}
            </div>

            {/* ============================================ */}
            {/* Suppression Information */}
            {/* ============================================ */}

            {lead.Supressreason_desc && (
              <>
                <div className="col-md-4 mt-2">
                  <strong>Suppressed Status:</strong>{" "}
                  <span className="badge bg-danger">
                    Suppressed
                  </span>
                </div>

                <div className="col-md-4 mt-2">
                  <strong>Suppressed Reason:</strong>{" "}
                  <span className="badge bg-warning text-dark">
                    {lead.Supressreason_desc}
                  </span>
                </div>

                <div className="col-md-4 mt-2">
                  <strong>Suppressed On:</strong>{" "}
                  {formatDate(lead.suppressed_on_dt)}
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* Scoring Tables */}
      {/* ================================================= */}

      <div className="row g-4">

        {/* ============================================ */}
        {/* Scoring Weights */}
        {/* ============================================ */}

        <div className="col-lg-4">
          <div className="card shadow-sm border-0 h-100 overflow-hidden">

            <div className="card-header bg-dark text-white py-3">
              <h6 className="mb-0 fw-bold">
                Scoring Weights
              </h6>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">

                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="ps-3">Parameter</th>
                    <th className="text-center">Weight</th>
                  </tr>
                </thead>

                <tbody>
                  {breakdown.map((item, index) => (
                    <tr key={index}>
                      <td className="ps-3 small fw-medium">
                        {item.parameter_name}
                      </td>

                      <td className="text-center fw-bold text-secondary">
                        {item.weight}%
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="table-light fw-bold">
                  <tr>
                    <td className="ps-3">
                      Total Weight
                    </td>

                    <td className="text-center">
                      {totalWeight}%
                    </td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* Calculation Logic */}
        {/* ============================================ */}

        <div className="col-lg-8">
          <div className="card shadow-sm border-0 h-100 overflow-hidden">

            <div className="card-header bg-primary text-white py-3">
              <h6 className="mb-0 fw-bold">
                Calculation Logic
              </h6>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">

                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="ps-3">Parameter</th>
                    <th className="text-center">Score</th>
                    <th className="text-center">Calculation</th>
                    <th className="text-end pe-3">
                      Weighted Value
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {breakdown.map((item, index) => (
                    <tr key={index}>
                      <td className="ps-3">

                        <div className="fw-bold text-dark">
                          {item.parameter_name}
                        </div>

                        <div
                          className="text-muted small"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {getSubParameterValue(
                            item.parameter_name
                          )}
                        </div>

                      </td>

                      <td className="text-center">
                        <span className="badge bg-light text-primary border border-primary-subtle px-3">
                          {item.raw_score}
                        </span>
                      </td>

                      <td className="text-center text-muted small">
                        {item.raw_score} × {item.weight}%
                      </td>

                      <td className="text-end fw-bold text-primary pe-3">
                        {Number(
                          item.weighted_score
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="table-primary">
                    <td
                      colSpan="3"
                      className="text-end fw-bold py-3"
                    >
                      Total Scored:
                    </td>

                    <td className="text-end fw-bold text-primary pe-3 fs-5">
                      {totalScore.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}