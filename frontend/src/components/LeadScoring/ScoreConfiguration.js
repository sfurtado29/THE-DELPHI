// frontend/src/components/LeadScoring/ScoreConfiguration.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ScoreConfiguration() {
  const navigate = useNavigate();
  const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadParameters();
  }, []);

  const loadParameters = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/leadscores/scoring/scoring-config/parameters`
      );
      setParameters(res.data);
    } catch {
      alert("Failed to load scoring parameters");
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (id, newWeight) => {
    setParameters(prev =>
      prev.map(p =>
        p.parameter_id === id ? { ...p, weight: parseInt(newWeight) || 0 } : p
      )
    );
  };

  const handleSaveWeights = async () => {
    const totalWeight = parameters.reduce((sum, p) => sum + p.weight, 0);
    if (totalWeight !== 100) {
      alert(`Total weight must be 100%. Current: ${totalWeight}%`);
      return;
    }

    try {
      setSaving(true);
      await axios.post(
        `${API_BASE}/leadscores/scoring/scoring-config/weights`,
        parameters.map(p => ({
          parameter_id: p.parameter_id,
          weight: p.weight
        }))
      );
      alert("Weights updated successfully");
    } catch {
      alert("Failed to save weights");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container mt-5">
      <div className="card shadow-lg border-0 rounded-4">
        <div className="card-header bg-primary text-white p-4 d-flex justify-content-between">
          <div>
            <h4 className="fw-bold mb-0">Lead Scoring Configuration</h4>
            <small>Adjust parameter weights (Total must be 100%)</small>
          </div>
          <span className="badge  text-white fs-5">
            Total: {parameters.reduce((s, p) => s + p.weight, 0)}%
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Parameter</th>
                <th className="text-center">Weight </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {parameters.map(p => (
                <tr key={p.parameter_id}>
                  <td className="ps-4">
                    <strong>{p.parameter_name}</strong>
                    <div className="small text-muted">{p.parameter_code}</div>
                  </td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="form-control text-center fw-bold"
                      style={{ maxWidth: 100, margin: "auto" }}
                      value={p.weight}
                      onChange={e =>
                        handleWeightChange(p.parameter_id, e.target.value)
                      }
                    />
                  </td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() =>
                        navigate(`/ScoreConfiguration/values/${p.parameter_id}`)
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

        <div className="card-footer text-end">
          <button
            className="btn btn-primary px-4"
            onClick={handleSaveWeights}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Weights"}
          </button>
        </div>
      </div>
    </div>
  );
}
