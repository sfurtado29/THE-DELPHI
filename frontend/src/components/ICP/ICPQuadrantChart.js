// frontend/src/components/ICP/ICPQuadrantChart.js
import React from "react";

export default function ICPQuadrantChart({ icp, propensity }) {
  // ===============================
  // Thresholds (Same as icpQuadrant.js)
  // ===============================
  const ICP_HIGH = 50;
  const PROP_HIGH = 10;

  // Clamp values safely between 0–100
  const x = Math.min(Math.max(propensity, 0), 100);
  const y = Math.min(Math.max(icp, 0), 100);

  return (
    <div
      className="position-relative rounded-4 shadow-lg overflow-hidden"
      style={{
        height: "480px",
        width: "100%",
        background: "#fff",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* ===================== HEADER ===================== */}
      <div
        className="text-center fw-bold py-3"
        style={{
          fontSize: "18px",
          background: "linear-gradient(to right, #2563eb, #4f46e5)",
          color: "white",
          letterSpacing: "1px",
        }}
      >
        Quadrant Chart
      </div>

      {/* ===================== GRID AREA ===================== */}
      <div
        className="position-relative w-100"
        style={{
          height: "calc(100% - 60px)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
        }}
      >
        {/* ======================================================
            QUADRANTS (Correct Mapping)
            ====================================================== */}

        {/* TOP LEFT = Q2 (High ICP + Low Propensity) */}
        <Quadrant
          title="Q2 -> Future Growth"
          desc="High ICP + Low Propensity"
          bg="#e0f2fe"
        />

        {/* TOP RIGHT = Q1 (High ICP + High Propensity) */}
        <Quadrant
          title="Q1 -> Strategic Wins"
          desc="High ICP + High Propensity"
          bg="#dcfce7"
        />

        {/* BOTTOM LEFT = Q4 (Low ICP + Low Propensity) */}
        <Quadrant
          title="Q4 -> Low Priority"
          desc="Low ICP + Low Propensity"
          bg="#fee2e2"
        />

        {/* BOTTOM RIGHT = Q3 (Low ICP + High Propensity) */}
        <Quadrant
          title="Q3 -> Opportunistic"
          desc="Low ICP + High Propensity"
          bg="#fef9c3"
        />

        {/* ======================================================
            AXIS LINES (Based on Thresholds)
            ====================================================== */}

        {/* Horizontal line at ICP threshold (50%) */}
        <div
          className="position-absolute start-0 w-100"
          style={{
            bottom: `${ICP_HIGH}%`,
            height: "2px",
            background: "#111",
            opacity: 0.3,
          }}
        />

        {/* Vertical line at Propensity threshold (10%) */}
        <div
          className="position-absolute top-0 h-100"
          style={{
            
            width: "2px",
            background: "#111",
            opacity: 0.3,
          }}
        />

        {/* ===================== AXIS LABELS ===================== */}

        {/* Y Label */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "10px",
            transform: "rotate(-90deg) translateX(-50%)",
            transformOrigin: "left center",
            fontSize: "18px",
            fontWeight: "700",
            color: "#374151",
          }}
        >
          ICP FIT →
        </div>

        {/* X Label */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "18px",
            fontWeight: "700",
            color: "#374151",
          }}
        >
          PROPENSITY →
        </div>

        {/* ======================================================
            DOT PLACEMENT
            ====================================================== */}
        <div
          className="position-absolute"
          style={{
            left: `${x}%`,
            bottom: `${y}%`,
            transform: "translate(-50%, 50%)",
            zIndex: 20,
          }}
        >
          {/* Dot */}
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "radial-gradient(circle, #2563eb, #1e40af)",
              border: "3px solid white",
              boxShadow: "0px 0px 15px rgba(37,99,235,0.6)",
              cursor: "pointer",
              animation: "pulse 1.5s infinite",
            }}
          />

          {/* Tooltip */}
          <div
            className="px-3 py-2 rounded shadow"
            style={{
              position: "absolute",
              bottom: "28px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "12px",
              background: "rgba(0,0,0,0.8)",
              color: "white",
              whiteSpace: "nowrap",
            }}
          >
            ICP: {icp} | Propensity: {propensity}
          </div>
        </div>
      </div>

      {/* ===================== PULSE ANIMATION ===================== */}
     
    </div>
  );
}

/* ===================== QUADRANT COMPONENT ===================== */
function Quadrant({ title, desc, bg }) {
  return (
    <div
      className="p-4 d-flex flex-column justify-content-center"
      style={{
        background: bg,
        border: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      <h6 className="fw-bold mb-2 text-uppercase">{title}</h6>
      <p className="small text-muted mb-0">{desc}</p>
    </div>
  );
}
