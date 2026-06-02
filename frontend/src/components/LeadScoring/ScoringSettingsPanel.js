// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import WeightEditor from "./WeightEditor";
// import ParameterAccordion from "./ParameterAccordion";

// const API = process.env.REACT_APP_API_DOMAIN;

// export default function ScoringSettingsPanel() {
//   const [config, setConfig] = useState([]);

//   useEffect(() => {
//     fetchConfig();
//   }, []);

//   const fetchConfig = async () => {
//     const res = await axios.get(`${API}/scoring/config`);
//     setConfig(res.data.parameters);
//   };

//   return (
//     <div className="card">
//       <div className="card-header fw-bold">
//         Scoring Settings
//       </div>

//       <div className="card-body">
//         <WeightEditor config={config} refresh={fetchConfig} />
//         <hr />
//         <ParameterAccordion config={config} refresh={fetchConfig} />
//       </div>
//     </div>
//   );
// }
