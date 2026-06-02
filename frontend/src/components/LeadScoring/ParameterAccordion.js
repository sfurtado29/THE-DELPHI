// import React, { useState } from "react";
// import axios from "axios";

// const API = process.env.REACT_APP_API_DOMAIN;

// export default function ParameterAccordion({ config, refresh }) {
//   const [open, setOpen] = useState(null);

//   const saveValues = async (parameter_id, values) => {
//     const payload = values.map(v => ({
//       parameter_id,
//       master_value_id: v.master_value_id,
//       score: v.score,
//       is_active: v.is_active
//     }));

//     await axios.put(`${API}/scoring/values`, payload);
//     refresh();
//     alert("Scores updated");
//   };

//   return (
//     <>
//       <h6>Parameter Scores</h6>

//       {config.map(p => (
//         <div key={p.parameter_id} className="mb-2">
//           <div
//             className="fw-bold cursor-pointer"
//             onClick={() =>
//               setOpen(open === p.parameter_id ? null : p.parameter_id)
//             }
//           >
//             {p.parameter_name}
//           </div>

//           {open === p.parameter_id && (
//             <div className="border p-2 mt-1">
//               {p.values.map((v, i) => (
//                 <div key={i} className="d-flex mb-1">
//                   <div className="flex-grow-1">
//                     ID: {v.master_value_id}
//                   </div>
//                   <input
//                     type="number"
//                     defaultValue={v.score}
//                     onChange={e => v.score = e.target.value}
//                     style={{ width: "80px" }}
//                   />
//                 </div>
//               ))}

//               <button
//                 className="btn btn-sm btn-success mt-2"
//                 onClick={() => saveValues(p.parameter_id, p.values)}
//               >
//                 Save
//               </button>
//             </div>
//           )}
//         </div>
//       ))}
//     </>
//   );
// }
