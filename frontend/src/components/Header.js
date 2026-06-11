import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Nav_Sidebar from "./Headerbar";

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  width: "100%",
  padding: "10px 16px",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  color: "#374151",
  textAlign: "left",
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const dropdownRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("delphi-theme") === "dark"
  );

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const initials = useMemo(() => {
    return (user.full_name || user.email || "U")
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const hiddenRoutes = ["/", "/login"];

  if (hiddenRoutes.includes(location.pathname)) {
    return null;
  }

  const navigateTo = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const toggleTheme = () => {
    const nextTheme = !darkMode;

    setDarkMode(nextTheme);

    if (nextTheme) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("delphi-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("delphi-theme", "light");
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const menuItems = [
    {
      label: "Home",
      icon: "bi-house",
      path: "/Intelligence",
    },
    {
      label: "My Profile",
      icon: "bi-person",
      path: "/profile",
    },
    {
      label: "Dashboard Overview",
      icon: "bi-grid",
      path: "/Dashboard",
    },
  ];

  return (
    <>
      <nav
        className="navbar bg-white border-bottom shadow-sm px-4 py-2"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1050,
        }}
      >
        <div className="container-fluid d-flex align-items-center justify-content-between">

          {/* Logo */}
          <div
            className="d-flex align-items-center"
            style={{ minWidth: "180px" }}
          >
            <h5 className="mb-0 delphi-logo-text">DELPHI</h5>
          </div>

          {/* Navigation */}
          <div className="flex-grow-1 d-flex justify-content-center">
            <Nav_Sidebar />
          </div>

          {/* Profile */}
          <div
            className="d-flex justify-content-end position-relative"
            style={{ minWidth: "180px" }}
            ref={dropdownRef}
          >
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="border-0 text-white fw-bold"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg,#1a56db,#6d28d9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
              }}
            >
              {initials}
            </button>

            {isOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "50px",
                  right: 0,
                  width: "220px",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow:
                    "0 10px 25px rgba(0,0,0,0.12)",
                  zIndex: 2000,
                }}
              >
                {/* User Info */}
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    {user.full_name || "User"}
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#9ca3af",
                      marginTop: "2px",
                    }}
                  >
                    {user.email}
                  </div>
                </div>

                {/* Navigation Items */}
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    style={menuItemStyle}
                    onClick={() => navigateTo(item.path)}
                  >
                    <i
                      className={`bi ${item.icon}`}
                      style={{
                        width: "18px",
                        color: "#6b7280",
                      }}
                    />
                    {item.label}
                  </button>
                ))}

                {/* Theme Toggle */}
                <button
                  style={menuItemStyle}
                  onClick={toggleTheme}
                >
                  <i
                    className="bi bi-moon-stars"
                    style={{
                      width: "18px",
                      color: "#6b7280",
                    }}
                  />

                  <span style={{ flex: 1 }}>
                    Dark Theme
                  </span>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "20px",
                      background: darkMode
                        ? "#1a56db"
                        : "#f3f4f6",
                      color: darkMode
                        ? "#fff"
                        : "#6b7280",
                    }}
                  >
                    {darkMode ? "ON" : "OFF"}
                  </span>
                </button>

                {/* Logout */}
                <div
                  style={{
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  <button
                    onClick={logout}
                    style={{
                      ...menuItemStyle,
                      color: "#dc2626",
                    }}
                  >
                    <i
                      className="bi bi-power"
                      style={{
                        width: "18px",
                        color: "#dc2626",
                      }}
                    />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <style>
        {`
          .delphi-logo-text{
            font-family:'Space Grotesk',sans-serif;
            font-size:1.2rem;
            font-weight:700;
            letter-spacing:3px;
            background:linear-gradient(
              90deg,
              #212529 0%,
              #0d6efd 100%
            );
            -webkit-background-clip:text;
            -webkit-text-fill-color:transparent;
          }

          [data-theme="dark"] .navbar{
            background:#111520 !important;
            border-bottom-color:rgba(255,255,255,.08) !important;
          }

          [data-theme="dark"] .delphi-logo-text{
            background:linear-gradient(
              90deg,
              #ffffff 0%,
              #4d8ef7 100%
            );
            -webkit-background-clip:text;
            -webkit-text-fill-color:transparent;
          }
        `}
      </style>
    </>
  );
}