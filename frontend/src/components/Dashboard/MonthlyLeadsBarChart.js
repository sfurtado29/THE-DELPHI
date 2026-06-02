import React, { useState, useMemo } from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const MONTHS = [
  { label: "Jan", value: 1 },
  { label: "Feb", value: 2 },
  { label: "Mar", value: 3 },
  { label: "Apr", value: 4 },
  { label: "May", value: 5 },
  { label: "Jun", value: 6 },
  { label: "Jul", value: 7 },
  { label: "Aug", value: 8 },
  { label: "Sep", value: 9 },
  { label: "Oct", value: 10 },
  { label: "Nov", value: 11 },
  { label: "Dec", value: 12 }
];

const QUARTERS = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12]
};

export default function MonthlyLeadsBarChart({ data }) {
  const [quarter, setQuarter] = useState("Q1");

  const chartData = useMemo(() => {
    const monthsInQuarter = QUARTERS[quarter];

    return {
      labels: MONTHS
        .filter(m => monthsInQuarter.includes(m.value))
        .map(m => m.label),

      datasets: [
        {
          data: monthsInQuarter.map(m => {
            const row = data.find(d => d.month === m);
            return row ? row.lead_count : 0;
          }),
          backgroundColor: "#4f46e5",
          hoverBackgroundColor: "#4338ca",
          borderRadius: 10,
          maxBarThickness: 55
        }
      ]
    };
  }, [data, quarter]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 12,
        cornerRadius: 10,
        titleFont: { size: 13 },
        bodyFont: { size: 13 },
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { size: 12, weight: "500" }
        }
      },
      y: {
        grid: {
          color: "#e5e7eb",
          borderDash: [4, 4]
        },
        ticks: {
          color: "#64748b",
          font: { size: 12 }
        }
      }
    }
  };

  return (
    <>
      {/* Quarter Pills */}
      <div className="d-flex justify-content-end mb-3">
        <div
          className="d-flex bg-light rounded-pill p-1 shadow-sm"
          style={{ gap: "4px" }}
        >
          {Object.keys(QUARTERS).map(q => (
            <button
              key={q}
              onClick={() => setQuarter(q)}
              className="btn btn-sm px-3 rounded-pill fw-semibold"
              style={{
                backgroundColor: quarter === q ? "#4f46e5" : "transparent",
                color: quarter === q ? "#fff" : "#475569",
                transition: "all 0.25s ease"
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "300px" }}>
        <Bar data={chartData} options={options} />
      </div>
    </>
  );
}
