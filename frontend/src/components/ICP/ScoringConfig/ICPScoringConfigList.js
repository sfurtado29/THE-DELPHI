// frontend/src/components/ICP/ICPScoringConfigList.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function ICPScoringConfigList() {
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
      const res = await axios.get(`${API_BASE}/leadscores/icp/scoring/icp-config/parameters`);
      setParameters(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load ICP parameters");
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (id, newWeight) => {
    setParameters(prev =>
      prev.map(p => (p.parameter_id === id ? { ...p, weight: parseInt(newWeight) || 0 } : p))
    );
  };

  const saveWeights = async () => {
    const total = parameters.reduce((sum, p) => sum + p.weight, 0);
    if (total !== 100) {
      alert(`Total weight must be 100%. Current: ${total}%`);
      return;
    }
    try {
      setSaving(true);
      await axios.post(`${API_BASE}/leadscores/icp/scoring/icp-config/weights`, parameters);
      alert("ICP weights updated successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to save ICP weights");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container mt-5">
      <div className="card shadow-lg rounded-4 border-0">
        <div className="card-header bg-primary text-white d-flex justify-content-between p-4">
          <div>
            <h4 className="mb-0 fw-bold">ICP Scoring Configuration</h4>
            <small>Adjust parameter weights (Total must be 100%)</small>
          </div>
          <span className="badge text-white fs-5">
            Total: {parameters.reduce((s, p) => s + p.weight, 0)}%
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Parameter</th>
                <th className="text-center">Weight</th>
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
                      onChange={e => handleWeightChange(p.parameter_id, e.target.value)}
                    />
                  </td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => navigate(`/ICP/values/${p.parameter_id}`)}
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
          <button className="btn btn-primary px-4" onClick={saveWeights} disabled={saving}>
            {saving ? "Saving..." : "Save Weights"}
          </button>
        </div>
      </div>
    </div>
  );
}
