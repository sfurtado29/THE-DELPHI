import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../styles/common.css";
import { ClipLoader } from "react-spinners";

const API_BASE_URL = process.env.REACT_APP_API_DOMAIN;
const PAGE_SIZE = 10;

export default function ICPDashboardTable() {
  const [icpLeads, setIcpLeads] = useState([]);
  const [icpLoading, setIcpLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  useEffect(() => {
    fetchIcpLeads(currentPage);
  }, [currentPage]);

  const fetchIcpLeads = async (page) => {
    try {
      setIcpLoading(true);

      const response = await axios.get(
        `${API_BASE_URL}/dashboard/icp`,
        {
          params: {
            page,
            page_size: PAGE_SIZE,
          },
        }
      );

      setIcpLeads(response.data?.data || []);
      setTotalRecords(response.data?.total || 0);
    } catch (error) {
      console.error("ICP API Error:", error);
    } finally {
      setIcpLoading(false);
    }
  };

  return (
    <>
      <h5 className="fw-bold mb-1">ICP Leads</h5>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          {/* Table */}
          <div
            style={{
              maxHeight: "290px",
              overflowY: "auto",
            }}
          >
            <table
              className="table table-sm table-hover align-middle mb-0 w-100"
              style={{ fontSize: "11px" }}
            >
              <thead className="table-light">
                <tr>
                  <th style={{ whiteSpace: "nowrap", fontSize: "10px" }}>
                    Sr.No
                  </th>
                  <th style={{ whiteSpace: "nowrap", fontSize: "10px" }}>
                    Lead ID
                  </th>
                  <th style={{ whiteSpace: "nowrap", fontSize: "10px" }}>
                    Score
                  </th>
                  <th style={{ whiteSpace: "nowrap", fontSize: "10px" }}>
                    Company
                  </th>
                  <th style={{ whiteSpace: "nowrap", fontSize: "10px" }}>
                    Country
                  </th>
                  <th style={{ whiteSpace: "nowrap", fontSize: "10px" }}>
                    Job Title
                  </th>
                  <th style={{ whiteSpace: "nowrap", fontSize: "10px" }}>
                    Job Level
                  </th>
                  <th style={{ whiteSpace: "nowrap", fontSize: "10px" }}>
                    Industry
                  </th>
                </tr>
              </thead>

              <tbody>
                {icpLoading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <ClipLoader
                        size={25}
                        color="#4f46e5"
                      />
                    </td>
                  </tr>
                ) : icpLeads.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                ) : (
                  icpLeads.map((lead, index) => (
                    <tr key={lead.Lead_id}>
                      <td>
                        {(currentPage - 1) * PAGE_SIZE +
                          index +
                          1}
                      </td>

                      <td>{lead.Lead_id}</td>

                      <td>
                        <span className="badge bg-success">
                          {Number(
                            lead.icp_score || 0
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

          {/* Pagination */}
          {!icpLoading && totalPages > 1 && (
            <div className="pt-3 border-top d-flex justify-content-end align-items-center gap-3">
              <button
                className="px-3 py-1 text-sm border rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage((prev) => prev - 1)
                }
              >
                Prev
              </button>

              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>

              <button
                className="px-3 py-1 text-sm border rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => prev + 1)
                }
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