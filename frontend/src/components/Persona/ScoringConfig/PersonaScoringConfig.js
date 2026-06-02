import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function PersonaScoringConfig() {

  const { parameterId } = useParams();

  const API_BASE = (process.env.REACT_APP_API_DOMAIN || "").replace(/\/$/, "");

  const [values,setValues] = useState([]);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    loadValues();
  },[parameterId]);


  const loadValues = async ()=>{

    const res = await axios.get(
      `${API_BASE}/leadscores/persona/persona-config/values/${parameterId}`
    );

    setValues(res.data);

    setLoading(false);
  };


  const handleScoreChange = (id,score)=>{

    setValues(prev=>
      prev.map(v=>
        v.persona_value_id===id
        ? {...v,score:Number(score)}
        : v
      )
    );
  };


  const saveValues = async ()=>{

    const payload = values.map(v=>({
      persona_value_id:v.persona_value_id,
      score:v.score
    }));

    await axios.post(
      `${API_BASE}/leadscores/persona/persona-config/values/${parameterId}`,
      payload
    );

    alert("Scores updated");
  };


  if(loading) return <div>Loading...</div>;

  return(

    <div className="container mt-5">

      <div className="card">

        <div className="card-header bg-primary text-white">
          Configure Persona Scores
        </div>

        <table className="table">

          <thead>
            <tr>
              <th>Value</th>
              <th>Score</th>
            </tr>
          </thead>

          <tbody>

            {values.map(v=>(

              <tr key={v.persona_value_id}>

                <td>{v.master_value_name || v.master_value }</td>

                <td style={{width:"150px"}}>

                  <input
                    type="number"
                    className="form-control"
                    value={v.score}
                    onChange={(e)=>handleScoreChange(v.persona_value_id,e.target.value)}
                  />

                </td>

              </tr>

            ))}

          </tbody>

        </table>

        <div className="card-footer text-end">

          <button
            className="btn btn-success"
            onClick={saveValues}
          >
            Save Scores
          </button>

        </div>

      </div>

    </div>
  );
}