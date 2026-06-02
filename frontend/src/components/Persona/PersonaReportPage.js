import React, { useEffect, useState } from "react";

export default function PersonaReport() {

  const [lead, setLead] = useState(null);


  // =========================================
  // LOAD DATA FROM SESSION STORAGE
  // =========================================

  useEffect(() => {

    const stored = sessionStorage.getItem(
      "persona_report_data"
    );

    if (stored) {

      setLead(JSON.parse(stored));

    }

  }, []);



  if (!lead) {

    return (
      <div className="p-10 text-center text-gray-500">
        No report data available.
      </div>
    );

  }



  // =========================================
  // HELPERS
  // =========================================

  const renderParameters = (params) => {

    if (!params) return null;

    return Object.entries(params).map(
      ([param, value], i) => (

        <div
          key={i}
          className="flex justify-between border-b py-2 text-sm"
        >

          <span className="text-gray-700">
            {param}
          </span>

          <span className="font-semibold text-red-600">
            {value}
          </span>

        </div>

      )
    );

  };



  // =========================================
  // UI
  // =========================================

  return (

    <div className="p-6 max-w-6xl mx-auto">

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <h1 className="text-2xl font-bold mb-6">
        Persona Detailed Report
      </h1>



      {/* ================================= */}
      {/* LEAD DETAILS */}
      {/* ================================= */}

      <div className="bg-white border rounded-lg p-4 mb-6">

        <h2 className="font-bold text-lg mb-4">
          Lead Details
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">

          <div>
            <span className="text-gray-500">
              Lead ID:
            </span>
            <div className="font-semibold">
              {lead.lead_id}
            </div>
          </div>

          <div>
            <span className="text-gray-500">
              Company:
            </span>
            <div className="font-semibold">
              {lead.company_name}
            </div>
          </div>

          <div>
            <span className="text-gray-500">
              Persona:
            </span>
            <div className="font-semibold">
              {lead.persona}
            </div>
          </div>

        </div>

      </div>



      {/* ================================= */}
      {/* SECTION BREAKDOWN */}
      {/* ================================= */}

      {lead.section_breakdown &&
        Object.entries(
          lead.section_breakdown
        ).map(([section, data], i) => (

          <div
            key={i}
            className="bg-white border rounded-lg p-4 mb-6"
          >

            <h3 className="font-semibold text-lg mb-3">
              {section}
            </h3>

            {renderParameters(
              data.parameters
            )}

            <div className="flex justify-between mt-3 pt-3 border-t font-semibold">

              <span>
                Section Score
              </span>

              <span className="text-red-600">
                {data.section_score}
              </span>

            </div>

          </div>

        ))}



      {/* ================================= */}
      {/* FINAL CALCULATION */}
      {/* ================================= */}

      <div className="bg-white border rounded-lg p-4">

        <h2 className="font-bold text-lg mb-4">
          Final Calculation
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">

          <div>

            <span className="text-gray-500">
              Final Persona Score
            </span>

            <div className="text-xl font-bold text-red-600">

              {lead.final_persona_score}

            </div>

          </div>

          <div>

            <span className="text-gray-500">
              Priority
            </span>

            <div className="font-semibold">

              {lead.combined_priority}

            </div>

          </div>

          <div>

            <span className="text-gray-500">
              Tier
            </span>

            <div className="font-semibold">

              {lead.tier}

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}