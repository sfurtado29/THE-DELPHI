// frontend/src/components/ICP/ICPScoringConfigList.js

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function ICPScoringConfigList() {
  const navigate = useNavigate();

  const API_BASE = (
    process.env.REACT_APP_API_DOMAIN || ""
  ).replace(/\/$/, "");

  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadParameters();
  }, []);

  const loadParameters = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/leadscores/icp/scoring/icp-config/parameters`
      );

      setParameters(response.data || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load ICP parameters");
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (parameterId, weight) => {
    setParameters((prevParameters) =>
      prevParameters.map((parameter) =>
        parameter.parameter_id === parameterId
          ? {
              ...parameter,
              weight: parseInt(weight, 10) || 0,
            }
          : parameter
      )
    );
  };

  const saveWeights = async () => {
    const totalWeight = parameters.reduce(
      (sum, parameter) => sum + parameter.weight,
      0
    );

    if (totalWeight !== 100) {
      alert(
        `Total weight must be 100%. Current: ${totalWeight}%`
      );
      return;
    }

    try {
      setSaving(true);

      await axios.post(
        `${API_BASE}/leadscores/icp/scoring/icp-config/weights`,
        parameters
      );

      alert("ICP weights updated successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to save ICP weights");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="card shadow-lg rounded-4 border-0">
        <div className="card-header bg-primary text-white d-flex justify-content-between p-4">
          <div>
            <h4 className="mb-0 fw-bold">
              ICP Scoring Configuration
            </h4>

            <small>
              Adjust parameter weights (Total must be
              100%)
            </small>
          </div>

          <span className="badge text-white fs-5">
            Total:{" "}
            {parameters.reduce(
              (sum, parameter) =>
                sum + parameter.weight,
              0
            )}
            %
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
              {parameters.map((parameter) => (
                <tr key={parameter.parameter_id}>
                  <td className="ps-4">
                    <strong>
                      {parameter.parameter_name}
                    </strong>

                    <div className="small text-muted">
                      {parameter.parameter_code}
                    </div>
                  </td>

                  <td className="text-center">
                    <input
                      type="number"
                      className="form-control text-center fw-bold"
                      style={{
                        maxWidth: "100px",
                        margin: "auto",
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

                  <td className="text-end pe-4">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() =>
                        navigate(
                          `/ICP/values/${parameter.parameter_id}`
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

        <div className="card-footer text-end">
          <button
            className="btn btn-primary px-4"
            onClick={saveWeights}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Weights"}
          </button>
        </div>
      </div>
    </div>
  );
}