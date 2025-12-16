import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ---------------------------
  // 🔐 RESET PASSWORD API
  // ---------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setErrorMsg("Invalid or missing reset token.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setErrorMsg("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    // if (newPassword.length < 6) {
    //   setErrorMsg("Password must be at least 6 characters.");
    //   return;
    // }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await api.post(
        "/reset-password",
        null,
        {
          params: {
            token: token,
            new_password: newPassword
          }
        }
      );

      setSuccessMsg(response.data.message || "Password reset successful.");

      // Redirect to login after success
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err) {
      console.error("Reset password error:", err);
      setErrorMsg(
        err.response?.data?.detail || "Failed to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authentication-wrapper authentication-cover">
      {/* Logo */}
      <a href="#" className="app-brand auth-cover-brand">
        <span className="app-brand-logo demo">
          <span className="text-primary">
            <img
              src="/assets/img/branding/logo.DialDesk.png"
              alt="DialDesk Logo"
              style={{ height: "50px", width: "auto" }}
            />
          </span>
        </span>
      </a>

      <div className="authentication-inner row m-0">
        {/* Left Illustration */}
        <div className="d-none d-xl-flex col-xl-8 p-0">
          <div className="auth-cover-bg d-flex justify-content-center align-items-center">
            <img
              src="/assets/img/illustrations/auth-login-illustration-light2.png"
              alt="auth-reset-password-cover"
              className="my-5 auth-illustration d-lg-block d-none"
            />
          </div>
        </div>

        {/* Reset Password */}
        <div className="d-flex col-12 col-xl-4 align-items-center authentication-bg p-sm-12 p-6">
          <div className="w-px-400 mx-auto mt-12 mt-5">
            <h4 className="mb-1">Reset Password 🔑</h4>
            <p className="mb-6">
              Enter your new password below
            </p>

            <form className="mb-6" onSubmit={handleSubmit}>
              <div className="mb-6 position-relative">
                <label className="form-label">New Password</label>
                <div className="input-group">
                    <input
                    type={showNewPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    />
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex={-1}
                        >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
              </div>

              <div className="mb-6 position-relative">
                <label className="form-label">Confirm Password</label>
                <div className="input-group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                </div>
              </div>

              {successMsg && (
                <div className="alert alert-success">{successMsg}</div>
              )}

              {errorMsg && (
                <div className="alert alert-danger">{errorMsg}</div>
              )}

              <button
                type="submit"
                className="btn btn-primary d-grid w-100"
                disabled={loading}
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>

            <div className="text-center">
              <Link to="/" className="d-flex justify-content-center">
                <i className="icon-base ti tabler-chevron-left me-1_5"></i>
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Loader */}
      {loading && (
        <div className="loader-overlay">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;
