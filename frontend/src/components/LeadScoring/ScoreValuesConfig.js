// ============================================================================
// ScoreValuesConfig.js
// Configure Raw Scores For Scoring Parameters
// ============================================================================

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function ScoreValuesConfig() {
  // ==========================================================================
  // ROUTE PARAMS
  // ==========================================================================

  const { parameterId } = useParams();

  // ==========================================================================
  // CONFIG
  // ==========================================================================

  const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

  const API_ENDPOINTS = {
    GET_VALUES: `${API_BASE}/leadscores/scoring/scoring-config/values/${parameterId}`,
    SAVE_VALUES: `${API_BASE}/leadscores/scoring/scoring-config/values/${parameterId}`,
  };

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [scoreValues, setScoreValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  useEffect(() => {
    fetchScoreValues();
  }, []);

  // ==========================================================================
  // API CALLS
  // ==========================================================================

  const fetchScoreValues = async () => {
    try {
      setLoading(true);

      const response = await axios.get(API_ENDPOINTS.GET_VALUES);

      setScoreValues(response.data || []);
    } catch (error) {
      console.error("Failed to load score values:", error);
      alert("Unable to load score values.");
    } finally {
      setLoading(false);
    }
  };

  const saveScoreValues = async () => {
    try {
      setSaving(true);

      await axios.post(
        API_ENDPOINTS.SAVE_VALUES,
        scoreValues
      );

      alert("Score values updated successfully.");
    } catch (error) {
      console.error("Failed to save score values:", error);
      alert("Failed to save score values.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleScoreChange = (valueId, newScore) => {
    const score = Number(newScore) || 0;

    setScoreValues((previousValues) =>
      previousValues.map((item) =>
        item.scoring_value_id === valueId
          ? {
              ...item,
              score,
            }
          : item
      )
    );
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
          <h6 className="text-muted">
            Loading scoring values...
          </h6>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // UI
  // ==========================================================================

  return (
    <div className="container py-5">
      <div className="card shadow-lg border-0 rounded-4 overflow-hidden">

        {/* =============================================================== */}
        {/* HEADER */}
        {/* =============================================================== */}

        <div className="card-header bg-success text-white p-4">
          <div>
            <h4 className="fw-bold mb-1">
              Configure Raw Scores
            </h4>

            <small className="opacity-75">
              Manage scoring values used during lead score calculations.
            </small>
          </div>
        </div>

        {/* =============================================================== */}
        {/* TABLE */}
        {/* =============================================================== */}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">

            <thead className="table-light">
              <tr>
                <th className="ps-4">
                  Value Name
                </th>

                <th
                  className="text-center"
                  width="200"
                >
                  Raw Score
                </th>
              </tr>
            </thead>

            <tbody>
              {scoreValues.map((value) => (
                <tr key={value.scoring_value_id}>

                  {/* Value Name */}
                  <td className="ps-4">
                    <div className="fw-semibold">
                      {value.master_value_name}
                    </div>
                  </td>

                  {/* Score Input */}
                  <td className="text-center">
                    <input
                      type="number"
                      min="0"
                      className="form-control text-center fw-bold"
                      style={{
                        maxWidth: "120px",
                        margin: "0 auto",
                      }}
                      value={value.score}
                      onChange={(e) =>
                        handleScoreChange(
                          value.scoring_value_id,
                          e.target.value
                        )
                      }
                    />
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
              className="btn btn-success px-4"
              onClick={saveScoreValues}
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
                "Save Scores"
              )}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}