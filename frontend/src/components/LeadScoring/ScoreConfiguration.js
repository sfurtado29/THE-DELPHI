// ============================================================================
// ScoreConfiguration.js
// Lead Scoring Configuration Management
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ScoreConfiguration() {
  const navigate = useNavigate();

  // ==========================================================================
  // CONFIG
  // ==========================================================================

  const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

  const API_ENDPOINTS = {
    PARAMETERS: `${API_BASE}/leadscores/scoring/scoring-config/parameters`,
    SAVE_WEIGHTS: `${API_BASE}/leadscores/scoring/scoring-config/weights`,
  };

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ==========================================================================
  // CALCULATED VALUES
  // ==========================================================================

  const totalWeight = useMemo(() => {
    return parameters.reduce(
      (total, parameter) => total + Number(parameter.weight || 0),
      0
    );
  }, [parameters]);

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  useEffect(() => {
    fetchScoringParameters();
  }, []);

  // ==========================================================================
  // API CALLS
  // ==========================================================================

  const fetchScoringParameters = async () => {
    try {
      setLoading(true);

      const response = await axios.get(API_ENDPOINTS.PARAMETERS);

      setParameters(response.data || []);
    } catch (error) {
      console.error("Failed to load parameters:", error);
      alert("Unable to load scoring parameters.");
    } finally {
      setLoading(false);
    }
  };

  const saveWeights = async () => {
    if (totalWeight !== 100) {
      alert(
        `Total weight must equal 100%. Current total is ${totalWeight}%.`
      );
      return;
    }

    try {
      setSaving(true);

      const payload = parameters.map((parameter) => ({
        parameter_id: parameter.parameter_id,
        weight: Number(parameter.weight),
      }));

      await axios.post(API_ENDPOINTS.SAVE_WEIGHTS, payload);

      alert("Scoring weights updated successfully.");
    } catch (error) {
      console.error("Failed to save weights:", error);
      alert("Failed to save scoring weights.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleWeightChange = (parameterId, value) => {
    const weight = Number(value) || 0;

    setParameters((previous) =>
      previous.map((parameter) =>
        parameter.parameter_id === parameterId
          ? { ...parameter, weight }
          : parameter
      )
    );
  };

  const openValueConfiguration = (parameterId) => {
    navigate(`/ScoreConfiguration/values/${parameterId}`);
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div
            className="spinner-border text-primary mb-3"
            role="status"
          />
          <h6 className="text-muted">Loading scoring configuration...</h6>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // UI
  // ==========================================================================

  return (
    <div className="container py-5">
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden">

        {/* =============================================================== */}
        {/* HEADER */}
        {/* =============================================================== */}

        <div className="card-header bg-primary text-white p-4">
          <div className="d-flex justify-content-between align-items-center">

            <div>
              <h4 className="fw-bold mb-1">
                Lead Scoring Configuration
              </h4>

              <small className="opacity-75">
                Configure scoring parameter weights.
                Total weight must equal 100%.
              </small>
            </div>

            <div>
              <span
                className={`badge fs-6 px-3 py-2 ${
                  totalWeight === 100
                    ? "bg-success"
                    : "bg-warning text-dark"
                }`}
              >
                Total: {totalWeight}%
              </span>
            </div>

          </div>
        </div>

        {/* =============================================================== */}
        {/* TABLE */}
        {/* =============================================================== */}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">

            <thead className="table-light">
              <tr>
                <th className="ps-4">Parameter</th>
                <th className="text-center" width="180">
                  Weight (%)
                </th>
                <th className="text-end pe-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {parameters.map((parameter) => (
                <tr key={parameter.parameter_id}>

                  {/* Parameter Info */}
                  <td className="ps-4">
                    <div className="fw-semibold">
                      {parameter.parameter_name}
                    </div>

                    <small className="text-muted">
                      {parameter.parameter_code}
                    </small>
                  </td>

                  {/* Weight Input */}
                  <td className="text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-control text-center fw-bold"
                      style={{
                        maxWidth: "110px",
                        margin: "0 auto",
                      }}
                      value={parameter.weight}
                      onChange={(e) =>
                        handleWeightChange(
                          parameter.parameter_id,
                          e.target.value
                        )
                      }
                    />
                  </td>

                  {/* Configure Button */}
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() =>
                        openValueConfiguration(
                          parameter.parameter_id
                        )
                      }
                    >
                      Configure Values
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>

        {/* =============================================================== */}
        {/* FOOTER */}
        {/* =============================================================== */}

        <div className="card-footer bg-white py-3">
          <div className="d-flex justify-content-end">

            <button
              className="btn btn-primary px-4"
              onClick={saveWeights}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  />
                  Saving...
                </>
              ) : (
                "Save Weights"
              )}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}