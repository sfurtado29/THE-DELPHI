import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function PersonaScoringConfigList() {

  const navigate = useNavigate();
  const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadParameters();
  }, []);

  const loadParameters = async () => {
    const res = await axios.get(`${API_BASE}/leadscores/persona/persona-config/parameters`);
    setParameters(res.data);
    setLoading(false);
  };

  const handleWeightChange = (id, weight) => {
    setParameters(prev =>
      prev.map(p =>
        p.parameter_id === id
          ? { ...p, weight: parseInt(weight) || 0 }
          : p
      )
    );
  };

  const saveWeights = async () => {

    const payload = parameters.map(p => ({
      parameter_id: p.parameter_id,
      weight: p.weight
    }));

    const total = payload.reduce((s, p) => s + p.weight, 0);

    if (total !== 100) {
      alert("Total weight must be 100%");
      return;
    }

    setSaving(true);

    await axios.post(
      `${API_BASE}/leadscores/persona/persona-config/weights`,
      payload
    );

    alert("Weights updated");

    setSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mt-5">
      <div className="card shadow-lg rounded-4 border-0">
        <div className="card-header bg-primary text-white d-flex justify-content-between p-4">
          <div>
            <h4 className="mb-0 fw-bold">Persona Scoring Configuration</h4>
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

                <td>
                  {p.parameter_name}
                </td>

                <td style={{width:"150px"}}>

                  <input
                    type="number"
                    className="form-control"
                    value={p.weight}
                    onChange={(e)=>handleWeightChange(p.parameter_id,e.target.value)}
                  />

                </td>

                <td className="text-end pe-4">

                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={()=>navigate(`/persona/values/${p.parameter_id}`)}
                  >
                    Configure Values
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

        <div className="card-footer text-end">

          <button
            className="btn btn-primary"
            disabled={saving}
            onClick={saveWeights}
          >
            Save Weights
          </button>

        </div>

      </div>

    </div>
     </div>
  );
}