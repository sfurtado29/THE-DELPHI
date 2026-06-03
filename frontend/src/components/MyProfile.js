import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./MyProfile.css";

export default function MyProfile() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
    })();

    const [profilePic, setProfilePic]     = useState(() => localStorage.getItem("profile-pic") || null);
    const [editing, setEditing]           = useState(false);
    const [darkMode, setDarkMode]         = useState(() => localStorage.getItem("delphi-theme") === "dark");
    const [emailNotif, setEmailNotif]     = useState(true);
    const [twoFA, setTwoFA]               = useState(false);

    const nameParts  = (user.full_name || "User").split(" ");
    const initials   = nameParts.map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const joinedDate = user.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : "2024";

    const [form, setForm] = useState({
        first_name:   nameParts[0] || "",
        last_name:    nameParts.slice(1).join(" ") || "",
        email:        user.email || "",
        phone:        user.phone || "",
        company_name: user.company_name || "",
    });

    const handlePicUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            localStorage.setItem("profile-pic", ev.target.result);
            setProfilePic(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        const updated = {
            ...user,
            full_name: `${form.first_name} ${form.last_name}`.trim(),
            phone:     form.phone,
        };
        localStorage.setItem("user", JSON.stringify(updated));
        setEditing(false);
    };

    const handleDarkToggle = (val) => {
        setDarkMode(val);
        const root = document.documentElement;
        if (val) { root.setAttribute("data-theme", "dark"); localStorage.setItem("delphi-theme", "dark"); }
        else      { root.removeAttribute("data-theme");      localStorage.setItem("delphi-theme", "light"); }
    };

    const campaignCount = 0;
    const chatCount     = 0;
    const planName      = "Pro";
    const renewalDate   = "Aug 1, 2026";
    const campaignUsage = { used: 3, total: 20 };
    const storageUsage  = { used: 1.2, total: 5 };

    return (
        <div className="mp-page">

            {/* ── Back ── */}
            <button
                className="btn btn-light border mb-4 d-flex align-items-center gap-2"
                onClick={() => navigate(-1)}
                style={{ borderRadius: 10, fontWeight: 600, fontSize: 13 }}
            >
                <i className="bi bi-arrow-left"></i> Back
            </button>

            {/* ── Header Card ── */}
            <div className="mp-header-card">
                <div className="mp-avatar-wrap" onClick={() => fileInputRef.current.click()} title="Change photo">
                    <div className="mp-avatar">
                        {profilePic ? <img src={profilePic} alt="avatar" /> : initials}
                    </div>
                    <div className="mp-avatar-overlay"><i className="bi bi-camera-fill"></i></div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePicUpload} />

                <div className="mp-header-info">
                    <h2 className="mp-header-name">{user.full_name || "User"}</h2>
                    <p className="mp-header-email">{user.email}</p>
                    <span className="mp-plan-badge">
                        <i className="bi bi-patch-check-fill"></i> {planName} Plan
                    </span>
                </div>

                <button className={`mp-edit-btn ${editing ? "saving" : ""}`} onClick={() => editing ? handleSave() : setEditing(true)}>
                    <i className={`bi ${editing ? "bi-check-lg" : "bi-pencil"}`}></i>
                    {editing ? "Save Changes" : "Edit Profile"}
                </button>
            </div>

            {/* ── Main Grid ── */}
            <div className="mp-grid">

                {/* Personal Information */}
                <div className="mp-card">
                    <div className="mp-card-title">
                        <span className="mp-card-title-icon" style={{ background: "#eff6ff", color: "#1a56db" }}>
                            <i className="bi bi-person-fill"></i>
                        </span>
                        Personal Information
                    </div>
                    <div className="mp-fields">
                        <div className="mp-field-row">
                            <div className="mp-field">
                                <label>First Name</label>
                                {editing
                                    ? <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                                    : <div className="mp-field-value">{form.first_name || "—"}</div>}
                            </div>
                            <div className="mp-field">
                                <label>Last Name</label>
                                {editing
                                    ? <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                                    : <div className="mp-field-value">{form.last_name || "—"}</div>}
                            </div>
                        </div>
                        <div className="mp-field-row">
                            <div className="mp-field">
                                <label>Email Address</label>
                                <div className="mp-field-value">{form.email || "—"}</div>
                            </div>
                            <div className="mp-field">
                                <label>Phone Number</label>
                                {editing
                                    ? <input value={form.phone} placeholder="+91 00000 00000" onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                                    : <div className="mp-field-value">{form.phone || "—"}</div>}
                            </div>
                        </div>
                        <div className="mp-field">
                            <label>Company</label>
                            <div className="mp-field-value">{form.company_name || "—"}</div>
                        </div>
                    </div>
                </div>

                {/* Activity Overview */}
                <div className="mp-card">
                    <div className="mp-card-title">
                        <span className="mp-card-title-icon" style={{ background: "#f0fdf4", color: "#059669" }}>
                            <i className="bi bi-activity"></i>
                        </span>
                        Activity Overview
                    </div>
                    <div className="mp-stats">
                        <div className="mp-stat-card">
                            <div className="mp-stat-icon" style={{ background: "#eff6ff", color: "#1a56db" }}>
                                <i className="bi bi-megaphone-fill"></i>
                            </div>
                            <div className="mp-stat-value">{campaignCount}</div>
                            <div className="mp-stat-label">Campaigns</div>
                        </div>
                        <div className="mp-stat-card">
                            <div className="mp-stat-icon" style={{ background: "#f5f3ff", color: "#6d28d9" }}>
                                <i className="bi bi-chat-dots-fill"></i>
                            </div>
                            <div className="mp-stat-value">{chatCount}</div>
                            <div className="mp-stat-label">Chats</div>
                        </div>
                        <div className="mp-stat-card">
                            <div className="mp-stat-icon" style={{ background: "#fff7ed", color: "#d97706" }}>
                                <i className="bi bi-calendar3"></i>
                            </div>
                            <div className="mp-stat-value" style={{ fontSize: 15 }}>{joinedDate}</div>
                            <div className="mp-stat-label">Member Since</div>
                        </div>
                    </div>
                </div>

                {/* Plan & Usage */}
                <div className="mp-card mp-card-short">
                    <div className="mp-card-title">
                        <span className="mp-card-title-icon" style={{ background: "#fef9c3", color: "#d97706" }}>
                            <i className="bi bi-lightning-charge-fill"></i>
                        </span>
                        Plan & Usage
                    </div>
                    <div className="mp-plan-row">
                        <div>
                            <div className="mp-plan-name">{planName} Plan</div>
                            <div className="mp-plan-renewal">Renews on {renewalDate}</div>
                        </div>
                        <button className="mp-manage-btn">Manage Subscription</button>
                    </div>
                    <div className="mp-usage">
                        <div className="mp-usage-item">
                            <div className="mp-usage-header">
                                <span>Campaigns</span>
                                <span>{campaignUsage.used} / {campaignUsage.total} used</span>
                            </div>
                            <div className="mp-bar-track">
                                <div className="mp-bar-fill" style={{ width: `${(campaignUsage.used / campaignUsage.total) * 100}%` }} />
                            </div>
                        </div>
                        <div className="mp-usage-item">
                            <div className="mp-usage-header">
                                <span>Storage</span>
                                <span>{storageUsage.used} GB / {storageUsage.total} GB</span>
                            </div>
                            <div className="mp-bar-track">
                                <div className={`mp-bar-fill ${(storageUsage.used / storageUsage.total) > 0.75 ? "warn" : ""}`}
                                    style={{ width: `${(storageUsage.used / storageUsage.total) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preferences */}
                <div className="mp-card mp-card-short">
                    <div className="mp-card-title">
                        <span className="mp-card-title-icon" style={{ background: "#fdf2f8", color: "#9333ea" }}>
                            <i className="bi bi-sliders"></i>
                        </span>
                        Preferences
                    </div>
                    <div className="mp-prefs">
                        <div className="mp-pref-item">
                            <div className="mp-pref-left">
                                <div className="mp-pref-icon" style={{ background: "#1e293b", color: "#fff" }}>🌙</div>
                                <div>
                                    <div className="mp-pref-label">Dark Mode</div>
                                    <div className="mp-pref-sub">{darkMode ? "Enabled" : "Disabled"}</div>
                                </div>
                            </div>
                            <label className="mp-toggle">
                                <input type="checkbox" checked={darkMode} onChange={e => handleDarkToggle(e.target.checked)} />
                                <span className="mp-toggle-slider"></span>
                            </label>
                        </div>
                        <div className="mp-pref-item">
                            <div className="mp-pref-left">
                                <div className="mp-pref-icon" style={{ background: "#eff6ff", color: "#1a56db" }}>
                                    <i className="bi bi-envelope-fill"></i>
                                </div>
                                <div>
                                    <div className="mp-pref-label">Email Notifications</div>
                                    <div className="mp-pref-sub">Receive updates via email</div>
                                </div>
                            </div>
                            <label className="mp-toggle">
                                <input type="checkbox" checked={emailNotif} onChange={e => setEmailNotif(e.target.checked)} />
                                <span className="mp-toggle-slider"></span>
                            </label>
                        </div>
                        <div className="mp-pref-item">
                            <div className="mp-pref-left">
                                <div className="mp-pref-icon" style={{ background: "#f0fdf4", color: "#059669" }}>
                                    <i className="bi bi-shield-lock-fill"></i>
                                </div>
                                <div>
                                    <div className="mp-pref-label">Two-Factor Auth</div>
                                    <div className="mp-pref-sub">Extra layer of security</div>
                                </div>
                            </div>
                            <label className="mp-toggle">
                                <input type="checkbox" checked={twoFA} onChange={e => setTwoFA(e.target.checked)} />
                                <span className="mp-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
