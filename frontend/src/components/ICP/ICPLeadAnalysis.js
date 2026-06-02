// frontend/src/components/ICP/ICPLeadAnalysis.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getICPQuadrant } from "./icpQuadrant";
import ICPQuadrantChart from "./ICPQuadrantChart";
import ScoreBreakdownTable from "./ScoreBreakdownTable";
import "../../styles/common.css";
import { ClipLoader } from "react-spinners";


const API_BASE = (process.env.REACT_APP_API_DOMAIN || "http://localhost:8000")
  .replace(/\/$/, "");


export default function ICPLeadAnalysis() { 
  const { leadId } = useParams();

  const [analysis, setAnalysis] = useState(null);
  const [leadDetail, setLeadDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPopupOpen, setPopupOpen]=useState(false);
  const [isPropensityPopupOpen, setPropensityPopupOpen]=useState(false);
  const [isICPPopupOpen, setICPPopupOpen]=useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE}/leadscores/scoring/icp/leads/${leadId}/analysis`)
      .then((res) => {
  console.log("FULL ANALYSIS RESPONSE:", res.data);
  setAnalysis(res.data);
})
      .finally(() => setLoading(false));
  }, [leadId]);

  const QuadrantPopupUI = () => {
    if (!isPopupOpen) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.55)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            background: "#fff",
            width: "85%",
            maxWidth: "900px",
            borderRadius: "15px",
            padding: "25px",
            boxShadow: "0px 5px 20px rgba(0,0,0,0.25)",
          }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="fw-bold">Quadrants & Outcomes Info</h4>

            {/* Close Button */}
            <button
              onClick={() => setPopupOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "20px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ✖
            </button>
          </div>

          {/* Table */}
          <div className="table-responsive mt-3">
            <table className="table table-bordered text-center align-middle">
              <thead className="table-light">
                <tr>
                  <th>Quadrant</th>
                  <th>ICP</th>
                  <th>Propensity</th>
                  <th>Meaning</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>
                    <b>Q1: Strategic Wins</b>
                  </td>
                  <td>High</td>
                  <td>High</td>
                  <td>Perfect customers, ready to buy</td>
                  <td>Immediate sales focus / Revenue</td>
                </tr>

                <tr>
                  <td>
                    <b>Q2: Future Growth</b>
                  </td>
                  <td>High</td>
                  <td>Low</td>
                  <td>Right customers, not ready yet</td>
                  <td>Nurture, educate</td>
                </tr>

                <tr>
                  <td>
                    <b>Q3: Opportunistic</b>
                  </td>
                  <td>Low</td>
                  <td>High</td>
                  <td>Wrong fit but buying</td>
                  <td>Short-term capture / Tactical wins</td>
                </tr>

                <tr>
                  <td>
                    <b>Q4: Noise</b>
                  </td>
                  <td>Low</td>
                  <td>Low</td>
                  <td>Poor fit, low intent</td>
                  <td>De-prioritize / Cost avoidance</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quadrant Boxes Format */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
              marginTop: "25px",
            }}
          >
            {/* Q2 */}
            <div
              style={{
                background: "#cce5ff",
                padding: "18px",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <h6 className="fw-bold">Q2 BEST FIT_EDUCATE/NURTURE</h6>
              <p className="mb-1">High ICP + Low Propensity</p>
              <small>Ideal targets but less immediate interest</small>
              <br/>
              <small>{'->'} Nurture, educate further, warm up interest</small>
            </div>

            {/* Q1 */}
            <div
              style={{
                background: "#d4edda",
                padding: "18px",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <h6 className="fw-bold">Q1 Golden Opportunities</h6>
              <p className="mb-1">High ICP + High Propensity</p>
              <small>ICP-matching leads very linkely to convert</small>
              <br/>
              <small>{'->'} Engage immediately, priority treatment</small>
              <br/>
              <small>{'->'} Target action: Archive/ fnsie to take care</small>
            </div>

            {/* Q4 */}
            <div
              style={{
                background: "#f8d7da",
                padding: "18px",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <h6 className="fw-bold">Q4 LOW PRIORITY</h6>
              <p className="mb-1">Low ICP + Low Propensity</p>
              <small>Weak fit and unlickely to convert</small>
              <br/>
              <small>{'->'} Archieve or revisit long term</small>
            </div>

            {/* Q3 */}
            <div
              style={{
                background: "#fff3cd",
                padding: "18px",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <h6 className="fw-bold">Q3 HOT LEADS - NURTURE</h6>
              <p className="mb-1">Low ICP + High Propensity</p>
              <small>High interest but poor ICP match</small>
              <br/>
              <small>{'->'} Nurture with caution, respect interest</small>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PropensityScorePopupUI = () => {
    if (!isPropensityPopupOpen) return null;
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.55)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            background: "#fff",
            width: "85%",
            maxWidth: "900px",
            borderRadius: "15px",
            padding: "25px",
            boxShadow: "0px 5px 20px rgba(0,0,0,0.25)",
          }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="fw-bold">Propensity Scoring Info</h4>
            {/* Close Button */}
            <button
              onClick={() => setPropensityPopupOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "20px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ✖
            </button>
          </div>
         
          {/* <div className="table-responsive mt-3"> */}
            {/* Propensity Breakdown Table */}
        {/* <div>
            <ScoreBreakdownTable
            title="Propensity Score Calculation"
            rows={analysis.breakdown?.propensity || []}
            />
        </div> */}

            {/* Breakdown Tables */}
        <div className="row g-4">
        {/* ICP Weight Table */}
      <div className="col-md-5 ">
          <div className="card shadow-sm border-0 h-100 overflow-hidden">
            <div className="card-header fw-bold bg-dark text-white py-3">
              <h6 className="mb-0 fw-bold">Propensity Scoring Weights</h6>
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
              {analysis.breakdown?.propensity?.map((row, idx) => (
                <tr key={idx}>
                  <td  className="ps-3"><div className="fw-bold text-dark mb-0">{row.parameter_name}</div></td>
                  <td className="text-center"><span className="badge bg-light text-primary border border-primary-subtle px-3">{row.raw_score}</span></td>
                </tr>
              ))}
             </tbody>
                <tfoot className="bg-primary-subtle border-top-0">
                  <tr className="table-primary">
                    <td className="ps-3">Total Weight</td>
                    <td className="text-center">
                      {analysis.breakdown?.icp.reduce((sum, b) => sum + parseFloat(b.weight || 0), 0)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

         {/* TABLE 2: CALCULATION LOGIC */}
        <div className="col-md-7">
          <div className="card shadow-sm border-0 h-100 overflow-hidden">
            <div className="card-header fw-bold bg-dark text-white py-3">
              <h6 className="mb-0 fw-bold">Propensity Calculation Logic</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="ps-3">Parameter</th>
                    <th className="text-center">Score</th>
                    <th className="text-center">Calculation</th>
                    <th className="text-end pe-3">Weighted Value</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.breakdown?.propensity.map((b, i) => (
                    <tr key={`weighted-${i}`}>
                      <td className="ps-3">
                        <div className="font-weight-light text-dark mb-0">{b.parameter_name}</div>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-light text-primary border border-primary-subtle px-3">
                          {b.raw_score}
                        </span>
                      </td>
                      <td className="text-center text-muted small">
                        {b.raw_score} × {b.weight}%
                      </td>
                      <td className="text-end fw-bold text-primary pe-3">
                        {parseFloat(b.weighted_score).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* <tfoot className="bg-primary-subtle border-top-0">
                  <tr className="table-primary">
                    <td colSpan="3" className="text-end fw-bold ps-3 py-3">Total Scored:</td>
                    <td className="text-end fw-bold text-primary pe-3 fs-5"> */}
                      <tfoot className="bg-primary-subtle border-top-0">
                  <tr className="table-primary">
                    <td colSpan="3" className="ps-3">Total Scored:</td>
                    <td className="text-end fw-bold text-primary pe-3 fs-6">
                      {analysis.breakdown?.propensity.reduce((sum, b) => sum + parseFloat(b.weighted_score), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>


        {/* ICP Breakdown Table */}
        {/* <div className="col-md-6">
            <ScoreBreakdownTable
            title="ICP Score Calculation"
            rows={analysis.breakdown?.icp || []}
            />
        </div> */}

        </div>

          
        </div>
      </div>
    );
  };

   const ICPInfoPopupUI = () => {
  if (!isICPPopupOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          width: "90%",
          maxWidth: "1100px",
          borderRadius: "15px",
          padding: "25px",
          boxShadow: "0px 5px 20px rgba(0,0,0,0.25)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold text-primary">
            ICP Score Calculation Logic
          </h4>

          <button
            onClick={() => setICPPopupOpen(false)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "22px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ✖
          </button>
        </div>

        {/* ===================================================== */}
        {/* STEP 1: PROPENSITY FILTERING */}
        {/* ===================================================== */}
        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4">
          <h5 className="fw-bold text-dark mb-2">
            Step 1: Lead Qualification (Minimum Propensity Filter)
          </h5>

          <p className="text-muted mb-3">
            Before ICP scoring begins, Delphi ensures ICP is built only from
            <b> proven high-quality leads</b>. Leads must meet at least one rule:
          </p>

          <ul className="small">
            <li>
              <b>Propensity Score ≥ Minimum Threshold</b> (configured in system)
            </li>
            <li>
              OR Lead is:
              <b> SMTP Approved + QA Approved + Delivered + Client Accepted</b>
            </li>
          </ul>

          <div className="alert alert-info small mb-0">
            This prevents ICP scoring from including low-quality noise.
          </div>
        </div>

        {/* ===================================================== */}
        {/* STEP 2: ICP Weights and SCORE STRUCTURE */}
        {/* ===================================================== */}
        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4">
          <h5 className="fw-bold mb-2">
            Step 2: 
          </h5>

          <h5 className="fw-bold text-center mb-2">
            A. ICP Weight Structure (Out of 100%)
          </h5>

          <p className="text-muted text-center small">
            ICP Weights answers:
            <b> “How closely does this lead parameter match our best-fit customer?”</b>
          </p>

          <div className="fw-bold text-center my-3">
            ICP Score = Firmographic (0–40) + Role (0–20) + Geography (0–10) +
            Behavioral (0–20) + Intent Signals (0–10)
          </div>

          {/* Component Table */}
          <table className="table table-bordered text-center align-middle mt-3">
            <thead className="table-light">
              <tr>
                <th>Component</th>
                <th>Max Weights</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Firmographic Fit</td>
                <td>40</td>
              </tr>
              <tr>
                <td>Role Fit</td>
                <td>20</td>
              </tr>
              <tr>
                <td>Geographic Fit</td>
                <td>10</td>
              </tr>
              <tr>
                <td>Behavioral Fit</td>
                <td>20</td>
              </tr>
              <tr>
                <td>Intent & Predictive Signals</td>
                <td>10</td>
              </tr>
            </tbody>
          </table>


            <div className="fw-bold text-center mb-4">
            <h5 className="fw-bold mb-2">
            B. ICP Scoring Structure (Between 0-100)
          </h5>
          <p className="text-muted small">
            ICP Scores answers:
            <b> “How closely does this lead Sub-parameter match our best-fit customer?”</b>
          </p>

            

          {/* ===================================================== */}
{/* STEP 2: ICP Scoring Structure */}
{/* ===================================================== */}
<div className="card shadow-sm border-0 rounded-4 p-4 mb-4">

  {/* Score Formula */}
  
    ICP Score = Firmographic (0–40) + Role (0–20) + Geography (0–10) +
    Behavioral (0–20) + Intent Signals (0–10)
  </div>

  {/* ===================================================== */}
  {/* SMALL TABLE GRID */}
  {/* ===================================================== */}
  <div className="row g-3">

    {/* Industry Fit */}
    <div className="col-md-4">
      <div className="border rounded-3 p-2">
        <h6 className="fw-bold text-center small mb-2">
          Industry Fit (0–15)
        </h6>

        <table className="table table-sm table-bordered text-center mb-0 small">
          <thead className="table-light">
            <tr>
              <th>Condition</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Core ICP</td><td>15</td></tr>
            <tr><td>Adjacent</td><td>10</td></tr>
            <tr><td>Acceptable</td><td>5</td></tr>
            <tr><td>Not Target</td><td>0</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Company Size */}
    <div className="col-md-4">
      <div className="border rounded-3 p-2">
        <h6 className="fw-bold text-center small mb-2">
          Company Size (0–15)
        </h6>

        <table className="table table-sm table-bordered text-center mb-0 small">
          <thead className="table-light">
            <tr>
              <th>Range</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>ICP Sweet Spot</td><td>15</td></tr>
            <tr><td>Near ICP</td><td>10</td></tr>
            <tr><td>Edge</td><td>5</td></tr>
            <tr><td>Outside</td><td>0</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Revenue Fit */}
    <div className="col-md-4">
      <div className="border rounded-3 p-2">
        <h6 className="fw-bold text-center small mb-2">
          Revenue Fit (0–10)
        </h6>

        <table className="table table-sm table-bordered text-center mb-0 small">
          <thead className="table-light">
            <tr>
              <th>Band</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Exact ICP</td><td>10</td></tr>
            <tr><td>Close</td><td>7</td></tr>
            <tr><td>Acceptable</td><td>4</td></tr>
            <tr><td>Outside</td><td>0</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Job Function */}
    <div className="col-md-4">
      <div className="border rounded-3 p-2">
        <h6 className="fw-bold text-center small mb-2">
          Job Function (0–10)
        </h6>

        <table className="table table-sm table-bordered text-center mb-0 small">
          <thead className="table-light">
            <tr>
              <th>Function</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Buying</td><td>10</td></tr>
            <tr><td>Influencer</td><td>7</td></tr>
            <tr><td>Peripheral</td><td>3</td></tr>
            <tr><td>Irrelevant</td><td>0</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Job Level */}
    <div className="col-md-4">
      <div className="border rounded-3 p-2">
        <h6 className="fw-bold text-center small mb-2">
          Job Level (0–10)
        </h6>

        <table className="table table-sm table-bordered text-center mb-0 small">
          <thead className="table-light">
            <tr>
              <th>Level</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Decision Maker</td><td>10</td></tr>
            <tr><td>Manager</td><td>7</td></tr>
            <tr><td>Contributor</td><td>4</td></tr>
            <tr><td>Junior</td><td>0</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Geography */}
    <div className="col-md-4">
      <div className="border rounded-3 p-2">
        <h6 className="fw-bold text-center small mb-2">
          Geography Fit (0–10)
        </h6>

        <table className="table table-sm table-bordered text-center mb-0 small">
          <thead className="table-light">
            <tr>
              <th>Region</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Core Region</td><td>10</td></tr>
            <tr><td>Secondary</td><td>6</td></tr>
            <tr><td>Allowed</td><td>3</td></tr>
            <tr><td>Excluded</td><td>0</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Behavioral Fit */}
    <div className="col-md-4">
      <div className="border rounded-3 p-2">
        <h6 className="fw-bold text-center small mb-2">
          Behavioral Fit (0–20)
        </h6>

        <table className="table table-sm table-bordered text-center mb-0 small">
          <thead className="table-light">
            <tr>
              <th>Engagement</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>High</td><td>20</td></tr>
            <tr><td>Medium</td><td>10</td></tr>
            <tr><td>Low</td><td>5</td></tr>
            <tr><td>None</td><td>0</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Intent Signals */}
    <div className="col-md-4">
      <div className="border rounded-3 p-2">
        <h6 className="fw-bold text-center small mb-2">
          Intent Signals (0–10)
        </h6>

        <table className="table table-sm table-bordered text-center mb-0 small">
          <thead className="table-light">
            <tr>
              <th>Signal</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Product Interest</td><td>4</td></tr>
            <tr><td>Competitor Mention</td><td>2</td></tr>
            <tr><td>Repeated Visit</td><td>2</td></tr>
            <tr><td>Urgency</td><td>2</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</div>

          
        </div>

        

        {/* ===================================================== */}
        {/* STEP 3: BACKEND BREAKDOWN TABLE */}
        {/* ===================================================== */}
        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4">
          <h5 className="fw-bold mb-3 text-success">
            Step 3: Lead ICP Breakdown (Calculated in Backend)
          </h5>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>ICP Criteria</th>
                  <th className="text-center">Raw Score</th>
                  <th className="text-center">Weight</th>
                  <th className="text-end">Final Contribution</th>
                </tr>
              </thead>

              <tbody>
                {(analysis.breakdown?.icp || []).map((row, i) => (
                  <tr key={i}>
                    <td>{row.parameter_name}</td>
                    <td className="text-center">{row.raw_score}</td>
                    <td className="text-center">{row.weight}%</td>
                    <td className="text-end fw-bold text-primary">
                      {parseFloat(row.weighted_score).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="table-success">
                  <td colSpan="3" className="fw-bold text-end">
                    Total ICP Score
                  </td>
                  <td className="text-end fw-bold fs-5">
                    {analysis.breakdown?.icp.reduce((sum, b) => sum + parseFloat(b.weighted_score), 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ===================================================== */}
        {/* STEP 4: ICP INTERPRETATION */}
        {/* ===================================================== */}
        {/* <div className="card shadow-sm border-0 rounded-4 p-4">
          <h5 className="fw-bold mb-3">ICP Score Interpretation</h5>

          <table className="table table-bordered text-center">
            <thead className="table-light">
              <tr>
                <th>Score Range</th>
                <th>ICP Fit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>80 – 100</td>
                <td>Excellent</td>
                <td>Priority Accounts</td>
              </tr>
              <tr>
                <td>60 – 79</td>
                <td>Strong</td>
                <td>Targeted Sales</td>
              </tr>
              <tr>
                <td>40 – 59</td>
                <td>Moderate</td>
                <td>Nurture Leads</td>
              </tr>
              <tr>
                <td>&lt; 40</td>
                <td>Weak</td>
                <td>De-Prioritize</td>
              </tr>
            </tbody>
          </table>
        </div> */}
      </div>
    </div>
  );
};

  

  const getSubParameterValue = (criteria) => {
    if (!lead || !criteria) return "—";
    const c = criteria.toLowerCase();
    if (c.includes("job level")) return lead.Job_level_desc;
    if (c.includes("function")) return lead.Jobfunction_desc;
    if (c.includes("employee")) return lead.Employee_size_desc;
    if (c.includes("revenue")) return lead.Revenue_size_desc;
    if (c.includes("country")) return lead.country;
    if (c.includes("industry")) return lead.industry;
    if (c.includes("audit")) return lead.qa_status;
    if (c.includes("lead type")) return lead.Leadtype_desc;
    if (c.includes("call rating")) return lead.QAcallrating_desc;
    if (c.includes("primary")) return lead.QAprimaryreason_desc;
    return "—";
  };

  




  if (loading) {
    return <div className="p-5 text-center">{loading && (
  <div className="icp-loading-overlay">
    <div className="text-center">
      <div className="icp-diamond-loader">
        <div className="icp-diamond one"></div>
        <div className="icp-diamond two"></div>
        <div className="icp-diamond three"></div>
        <div className="icp-diamond four"></div>
      </div>

      <div className="icp-loading-text text-center text-success">
        Generating<ClipLoader size={15}/>
      </div>
    </div>
  </div>
)}</div>;
  }

  if (!analysis) {
    return <div className="p-5 text-center">Lead not found</div>;
  }

  const lead = analysis.lead;

  const quadrant = getICPQuadrant(
    lead.icp_score,
    lead.propensity_score
  );

  return (
    <div className="container py-5">

      <h3 className="fw-bold mb- title-style ">ICP Analysis Report</h3>

      {/* Quadrant Popup Render */}
      <QuadrantPopupUI />
      {/* Propensity Popup Render */}
      <PropensityScorePopupUI/>
      {/* ICP INFO Popup Render */}
      <ICPInfoPopupUI/>


      {/* Lead Info */}
    
        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4">
          <h4 className="mb-1 fw-bold">{lead.name}</h4>
          <p className="text-muted mb-3">{lead.Email_id}</p>
          <div className="row g-2">
            <div className="col-md-4"><strong>Company Name:</strong> {lead.Company_name || "—"}</div>
            <div className="col-md-4"><strong>Campaign ID:</strong> {lead.campaign_id || "—"}</div>
            <div className="col-md-4"><strong>Order ID:</strong> {lead.order_id || "—"}</div>
            <div className="col-md-4"><strong>Job Title:</strong> {lead.Job_title}</div>
            <div className="col-md-4"><strong>Job Level:</strong> {lead.Job_level_desc}</div>
            <div className="col-md-4"><strong>Phone:</strong> {lead.Phone_number || "—"}</div>
            <div className="col-md-4"><strong>Industry:</strong> {lead.industry}</div>
            <div className="col-md-4"><strong>Country:</strong> {lead.country}</div>
            <div className="col-md-4"><strong>Job Function:</strong> {lead.Jobfunction_desc}</div>
            <div className="col-md-4"><strong>Revenue Size:</strong> {lead.Revenue_size_desc}</div>
            <div className="col-md-4"><strong>Employee Size:</strong> {lead.Employee_size_desc}</div>
      </div>
      </div>
    

            {/* Breakdown Tables */}
             <div className="card shadow-sm border-0 rounded-4 p-4 mb-4">
        <div className="row g-2">
        <h5 className="fw-bold">ICP Breakdown {/* Info Icon */}
          <span
            className="px-3 text-primary"
            style={{
              cursor: "pointer",
              fontSize: "18px",
            }}
            onClick={() => setICPPopupOpen(true)}
            
            title="More info about quadrant placement"
          >
            <i className="bi bi-info-circle"></i>
          </span></h5>  
        {/* ICP Weight Table */}
      <div className="col-md-6 ">
          <div className="card shadow-sm border-0 h-100 overflow-hidden">
            <div className="card-header fw-bold bg-dark text-white py-3">
              <h6 className="mb-0 fw-bold">ICP Scoring Weights</h6>
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
              {analysis.breakdown?.icp?.map((row, idx) => (
                <tr key={idx}>
                  <td  className="ps-3"><div className="fw-bold text-dark mb-0">{row.parameter_name}</div></td>
                  <td className="text-center"><span className="badge bg-light text-primary border border-primary-subtle px-3">{row.weight}</span></td>
                </tr>
              ))}
             </tbody>
                <tfoot className="bg-primary-subtle border-top-0">
                  <tr className="table-primary">
                    <td className="ps-3">Total Weight</td>
                    <td className="text-center">
                      {analysis.breakdown?.icp.reduce((sum, b) => sum + parseFloat(b.weight || 0), 0)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

         {/* TABLE 2: CALCULATION LOGIC */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100 overflow-hidden">
            <div className="card-header fw-bold bg-dark text-white py-3">
              <h6 className="mb-0 fw-bold">ICP Calculation Logic</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="ps-3">Parameter</th>
                    <th className="text-center">Score</th>
                    <th className="text-center">Calculation</th>
                    <th className="text-end pe-3">Weighted Value</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.breakdown?.icp.map((b, i) => (
                    <tr key={`weighted-${i}`}>
                      <td className="ps-3">
                        <div className="fw-bold text-dark mb-0">{b.parameter_name}</div>
                        {/* <div className="text-muted small italic" style={{ fontSize: '0.75rem' }}>
                          {getSubParameterValue(b.parameter_name)}
                        </div> */}
                      </td>
                      <td className="text-center">
                        <span className="badge bg-light text-primary border border-primary-subtle px-3">
                          {b.raw_score}
                        </span>
                      </td>
                      <td className="text-center text-muted small">
                        {b.raw_score} × {b.weight}%
                      </td>
                      <td className="text-end fw-bold text-primary pe-3">
                        {parseFloat(b.weighted_score).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* <tfoot className="bg-primary-subtle border-top-0">
                  <tr className="table-primary">
                    <td colSpan="3" className="text-end fw-bold ps-3 py-3">Total Scored:</td>
                    <td className="text-end fw-bold text-primary pe-3 fs-5"> */}
                      <tfoot className="bg-primary-subtle border-top-0">
                  <tr className="table-primary">
                    <td colSpan="3" className="ps-3">Total Scored:</td>
                    <td className="text-end fw-bold text-primary pe-3 fs-6">
                      {analysis.breakdown?.icp.reduce((sum, b) => sum + parseFloat(b.weighted_score), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>


        {/* ICP Breakdown Table */}
        {/* <div className="col-md-6">
            <ScoreBreakdownTable
            title="ICP Score Calculation"
            rows={analysis.breakdown?.icp || []}
            />
        </div> */}

        </div>
        </div>

      {/* Quadrant Summary */}
      <div className="card shadow-sm border-0 rounded-4 p-4 mb-4">
        <h5 className="fw-bold">Quadrant Placement
          {/* Info Icon */}
          <span
            className="px-3 text-primary"
            style={{
              cursor: "pointer",
              fontSize: "18px",
            }}
            onClick={() => setPopupOpen(true)}
            
            title="More info about quadrant placement"
          >
            <i className="bi bi-info-circle"></i>
          </span>
        </h5>

        <p className="mb-1 bg-warning-subtle  px-3 py-2 rounded-3 d-inline-block ">
          <b>{quadrant.quadrant}</b>
        </p>

        <p className="text-muted">{quadrant.meaning}</p>

        <div className="alert alert-primary rounded-3">
          <b>Recommended Action:</b> {quadrant.action}
        </div>

        <div className="d-flex justify-content-between text-muted small">
          
          <span>
            ICP Score: <b>{lead.icp_score}</b>
          </span>
          <div>
             {/* Info Icon */}
          <span
            className="px-3 text-primary"
            style={{
              cursor: "pointer",
              fontSize: "18px",
            }}
            onClick={() => setPropensityPopupOpen(true)}
            
            title="More info about propensity scoring"
          >
            <i className="bi bi-info-circle"></i>
          </span>
          <span> 
            Propensity Score: <b>{lead.propensity_score}</b>
          </span>
          </div>
        </div>
      </div>

      {/* Quadrant Graph */}
      <div className="card shadow-sm border-0 rounded-4 p-4 mb-4">
        <h5 className="fw-bold">Quadrant Mapping Based on ICP and PROPENSITY Scoring</h5>

        <ICPQuadrantChart
          icp={lead.icp_score}
          propensity={lead.propensity_score}
        />
      </div>
      </div>
    
  );
}
