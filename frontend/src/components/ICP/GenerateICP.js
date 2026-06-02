// frontend/src/components/ICP/GenerateICP.js
import React, { useEffect, useState } from "react";
import ICPMainGride from "./ICPMainGride";

export default function GenerateICP({ embeddedQuery }) {
  const [filters, setFilters] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Load Filters from Parent Query
  useEffect(() => {
    if (!embeddedQuery) return;

    const params = new URLSearchParams(embeddedQuery);

    const loadedFilters = {
      country: params.get("country_id") || "",
      industry: params.get("industry_id") || "",
      employee_size: params.get("employee_size_id") || "",
      revenue_size: params.get("revenue_size_id") || "",
      job_level: params.get("job_level_id") || "",
      job_function: params.get("job_function_id") || "",
      lead_type: params.get("lead_type_id") || "",
      limit: 1000,
    };

    setFilters(loadedFilters);

    // Refresh Grid
    setRefreshKey((prev) => prev + 1);
  }, [embeddedQuery]);

  return (
    <div className="card shadow-sm border-0 rounded-4 p-4 ">
      <h4 className="fw-bold mb-3">ICP Leads Result</h4>

      <ICPMainGride
        filters={filters}
        refreshKey={refreshKey}
        pageSize={10}
      />
    </div>
  );
}
