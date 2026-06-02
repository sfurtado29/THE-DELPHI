import React, { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function GlassNavigation() {
    const navigate = useNavigate();
    const location = useLocation();
    const scrollRef = useRef(null);

        // HIDE IF: On Login page
    if (location.pathname === "/" || location.pathname === "/login") return null;
    // Dynamic tabs - you can easily add all 10 here
    const tabs = [
        // { label: "Dashboard", icon: "bi-grid-1x2", path: "/Dashboard" },
         { label: "Propensity Scoring", icon: "bi-graph-up-arrow", path: "/leadscoring" },
         { label: "ICP", icon: "bi-dice-6", path: "/ICP/CreateIdealTAL" },
         { label: "CreatePersona", icon: "bi-person-badge", path: "/Persona/CreatePersona" },
        //  { label: "BGI", icon: "bi-bag", path: "/BGI" },
        //  { label: "GBP", icon: "bi bi-globe-central-south-asia", path: "/GBP" },
        //  { label: "TAL Creation & Refinement", icon: "bi bi-file-earmark-medical", path: "/TAL" },
        //  { label: "TAL Prioritization ", icon: "bi bi-file-earmark-arrow-up", path: "/TAL Prioritization" },
        //  { label: "Industry Discovery ", icon: "bi bi-building-fill-check", path: "/Industry" },
        //  { label: "Top 5 Customer Analysis  ", icon: "bi bi-5-square", path: "/Top5" },
         { label: "Intelligence ", icon: "bi bi-lightbulb", path: "/Intelligence" }
     
       
    ];

    return (
        <div  className="w-100 d-flex justify-content-center" style={{ zIndex: 1030, pointerEvents: 'none' }}>
            <div 
                ref={scrollRef}
                className="glass-dock d-flex align-items-center p-2 rounded-pill shadow-lg border"
                style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.10)', 
                    backdropFilter: 'blur(15px)',
                    pointerEvents: 'auto',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    maxWidth: '95vw', // Prevents touching screen edges
                    overflowX: 'auto', // Enable scrolling for 10+ tabs
                    whiteSpace: 'nowrap',
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none' // IE/Edge
                }}
            >
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    return (
                        <button
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className={`btn rounded-pill px-4 py-2 d-flex align-items-center gap-2 border-0 flex-shrink-0 transition-all ${
                                isActive ? "bg-primary text-white shadow" : "text-secondary"
                            }`}
                        >
                            <i className={`bi ${tab.icon}`}></i>
                            <span className="fw-semibold small">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <style>{`
                /* Hide scrollbar for Chrome, Safari and Opera */
                .glass-dock::-webkit-scrollbar {
                    display: none;
                }
                
                .transition-all {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .transition-all:hover:not(.bg-primary) {
                    background-color: rgba(0, 123, 255, 0.1);
                    color: #0d6efd;
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
}