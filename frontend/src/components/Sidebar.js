// ../components/Sidebar.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ isOpen, toggleSidebar }) {
    const navigate = useNavigate();
    const [profileTheme, setProfileTheme] = useState(() => localStorage.getItem("delphi-theme") === "dark");
    const [profilePic, setProfilePic] = useState(() => localStorage.getItem("profile-pic") || null);
    const fileInputRef = React.useRef(null);

    const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
    })();
    const userName  = user.full_name || user.name || "User";
    const userEmail = user.email || "";
    const initials  = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

    const handlePicUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            localStorage.setItem("profile-pic", base64);
            setProfilePic(base64);
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const root = document.documentElement;
        if (profileTheme) {
            root.setAttribute("data-theme", "dark");
            localStorage.setItem("delphi-theme", "dark");
        } else {
            root.removeAttribute("data-theme");
            localStorage.setItem("delphi-theme", "light");
        }
    }, [profileTheme]);

    const handleLogout = () => {
        localStorage.clear();
        if (toggleSidebar) toggleSidebar();
        navigate("/");
    };

    const handleShareChat = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(window.location.href);
                alert("Chat URL copied to clipboard.");
            } else {
                window.prompt("Copy this URL", window.location.href);
            }
        } catch (err) {
            console.error(err);
            window.prompt("Copy this URL", window.location.href);
        }
    };

    const handleAction = (label) => {
        if (toggleSidebar) toggleSidebar();
        alert(`${label} is coming soon.`);
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

            {/* Profile Panel */}
            <div
                className="position-fixed top-0 end-0 h-100 bg-white shadow-lg border-start"
                style={{
                    width: "300px",
                    zIndex: 1070,
                    transform: isOpen ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    visibility: isOpen ? "visible" : "hidden"
                }}
            >
                <div className="p-4 border-bottom bg-light bg-opacity-50">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <h4 className="mb-0 text-dark control-panel-title">Profile</h4>
                        <button
                            className="btn-close shadow-none"
                            style={{ fontSize: '12px' }}
                            onClick={toggleSidebar}
                        ></button>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <div
                            onClick={() => fileInputRef.current.click()}
                            title="Click to upload photo"
                            style={{
                                width: 54, height: 54, borderRadius: '14px',
                                background: 'linear-gradient(135deg, #1a56db, #6d28d9)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, fontWeight: 700, color: '#fff',
                                flexShrink: 0, letterSpacing: '0.04em',
                                cursor: 'pointer', overflow: 'hidden', position: 'relative'
                            }}
                            onMouseEnter={e => e.currentTarget.querySelector('.cam-overlay').style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.querySelector('.cam-overlay').style.opacity = 0}
                        >
                            {profilePic
                                ? <img src={profilePic} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : initials
                            }
                            <div className="cam-overlay" style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0, transition: 'opacity 0.2s'
                            }}>
                                <i className="bi bi-camera" style={{ color: '#fff', fontSize: 16 }}></i>
                            </div>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePicUpload} />
                        <div style={{ overflow: 'hidden' }}>
                            <p className="mb-0 fw-bold text-dark text-truncate" style={{ fontSize: '14px' }}>{userName}</p>
                            <p className="mb-0 text-muted text-truncate" style={{ fontSize: '11px' }}>{userEmail}</p>
                        </div>
                    </div>
                </div>

                <div className="p-3">
                    <div className="list-group list-group-flush gap-2">
                        <button
                            onClick={() => { if (toggleSidebar) toggleSidebar(); navigate("/profile"); }}
                            className="list-group-item list-group-item-action border rounded-3 d-flex align-items-center gap-3 py-3"
                            style={{ transition: 'all 0.2s ease' }}
                        >
                            <div className="bg-primary bg-opacity-10 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>
                                <i className="bi bi-person text-primary"></i>
                            </div>
                            <div className="overflow-hidden">
                                <p className="mb-0 fw-bold text-dark" style={{ fontSize: '12px' }}>My Profile</p>
                                <p className="mb-0 text-muted text-truncate" style={{ fontSize: '10px' }}>View your account details</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { if (toggleSidebar) toggleSidebar(); navigate("/Dashboard"); }}
                            className="list-group-item list-group-item-action border rounded-3 d-flex align-items-center gap-3 py-3"
                            style={{ transition: 'all 0.2s ease' }}
                        >
                            <div className="bg-primary bg-opacity-10 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>
                                <i className="bi bi-grid text-primary"></i>
                            </div>
                            <div className="overflow-hidden">
                                <p className="mb-0 fw-bold text-dark" style={{ fontSize: '12px' }}>Dashboard Overview</p>
                                <p className="mb-0 text-muted text-truncate" style={{ fontSize: '10px' }}>View your dashboard</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setProfileTheme(v => !v)}
                            className="list-group-item list-group-item-action border rounded-3 d-flex align-items-center gap-3 py-3"
                            style={{ transition: 'all 0.2s ease' }}
                        >
                            <div className="bg-primary bg-opacity-10 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>
                                <i className="bi bi-moon-stars text-primary"></i>
                            </div>
                            <div className="overflow-hidden">
                                <p className="mb-0 fw-bold text-dark" style={{ fontSize: '12px' }}>Dark Theme</p>
                                <p className="mb-0 text-muted text-truncate" style={{ fontSize: '10px' }}>
                                    {profileTheme ? 'Enabled' : 'Tap to enable'}
                                </p>
                            </div>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="list-group-item list-group-item-action border rounded-3 d-flex align-items-center gap-3 py-3 text-danger mt-4"
                            style={{ transition: 'all 0.2s ease' }}
                        >
                            <div className="bg-danger bg-opacity-10 p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>
                                <i className="bi bi-power"></i>
                            </div>
                            <span className="fw-bold" style={{ fontSize: '12px' }}>Sign Out</span>
                        </button>
                    </div>
                </div>

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