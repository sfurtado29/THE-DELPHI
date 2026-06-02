import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/common.css";
import { ClipLoader } from "react-spinners";

const API_BASE_URL = process.env.REACT_APP_API_DOMAIN;
const PAGE_SIZE = 10;

export default function PropensityLeadTable() {
  const navigate = useNavigate();

  const [propensityLeads, setPropensityLeads] = useState([]);
  const [propLoading, setPropLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  useEffect(() => {
    fetchPropensityLeads(currentPage);
  }, [currentPage]);

  const fetchPropensityLeads = async (page) => {
    try {
      setPropLoading(true);

      const res = await axios.get(
        `${API_BASE_URL}/dashboard/propensity`,
        {
          params: {
            page: page,
            page_size: PAGE_SIZE,
          },
        }
      );

      setPropensityLeads(res.data?.data || []);
      setTotalRecords(res.data?.total || 0);

    } catch (err) {
      console.error("Propensity API error:", err);
    } finally {
      setPropLoading(false);
    }
  };

  return (
    <>
      <h5 className="fw-bold mb-1">Propensity Leads</h5>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">

          {/* TABLE */}
          <div className="table-responsive" style={{ maxHeight: "400px" }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Sr.No</th>
                  
                  <th>Lead ID</th>
                   <th>Score</th>
                  <th>Company</th>
                  <th>Counrty</th>
                  <th>Job_title</th>
                  <th>Job_level_desc</th>
                  <th>industry</th>
                 
                </tr>
              </thead>

              <tbody>
                {propLoading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      <ClipLoader size={25} color="#0d6efd" />
                    </td>
                  </tr>
                ) : propensityLeads.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                ) : (
                  propensityLeads.map((lead, index) => (
                    <tr key={lead.Lead_id}>
                      <td>
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td>{lead.Lead_id}</td>
                      <td>
                        <span className="badge bg-primary">
                          {Number(
                            lead.propensity_score || 0
                          ).toFixed(2)}
                        </span>
                      </td>
                      <td>{lead.Company_name}</td>
                      <td>{lead.country}</td>
                        <td>{lead.Job_title}</td>
                        <td>{lead.Job_level_desc}</td>
                        <td>{lead.industry}</td>
                     
                      
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {!propLoading && totalPages > 1 && (
            <div className="pt-3 border-top d-flex justify-content-end align-items-center gap-3">
                        <button
                          className="px-3 py-1 text-sm border rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => p - 1)}
                        >
                          Prev
                        </button>

                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>

                        <button
                          className="px-3 py-1 text-sm border rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => p + 1)}
                        >
                          Next
                        </button>
                      </div>
          )}

        </div>
      </div>
    </>
  );
}