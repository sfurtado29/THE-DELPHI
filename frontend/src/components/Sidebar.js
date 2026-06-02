// ../components/Sidebar.js
import React from "react";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ isOpen, toggleSidebar }) {
    const navigate = useNavigate();

    // Logic: Comprehensive Logout
    const handleLogout = () => {
        localStorage.clear();
        if (toggleSidebar) toggleSidebar(); 
        navigate("/"); 
    };

    return (
        <>
            {/* Overlay: Only visible when isOpen is true */}
            {isOpen && (
                <div 
                    className="position-fixed top-0 start-0 w-100 h-100" 
                    style={{ 
                        zIndex: 1060, 
                        backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                        backdropFilter: 'blur(4px)',
                        transition: 'opacity 0.3s ease-in-out'
                    }}
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Sidebar Panel */}
            <div 
                className="position-fixed top-0 end-0 h-100 bg-white shadow-lg border-start "
                style={{ 
                    width: "300px", 
                    zIndex: 1070, 
                    transform: isOpen ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    visibility: isOpen ? "visible" : "hidden" // Extra safety to prevent ghost clicks
                }}
            >
                {/* Header Section */}
                <div className="p-4 border-bottom d-flex justify-content-between align-items-center bg-light bg-opacity-50">
                    <div>
                        <h4 className="mb-0 text-dark control-panel-title">Control Panel</h4>
                        
                    </div>
                    <button 
                        className="btn-close shadow-none" 
                        style={{ fontSize: '12px' }} 
                        onClick={toggleSidebar}
                    ></button>
                </div>

                {/* Body Section */}
                <div className="p-3">
                    <div className="list-group list-group-flush gap-2">
                        {/* Score Config Item */}
                        <button
                            onClick={() => { navigate("/ScoreConfiguration"); toggleSidebar(); }}
                            className="list-group-item list-group-item-action border rounded-3 d-flex align-items-center gap-3 py-3"
                            style={{ transition: 'all 0.2s ease' }}
                        >
                            <div className="bg-primary bg-opacity-10 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>
                                <i className="bi bi-sliders text-primary"></i>
                            </div>
                            <div className="overflow-hidden">
                                <p className="mb-0 fw-bold text-dark" style={{ fontSize: '12px' }}>Propensity Scoring Configuration</p>
                                <p className="mb-0 text-muted text-truncate" style={{ fontSize: '10px' }}>Adjust propensity weights & scores</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { navigate("/ICP"); toggleSidebar(); }}
                            className="list-group-item list-group-item-action border rounded-3 d-flex align-items-center gap-3 py-3"
                            style={{ transition: 'all 0.2s ease' }}
                        >
                            <div className="bg-primary bg-opacity-10 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>
                                <i className="bi bi-sliders text-primary"></i>
                            </div>
                            <div className="overflow-hidden">
                                <p className="mb-0 fw-bold text-dark" style={{ fontSize: '12px' }}>ICP Configuration</p>
                                <p className="mb-0 text-muted text-truncate" style={{ fontSize: '10px' }}>Adjust ICP weights & scores</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { navigate("/Persona"); toggleSidebar(); }}
                            className="list-group-item list-group-item-action border rounded-3 d-flex align-items-center gap-3 py-3"
                            style={{ transition: 'all 0.2s ease' }}
                        >
                            <div className="bg-primary bg-opacity-10 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>
                                <i className="bi bi-sliders text-primary"></i>
                            </div>
                            <div className="overflow-hidden">
                                <p className="mb-0 fw-bold text-dark" style={{ fontSize: '12px' }}>Persona Configuration</p>
                                <p className="mb-0 text-muted text-truncate" style={{ fontSize: '10px' }}>Adjust Persona weights & scores</p>
                            </div>
                        </button>
                        
                        {/* Sign Out Item */}
                        <button
                            onClick={handleLogout}
                            className="list-group-item list-group-item-action border rounded-3 d-flex align-items-center gap-3 py-3 text-danger mt-4"
                            style={{ transition: 'all 0.2s ease', borderStyle: 'dashed !important' }}
                        >
                            <div className="bg-danger bg-opacity-10 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>
                                <i className="bi bi-power"></i>
                            </div>
                            <span className="fw-bold" style={{ fontSize: '12px' }}>Sign Out</span>
                        </button>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="position-absolute bottom-0 w-100 p-4 text-center border-top">
                    <div className="d-flex align-items-center justify-content-center gap-2 opacity-50">
                        <div className="bg-secondary rounded-circle" style={{ width: 6, height: 6 }}></div>
                        <small className="text-muted fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>DELPHI V1.0.5</small>
                    </div>
                </div>
            </div>

            <style>{`
                .list-group-item:hover {
                    background-color: #f8f9fa !important;
                    border-color: #dee2e6 !important;
                    transform: translateX(-4px);
                }
                .list-group-item-action:active {
                    background-color: #f1f3f5 !important;
                }
            `}</style>
        </>
    );
}