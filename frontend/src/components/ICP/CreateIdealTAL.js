// frontend/src/components/ICP/CreateIdealTAL.js

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";

import "../../styles/common.css";
import PromptBox from "./PromptBox";
import GenerateICP from "./GenerateICP";

export default function CreateIdealTAL() {
  const [loadingSnapshot, setLoadingSnapshot] =
    useState(false);

  const [industries, setIndustries] = useState([]);
  const [brands, setBrands] = useState([]);
  const [countries, setCountries] = useState([]);

  const [employeeSizes, setEmployeeSizes] = useState([]);
  const [revenueSizes, setRevenueSizes] = useState([]);
  const [jobLevels, setJobLevels] = useState([]);
  const [jobFunctions, setJobFunctions] = useState([]);
  const [leadTypes, setLeadTypes] = useState([]);

  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState([]);

  const [showResults, setShowResults] = useState(false);
  const [generatedQuery, setGeneratedQuery] =
    useState("");

  const [filters, setFilters] = useState({
    industries: "",
    brand: "",
    countries: "",
  });

  const API_BASE = (
    process.env.REACT_APP_API_DOMAIN ||
    "http://localhost:8000"
  ).replace(/\/$/, "");

  const ENDPOINTS = {
    industries: `${API_BASE}/leadscores/filters/industries`,
    countries: `${API_BASE}/leadscores/filters/countries`,
    brands: `${API_BASE}/leadscores/filters/brands`,
    employee_sizes: `${API_BASE}/leadscores/filters/employee_sizes`,
    revenue_sizes: `${API_BASE}/leadscores/filters/revenue_sizes`,
    job_levels: `${API_BASE}/leadscores/filters/job_levels`,
    job_functions: `${API_BASE}/leadscores/filters/job_functions`,
    lead_types: `${API_BASE}/leadscores/filters/lead-types`,
  };

  const toOptions = (data) =>
    Array.isArray(data)
      ? data.map((item) => ({
          id: item.id ?? item.value ?? "",
          label: item.label ?? item.name ?? "",
        }))
      : [];

  const fetchJson = async (url) => {
    const response = await axios.get(url);
    return response.data;
  };

  const fetchInitialFilters = useCallback(async () => {
    try {
      const [
        industryResponse,
        countryResponse,
        employeeResponse,
        revenueResponse,
        jobLevelResponse,
        jobFunctionResponse,
        leadTypeResponse,
      ] = await Promise.all([
        fetchJson(ENDPOINTS.industries),
        fetchJson(ENDPOINTS.countries),
        fetchJson(ENDPOINTS.employee_sizes),
        fetchJson(ENDPOINTS.revenue_sizes),
        fetchJson(ENDPOINTS.job_levels),
        fetchJson(ENDPOINTS.job_functions),
        fetchJson(ENDPOINTS.lead_types),
      ]);

      setIndustries(
        toOptions(industryResponse.industries || [])
      );

      setCountries(
        toOptions(countryResponse.countries || [])
      );

      setEmployeeSizes(
        toOptions(
          employeeResponse.employee_sizes || []
        )
      );

      setRevenueSizes(
        toOptions(
          revenueResponse.revenue_sizes || []
        )
      );

      setJobLevels(
        toOptions(jobLevelResponse.job_levels || [])
      );

      setJobFunctions(
        toOptions(
          jobFunctionResponse.job_functions || []
        )
      );

      setLeadTypes(
        toOptions(leadTypeResponse.lead_types || [])
      );
    } catch (error) {
      console.error(
        "Failed to load filters",
        error
      );

      setError("Failed to load dropdown filters.");
    }
  }, []);

  useEffect(() => {
    fetchInitialFilters();
  }, [fetchInitialFilters]);

  useEffect(() => {
    if (!filters.industries) {
      setBrands([]);
      return;
    }

    const fetchBrands = async () => {
      try {
        const response = await fetchJson(
          `${ENDPOINTS.brands}?industry_id=${filters.industries}`
        );

        setBrands(
          toOptions(response.brands || [])
        );
      } catch (error) {
        console.error(
          "Failed to load brands",
          error
        );

        setError("Failed to load brands.");
      }
    };

    fetchBrands();
  }, [filters.industries]);

  const updateFilter = (key, value) => {
    setFilters((previous) => {
      const updatedFilters = {
        ...previous,
        [key]: value,
      };

      if (key === "industries") {
        updatedFilters.brand = "";
      }

      return updatedFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      industries: "",
      brand: "",
      countries: "",
    });

    setBrands([]);
    setSnapshot([]);
    setShowResults(false);
    setGeneratedQuery("");
  };

  const handleCreateICP = async () => {
    setSnapshot([]);
    setShowResults(false);
    setLoadingSnapshot(true);

    try {
      const response = await axios.get(
        `${API_BASE}/leadscores/scoring/icp/ideal-snapshot`,
        {
          params: {
            industry_id: filters.industries,
            brand_id: filters.brand,
            country_id: filters.countries,
          },
        }
      );

      setSnapshot(
        response.data.snapshot || []
      );
    } catch (error) {
      console.error(
        "Snapshot generation failed",
        error
      );

      toast.error(
        "Not enough data to generate ICP Snapshot.",
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
    } finally {
      setLoadingSnapshot(false);
    }
  };

  const handleShowLeads = () => {
    if (!snapshot?.length) return;

    const filterPayload = {
      country_id: filters.countries,
      industry_id: filters.industries,
    };

    snapshot.forEach((row) => {
      const parameter =
        row.parameter.toLowerCase();

      if (parameter.includes("employee")) {
        filterPayload.employee_size_id =
          row.ideal_value_id;
      }

      if (parameter.includes("revenue")) {
        filterPayload.revenue_size_id =
          row.ideal_value_id;
      }

      if (parameter.includes("job level")) {
        filterPayload.job_level_id =
          row.ideal_value_id;
      }

      if (
        parameter.includes("job function")
      ) {
        filterPayload.job_function_id =
          row.ideal_value_id;
      }

      if (parameter.includes("lead type")) {
        filterPayload.lead_type_id =
          row.ideal_value_id;
      }
    });

    Object.keys(filterPayload).forEach(
      (key) => {
        if (!filterPayload[key]) {
          delete filterPayload[key];
        }
      }
    );

    const query = new URLSearchParams(
      filterPayload
    ).toString();

    setGeneratedQuery(query);
    setShowResults(true);
  };

  return (
    <div className="container-fluid bg-light min-vh-100 py-4 px-md-5">
      <h1 className="title-style mt-4">
        Ideal Customer Profile
      </h1>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="row justify-content-center">
        <div className="col-10 pt-4">
          <div
            className={`card border-0 shadow-sm rounded-4 ${
              showResults ? "p-2" : "p-4"
            }`}
          >
            <div className="card-body p-4 border-start border-warning border-4 rounded-4">
              <h6 className="fw-bold text-warning mb-3">
                Industry And Brand Selection
              </h6>

              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="col-md-3">
                  <p>Select Industry</p>

                  <select
                    className="form-select form-select-sm rounded-4"
                    value={filters.industries}
                    onChange={(e) =>
                      updateFilter(
                        "industries",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Select Industry
                    </option>

                    {industries.map(
                      (industry) => (
                        <option
                          key={industry.id}
                          value={industry.id}
                        >
                          {industry.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="col-md-3">
                  <p>Select Brand</p>

                  <select
                    className="form-select form-select-sm rounded-4"
                    value={filters.brand}
                    disabled={
                      !filters.industries
                    }
                    onChange={(e) =>
                      updateFilter(
                        "brand",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      {filters.industries
                        ? "Select Brand"
                        : "Select Industry First"}
                    </option>

                    {brands.map((brand) => (
                      <option
                        key={brand.id}
                        value={brand.id}
                      >
                        {brand.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <p>Select Country</p>

                  <select
                    className="form-select form-select-sm rounded-4"
                    value={filters.countries}
                    onChange={(e) =>
                      updateFilter(
                        "countries",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Select Country
                    </option>

                    {countries.map(
                      (country) => (
                        <option
                          key={country.id}
                          value={country.id}
                        >
                          {country.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <PromptBox
                  onSend={handleCreateICP}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3">
                <button
                  className="btn btn-primary fw-bold px-4"
                  onClick={handleCreateICP}
                  disabled={loadingSnapshot}
                >
                  {loadingSnapshot ? (
                    <>
                      <ClipLoader size={15} />{" "}
                      Generating...
                    </>
                  ) : (
                    "ICP Snapshot"
                  )}
                </button>

                <button
                  className="btn btn-outline-danger btn-sm px-5"
                  onClick={clearFilters}
                >
                  Reset
                </button>
              </div>

              {loadingSnapshot && (
                <div className="icp-loading-overlay">
                  <div className="text-center">
                    <div className="icp-diamond-loader">
                      <div className="icp-diamond one"></div>
                      <div className="icp-diamond two"></div>
                      <div className="icp-diamond three"></div>
                      <div className="icp-diamond four"></div>
                    </div>
                  </div>
                </div>
              )}

              {snapshot.length > 0 && (
                <div className="mt-4">
                  <h5 className="fw-bold">
                    Ideal ICP Snapshot
                  </h5>

                  <div className="row">
                    {snapshot.map(
                      (item, index) => (
                        <div
                          key={index}
                          className="col-md-4 mt-3"
                        >
                          <div className="card shadow-sm rounded-4 p-3 border-warning">
                            <h6 className="text-muted">
                              {item.parameter}
                            </h6>

                            <h5 className="fw-bold">
                              {item.ideal_value}
                            </h5>

                            <small>
                              Frequency:{" "}
                              {item.frequency}
                            </small>

                            <small>
                              Total:{" "}
                              {item.total_leads}
                            </small>

                            <small>
                              Percentage:{" "}
                              {item.percentage}
                            </small>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-4">
                    <button
                      className="btn btn-success fw-bold px-4"
                      onClick={handleShowLeads}
                    >
                      Show Leads for ICP
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showResults && (
            <div className="mt-5">
              <GenerateICP
                embeddedQuery={
                  generatedQuery
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}