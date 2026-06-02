// frontend/src/components/ICP/ICPScoringConfig.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function ICPScoringConfig() {
  const { parameterId } = useParams();
  const navigate = useNavigate();
  const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parameterId) loadValues();
  }, [parameterId]);

  const loadValues = async () => {
    try {
      const res = await axios.get(`${API_BASE}/leadscores/icp/scoring/icp-config/values/${parameterId}`);
      setValues(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load ICP scoring values");
    } finally {
      setLoading(false);
    }
  };

const handleScoreChange = (id, score) => {
  setValues(prev =>
    prev.map(v =>
      v.icp_value_id === id
        ? { ...v, score: score === "" ? 0 : Number(score) }
        : v
    )
  );
};

const saveValues = async () => {
  try {
    const payload = values.map(v => ({
    icp_value_id: Number(v.icp_value_id),
    score: Number(v.score)
    }));


    console.log("Payload:", payload);

    await axios.post(
  `${API_BASE}/leadscores/icp/scoring/icp-config/values/${parameterId}`,
  payload
);
    alert("ICP scores updated successfully");
  } catch (err) {
    console.error(err.response?.data || err);
    alert("Failed to save ICP scores");
  }
};





  if (!parameterId) return <div className="text-center mt-5">Invalid Parameter</div>;
  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container mt-5">
      <div className="card shadow border-0">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Configure ICP Raw Scores</h5>
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
                <tr key={`${v.master_value_id}-${v.master_value_name}`}>
                    <td className="ps-4 fw-bold">{v.master_value_name}</td>
                    <td className="text-center">
                    <input
                        type="number"
                        className="form-control text-center"
                        style={{ maxWidth: 120, margin: "auto" }}
                        value={v.score ?? ""}
                        onChange={e => handleScoreChange(v.icp_value_id, e.target.value)}
                    />
                    </td>
                </tr>
                ))}

            </tbody>

          </table>
        </div>

        <div className="card-footer text-end">
          <button className="btn btn-success" onClick={saveValues}>
            Save ICP Scores
          </button>
        </div>
      </div>
    </div>
  );
}
