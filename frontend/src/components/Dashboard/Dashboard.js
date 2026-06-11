import React, { useEffect, useState } from "react";
import axios from "axios";
import MonthlyLeadsBarChart from "./MonthlyLeadsBarChart";
import PropensityLeadTable from "./PropensityLeadTable";
import ICPLeadTable from "./ICPLeadTable";
import "../../styles/common.css";

const API_BASE_URL = process.env.REACT_APP_API_DOMAIN;

const currentYear = new Date().getFullYear();
const startYear = 2022;

const years = Array.from(
  { length: currentYear - startYear + 1 },
  (_, i) => currentYear - i
);

export default function Dashboard() {
  const [year, setYear] = useState(2024);
  const [topLeads, setTopLeads] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scoreRange] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    fetchDashboardData(year);
    setCurrentPage(1);
    // eslint-disable-next-line
  }, [year, scoreRange]);

  const fetchDashboardData = async (selectedYear) => {
    try {
      setLoading(true);

      const [topRes, monthRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dashboard/top-leads`, {
          params: { year: selectedYear },
        }),
        axios.get(`${API_BASE_URL}/dashboard/monthly-leads`, {
          params: { year: selectedYear },
        }),
      ]);

      setTopLeads(
        Array.isArray(topRes.data?.leads) ? topRes.data.leads : []
      );

      setMonthlyStats(
        Array.isArray(monthRes.data?.monthly_counts)
          ? monthRes.data.monthly_counts
          : []
      );
    } catch (err) {
      console.error("Dashboard API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = topLeads.filter((lead) => {
    const score = Number(lead.total_score || 0);

    if (scoreRange === "0-50") {
      return score >= 0 && score < 50;
    }

    if (scoreRange === "50-80") {
      return score >= 50 && score < 80;
    }

    if (scoreRange === "80-100") {
      return score >= 80;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;

  const paginatedLeads = filteredLeads.slice(
    startIndex,
    startIndex + pageSize
  );

  return (
    <div
      className="container-fluid px-4 pb-4 bg-light min-vh-100"
      style={{ paddingTop: "88px" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div className="d-flex flex-row justify-content-between align-items-center mb-2 gap-3">
          <div>
            <h6 className="fw-bold mb-0 title-style">
              Dashboard Overview
            </h6>
            <p
              className="text-secondary mb-0"
              style={{ fontSize: "11px" }}
            >
              Track performance metrics and lead propensity.
            </p>
          </div>

          <div className="d-flex align-items-center bg-white p-2 rounded-3 shadow-sm border">
            <span className="text-muted small me-2 ps-2">
              Year:
            </span>

            <select
              className="form-select form-select-sm border-0 fw-semibold bg-light"
              style={{ width: "100px", cursor: "pointer" }}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Card */}
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white border-0 pt-2 px-3">
                <h6
                  className="fw-bold text-dark mb-0"
                  style={{ fontSize: "13px" }}
                >
                  Monthly Leads & Propensity Overview
                </h6>

                <span
                  className="text-muted"
                  style={{ fontSize: "11px" }}
                >
                  Leads performance and scoring insights for {year}
                </span>
              </div>

              <div className="card-body p-3">
                <div className="row g-4 align-items-stretch">
                  {/* Monthly Leads Chart */}
                  <div className="col-12 col-lg-6 d-flex">
                    <div
                      className="w-100 border rounded-4 p-3 bg-white d-flex flex-column"
                      style={{ height: "450px" }}
                    >
                      <h6 className="fw-semibold mb-3">
                        Monthly Lead Volume
                      </h6>

                      <div
                        style={{
                          flex: 1,
                          width: "100%",
                          minHeight: 0,
                        }}
                      >
                        {monthlyStats.length === 0 ? (
                          <div className="text-center text-muted">
                            No data available for this year
                          </div>
                        ) : (
                          <MonthlyLeadsBarChart
                            data={monthlyStats}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Leads Table */}
                  <div className="col-12 col-lg-6 d-flex">
                    <div
                      className="w-100 border rounded-4 p-3 bg-white d-flex flex-column position-relative"
                      style={{ height: "450px" }}
                    >
                      <h6 className="fw-semibold mb-3">
                        {year} Leads Overview
                      </h6>

                      <div className="flex-grow-1 overflow-auto">
                        <table className="min-w-full text-sm text-left">
                          <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                            <tr>
                              <th className="px-6 py-4 font-semibold">
                                Sr.No
                              </th>
                              <th className="px-6 py-4 font-semibold">
                                Lead Details
                              </th>
                              <th className="px-6 py-4 font-semibold">
                                Company Info
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100 bg-white">
                            {!loading &&
                              filteredLeads.length === 0 && (
                                <tr>
                                  <td
                                    colSpan="5"
                                    className="px-6 py-8 text-center text-gray-400"
                                  >
                                    No leads available
                                  </td>
                                </tr>
                              )}

                            {!loading &&
                              paginatedLeads.map((lead, index) => (
                                <tr
                                  key={lead.Lead_id}
                                  className="hover:bg-gray-50 transition duration-150 ease-in-out"
                                >
                                  <td className="px-6 py-4 font-medium text-gray-700">
                                    {startIndex + index + 1}
                                  </td>

                                  <td className="px-6 py-4">
                                    <div className="font-semibold text-gray-800">
                                      {lead.name}
                                    </div>

                                    <div className="text-gray-400 text-xs mt-1">
                                      {lead.Email_id}
                                    </div>
                                  </td>

                                  <td className="px-6 py-4">
                                    <div className="text-gray-700 font-medium">
                                      {lead.Company_name}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      {filteredLeads.length > 0 && (
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
                            disabled={
                              currentPage === totalPages
                            }
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tables */}
        <div className="row g-4 mt-2">
          <div className="col-12 col-lg-6 d-flex">
            <div
              className="w-100 border rounded-4 p-3 bg-white shadow-sm"
              style={{
                height: "200px",
                overflow: "hidden",
              }}
            >
              <PropensityLeadTable />
            </div>
          </div>

          <div className="col-12 col-lg-6 d-flex">
            <div
              className="w-100 border rounded-4 p-3 bg-white shadow-sm"
              style={{
                height: "200px",
                overflow: "hidden",
              }}
            >
              <ICPLeadTable />
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="icp-loading-overlay">
            <div className="text-center">
              <div className="icp-diamond-loader">
                <div className="icp-diamond one"></div>
                <div className="icp-diamond two"></div>
                <div className="icp-diamond three"></div>
                <div className="icp-diamond four"></div>
              </div>

              <div className="icp-loading-text text-success"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}