// frontend/src/components/LeadScoring/ScoreValuesConfig.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function ScoreValuesConfig() {
  const { parameterId } = useParams();
  const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadValues();
  }, []);

  const loadValues = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/leadscores/scoring/scoring-config/values/${parameterId}`
      );
      setValues(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load scoring values");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (id, score) => {
    setValues(prev =>
      prev.map(v =>
        v.scoring_value_id === id
          ? { ...v, score: parseInt(score) || 0 }
          : v
      )
    );
  };

  const saveValues = async () => {
    try {
      await axios.post(
        `${API_BASE}/leadscores/scoring/scoring-config/values/${parameterId}`,
        values
      );
      alert("Scores updated successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to save scores");
    }
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container mt-5">
      <div className="card shadow border-0">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Configure Raw Scores</h5>
        </div>

        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Value</th>
                <th className="text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {values.map(v => (
                <tr key={v.scoring_value_id}>
                  <td className="ps-4 fw-bold">
                    {v.master_value_name}
                  </td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="form-control text-center"
                      style={{ maxWidth: 120, margin: "auto" }}
                      value={v.score}
                      onChange={e =>
                        handleScoreChange(v.scoring_value_id, e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-footer text-end">
          <button className="btn btn-success" onClick={saveValues}>
            Save Scores
          </button>
        </div>
      </div>
    </div>
  );
}
