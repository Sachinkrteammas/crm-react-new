
//..Dynamic Successfully message show according uer_type login..//
import React, { useState, useEffect } from "react";
import { login } from "../services/authService";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const AuthLoginCover = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    try {
      const response = await login(email, password);
      console.log("Login response:", response);

 
  // ✅ Show dynamic success message based on user_type
    const userType = response.user_type; // Super-Admin, Admin, Client
    setSuccessMessage(
      `Login Successfully ${userType}` // Dynamic message
    );


      // Store values in localStorage
      localStorage.setItem("token", response.access_token);
      localStorage.setItem("username", response.auth_person);
      localStorage.setItem("company_id", response.company_id);
      localStorage.setItem("user_type", response.user_type);

      localStorage.setItem("userData", JSON.stringify(response));

       // ✅ Save email if Remember Me checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password); // save password too
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }

      setTimeout(() => {
        const saved = localStorage.getItem("userData");
        console.log("✅ Confirmed saved userData:", saved);
        setSuccessMessage("");
        navigate("/dashboard");
      }, 1000); // wait 1 second instead of 500ms
      
    } catch (err) {
      console.error("Login error:", err);
      setFormError(err || "Invalid email or password");
    }
  };

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    const rememberedPassword = localStorage.getItem("rememberedPassword");

    if (rememberedEmail) setEmail(rememberedEmail);
    if (rememberedPassword) setPassword(rememberedPassword);
    
    if (rememberedEmail || rememberedPassword) setRememberMe(true);
  }, []);



  return (
    <div className="authentication-wrapper authentication-cover">
      <a href="#" className="app-brand auth-cover-brand">
        <span className="app-brand-text demo text-heading fw-bold flex items-center gap-2">
          <img 
            src="/assets/img/branding/logo.DialDesk.png" 
            alt="DialDesk Logo" 
            style={{ height: "50px", width: "auto" }}
          />
          {/* DialDesk */}
        </span>
      </a>

      <div className="authentication-inner row m-0">
        <div className="d-none d-xl-flex col-xl-8 p-0">
          <div className="auth-cover-bg d-flex justify-content-center align-items-center">
            <img
              src="/assets/img/illustrations/auth-login-illustration-light2.png"
              alt="auth-login-cover"
              className="my-5 auth-illustration"
            />
          </div>
        </div>

        <div className="d-flex col-12 col-xl-4 align-items-center authentication-bg p-sm-12 p-6 position-relative">
          <div className="w-px-400 mx-auto mt-12 pt-5">
            <h4 className="mb-1">Welcome to DialDesk!</h4>
            <p className="mb-6">
              Please sign-in to your account and start the adventure
            </p>

            {/* ✅ Show API-provided success message */}
            {successMessage && (
              <div className="alert alert-success text-center mb-4">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mb-6">
              {/* Email */}
              <div className="mb-6">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password with eye toggle */}
              <div className="mb-6">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="position-relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className={`form-control pe-5 ${
                      formError ? "is-invalid" : ""
                    }`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    required
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      color: "#6c757d",
                      display: "flex",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </span>
                  {formError && (
                    <div className="invalid-feedback">{formError}</div>
                  )}
                </div>
              </div>

              <div className="my-8 d-flex justify-content-between">
                <div className="form-check mb-0 ms-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="remember-me">
                    Remember Me
                  </label>
                </div>
                <Link to="/forgot-password">Forgot Password?</Link>
              </div>

              <button type="submit" className="btn btn-primary d-grid w-100">
                Sign in
              </button>
              <div className="text-center mt-4">
              <span>Don't have an account? </span>
              <Link
                to="/company_registration"
                className="btn btn-outline-primary btn-sm"
              >
                Sign Up
              </Link>
            </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLoginCover;
