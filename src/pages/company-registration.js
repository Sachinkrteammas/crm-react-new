//.....New Updated Code..//
import React, { useState } from "react";
import "../styles/stepper.css";

export default function WizardForm() {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    // Step 1 - Company Registration
    companyName: "",
    regAddress1: "",
    regAddress2: "",
    city: "",
    state: "",
    gst: "",
    pincode: "",
    authorisedPerson: "",
    designation: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    commAddress1: "",
    commAddress2: "",
    commCity: "",
    commState: "",
    commPincode: "",
    // Step 2
    contactPerson1: "",
    designation1: "",
    mobile1: "",
    email1: "",
    contactPerson2: "",
    designation2: "",
    mobile2: "",
    email2: "",
    contactPerson3: "",
    designation3: "",
    mobile3: "",
    email3: "",
    // Step 3 - Files
    incorporationCertificate: "",
    panCard: "",
    authorizedAddressProof: "",
    otherDocuments: "",
    billingAddressProof: "",
    authorizedId: "",
    companyLogo: "",
    termsAccepted: false,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    let newValue = value;

    // Restrict digits for mobile & pincode fields
    if (name === "mobile") {
      newValue = value.replace(/\D/g, "").slice(0, 10);
    }
    if (name === "pincode" || name === "commPincode") {
      newValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : newValue,
    }));
  };

  // Validation per step
  const validateStep = (step) => {
    let newErrors = {};

    // Step 1 - Company Registration
    if (step === 1) {
      if (!formData.companyName) newErrors.companyName = true;
      if (!formData.regAddress1) newErrors.regAddress1 = true;
      if (!formData.regAddress2) newErrors.regAddress2 = true;
      if (!formData.city) newErrors.city = true;
      if (!formData.state) newErrors.state = true;

      if (!formData.gst) newErrors.gst = true;
      if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = true;

      if (!formData.authorisedPerson) newErrors.authorisedPerson = true;
      if (!formData.designation) newErrors.designation = true;

      if (!/^\d{10}$/.test(formData.mobile)) newErrors.mobile = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        newErrors.email = true;

      if (!formData.password) newErrors.password = true;
      if (
        !formData.confirmPassword ||
        formData.password !== formData.confirmPassword
      )
        newErrors.confirmPassword = true;

      if (!formData.commAddress1) newErrors.commAddress1 = true;
      if (!formData.commAddress2) newErrors.commAddress2 = true;
      if (!formData.commCity) newErrors.commCity = true;
      if (!formData.commState) newErrors.commState = true;

      if (!/^\d{6}$/.test(formData.commPincode)) newErrors.commPincode = true;
    }

    // Step 2 - Personal Info (Contact Persons)
    if (step === 2) {
      // At least first person is mandatory
      if (!formData.contactPerson1) newErrors.contactPerson1 = true;
      if (!formData.designation1) newErrors.designation1 = true;
      if (!/^\d{10}$/.test(formData.mobile1 || "")) newErrors.mobile1 = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email1 || ""))
        newErrors.email1 = true;

      // Person 2 & 3 optional → only validate if something is filled
      if (
        formData.contactPerson2 ||
        formData.designation2 ||
        formData.mobile2 ||
        formData.email2
      ) {
        if (!formData.contactPerson2) newErrors.contactPerson2 = true;
        if (!formData.designation2) newErrors.designation2 = true;
        if (formData.mobile2 && !/^\d{10}$/.test(formData.mobile2))
          newErrors.mobile2 = true;
        if (
          formData.email2 &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email2)
        )
          newErrors.email2 = true;
      }

      if (
        formData.contactPerson3 ||
        formData.designation3 ||
        formData.mobile3 ||
        formData.email3
      ) {
        if (!formData.contactPerson3) newErrors.contactPerson3 = true;
        if (!formData.designation3) newErrors.designation3 = true;
        if (formData.mobile3 && !/^\d{10}$/.test(formData.mobile3))
          newErrors.mobile3 = true;
        if (
          formData.email3 &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email3)
        )
          newErrors.email3 = true;
      }
    }

    // Step 3 - Document Uploads (validate mandatory fields)
    if (step === 3) {
      if (!formData.panCard) newErrors.panCard = true;
      if (!formData.termsAccepted) newErrors.termsAccepted = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep((prev) => prev + 1);
  };

  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateStep(step)) {
      alert("Form submitted successfully!");
    }
  };

  return (
    <div className="content-wrapper">
      <div className="container-xxl flex-grow-1 container-p-y">
        <div className="col-12 mb-6">
          {/* ✅ Common Logo Header */}
          <div
            style={{
              textAlign: "center",
              marginTop: "110px",
              marginBottom: "20px",
            }}
          >
            <img
              src="assets\img\branding\logo.DialDesk.png"
              alt="DialDesk Logo"
              style={{ height: "100px" }}
            />
          </div>

          <div className="col-12 mb-6">
            <h4 className="fw-medium">Company Registration</h4>
            <div className="mt-6 max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-6">
              {/* Stepper Header */}

              <div className="bs-stepper">
                <div className="bs-stepper-header">
                  {/* Step 1 */}
                  <div className={`step ${step === 1 ? "active" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="step-trigger"
                    >
                      <span className="bs-stepper-circle">1</span>
                      <span className="bs-stepper-label">
                        <span className="bs-stepper-title">
                          Company Registration
                        </span>
                      </span>
                    </button>
                  </div>

                  <div className="line"></div>

                  {/* Step 2 */}
                  <div className={`step ${step === 2 ? "active" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="step-trigger"
                    >
                      <span className="bs-stepper-circle">2</span>
                      <span className="bs-stepper-label">
                        <span className="bs-stepper-title">Contact Person</span>
                      </span>
                    </button>
                  </div>

                  <div className="line"></div>

                  {/* Step 3 */}
                  <div className={`step ${step === 3 ? "active" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="step-trigger"
                    >
                      <span className="bs-stepper-circle">3</span>
                      <span className="bs-stepper-label">
                        <span className="bs-stepper-title">
                          Documents Upload
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Stepper Content */}
              <div className="bs-stepper-content mt-4">
                <form onSubmit={handleSubmit}>
                  {/* Step 1 - Company Registration */}
                  {step === 1 && (
                    <div>
                      <h6>Company Registration</h6>
                      <div className="row g-3 mt-3">
                        {/* Left Column */}
                        <div className="col-sm-4">
                          <input
                            type="text"
                            name="companyName"
                            className={`form-control ${
                              errors.companyName ? "is-invalid" : ""
                            }`}
                            placeholder="Company Name"
                            value={formData.companyName}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="regAddress1"
                            className={`form-control mt-2 ${
                              errors.regAddress1 ? "is-invalid" : ""
                            }`}
                            placeholder="Registered Office Address 1"
                            value={formData.regAddress1}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="regAddress2"
                            className={`form-control mt-2 ${
                              errors.regAddress2 ? "is-invalid" : ""
                            }`}
                            placeholder="Registered Office Address 2"
                            value={formData.regAddress2}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="city"
                            className={`form-control mt-2 ${
                              errors.city ? "is-invalid" : ""
                            }`}
                            placeholder="City"
                            value={formData.city}
                            onChange={handleChange}
                          />
                          <select
                            name="state"
                            className={`form-select mt-2 ${
                              errors.state ? "is-invalid" : ""
                            }`}
                            value={formData.state}
                            onChange={handleChange}
                          >
                            <option value="">Select State</option>
                            <option>Delhi</option>
                            <option>Maharashtra</option>
                            <option>Karnataka</option>
                            <option>Tamil Nadu</option>
                          </select>
                          <input
                            type="text"
                            name="gst"
                            className={`form-control mt-2 ${
                              errors.gst ? "is-invalid" : ""
                            }`}
                            placeholder="GST No."
                            value={formData.gst}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="pincode"
                            className={`form-control mt-2 ${
                              errors.pincode ? "is-invalid" : ""
                            }`}
                            placeholder="Pincode"
                            value={formData.pincode}
                            onChange={handleChange}
                          />
                        </div>

                        {/* Middle Column */}
                        <div className="col-sm-4">
                          <input
                            type="text"
                            name="authorisedPerson"
                            className={`form-control ${
                              errors.authorisedPerson ? "is-invalid" : ""
                            }`}
                            placeholder="Authorised Person"
                            value={formData.authorisedPerson}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="designation"
                            className={`form-control mt-2 ${
                              errors.designation ? "is-invalid" : ""
                            }`}
                            placeholder="Designation"
                            value={formData.designation}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="mobile"
                            className={`form-control mt-2 ${
                              errors.mobile ? "is-invalid" : ""
                            }`}
                            placeholder="Mobile No"
                            value={formData.mobile}
                            onChange={handleChange}
                          />
                          <input
                            type="email"
                            name="email"
                            className={`form-control mt-2 ${
                              errors.email ? "is-invalid" : ""
                            }`}
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                          />

                          {/* Password field with toggle */}
                          <div className="input-group mt-2">
                            <input
                              type={showPassword ? "text" : "password"}
                              name="password"
                              className={`form-control ${
                                errors.password ? "is-invalid" : ""
                              }`}
                              placeholder="Password"
                              value={formData.password}
                              onChange={handleChange}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? "Hide" : "Show"}
                            </button>
                          </div>

                          {/* Confirm Password field with toggle */}
                          <div className="input-group mt-2">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirmPassword"
                              className={`form-control ${
                                errors.confirmPassword ? "is-invalid" : ""
                              }`}
                              placeholder="Confirm Password"
                              value={formData.confirmPassword}
                              onChange={handleChange}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                            >
                              {showConfirmPassword ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="col-sm-4">
                          <div className="d-flex align-items-center mt-3 mb-3">
                            <small className="me-2">
                              Same As Registered Office
                            </small>
                            <input
                              type="checkbox"
                              className="form-check-input"
                            />
                          </div>
                          <input
                            type="text"
                            name="commAddress1"
                            className={`form-control mt-2 ${
                              errors.commAddress1 ? "is-invalid" : ""
                            }`}
                            placeholder="Communication Office Address 1"
                            value={formData.commAddress1}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="commAddress2"
                            className={`form-control mt-2 ${
                              errors.commAddress2 ? "is-invalid" : ""
                            }`}
                            placeholder="Communication Office Address 2"
                            value={formData.commAddress2}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="commCity"
                            className={`form-control mt-2 ${
                              errors.commCity ? "is-invalid" : ""
                            }`}
                            placeholder="City"
                            value={formData.commCity}
                            onChange={handleChange}
                          />
                          <select
                            name="commState"
                            className={`form-select mt-2 ${
                              errors.commState ? "is-invalid" : ""
                            }`}
                            value={formData.commState}
                            onChange={handleChange}
                          >
                            <option value="">Select State</option>
                            <option>Delhi</option>
                            <option>Maharashtra</option>
                            <option>Karnataka</option>
                            <option>Tamil Nadu</option>
                          </select>
                          <input
                            type="text"
                            name="commPincode"
                            className={`form-control mt-2 ${
                              errors.commPincode ? "is-invalid" : ""
                            }`}
                            placeholder="Pincode"
                            value={formData.commPincode}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="d-flex justify-content-between mt-4">
                        <button
                          className="btn btn-label-secondary btn-prev"
                          disabled
                        >
                          <i class="icon-base ti tabler-arrow-left icon-xs me-sm-2 me-0"></i>
                          Previous
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-next"
                          onClick={nextStep}
                        >
                          Next
                          <i className="icon-base ti tabler-arrow-right icon-xs ms-2"></i>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2 */}
                  {step === 2 && (
                    <div>
                      <h6>Contact Persons</h6>
                      <small>
                        Note - Details of at least one person is mandatory.
                      </small>

                      <div className="row g-3 mt-3">
                        {/* Contact Person 1 */}
                        <div className="col-sm-4">
                          <input
                            type="text"
                            name="contactPerson1"
                            className={`form-control ${
                              errors.contactPerson1 ? "is-invalid" : ""
                            }`}
                            placeholder="Contact Person 1"
                            value={formData.contactPerson1 || ""}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="designation1"
                            className={`form-control mt-2 ${
                              errors.designation1 ? "is-invalid" : ""
                            }`}
                            placeholder="Designation"
                            value={formData.designation1 || ""}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="mobile1"
                            className={`form-control mt-2 ${
                              errors.mobile1 ? "is-invalid" : ""
                            }`}
                            placeholder="Mobile No"
                            value={formData.mobile1 || ""}
                            onChange={handleChange}
                          />
                          <input
                            type="email"
                            name="email1"
                            className={`form-control mt-2 ${
                              errors.email1 ? "is-invalid" : ""
                            }`}
                            placeholder="Email"
                            value={formData.email1 || ""}
                            onChange={handleChange}
                          />
                        </div>

                        {/* Contact Person 2 */}
                        <div className="col-sm-4">
                          <input
                            type="text"
                            name="contactPerson2"
                            className={`form-control ${
                              errors.contactPerson2 ? "is-invalid" : ""
                            }`}
                            placeholder="Contact Person 2"
                            value={formData.contactPerson2 || ""}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="designation2"
                            className={`form-control mt-2 ${
                              errors.designation2 ? "is-invalid" : ""
                            }`}
                            placeholder="Designation"
                            value={formData.designation2 || ""}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="mobile2"
                            className={`form-control mt-2 ${
                              errors.mobile2 ? "is-invalid" : ""
                            }`}
                            placeholder="Mobile No"
                            value={formData.mobile2 || ""}
                            onChange={handleChange}
                          />
                          <input
                            type="email"
                            name="email2"
                            className={`form-control mt-2 ${
                              errors.email2 ? "is-invalid" : ""
                            }`}
                            placeholder="Email"
                            value={formData.email2 || ""}
                            onChange={handleChange}
                          />
                        </div>

                        {/* Contact Person 3 */}
                        <div className="col-sm-4">
                          <input
                            type="text"
                            name="contactPerson3"
                            className={`form-control ${
                              errors.contactPerson3 ? "is-invalid" : ""
                            }`}
                            placeholder="Contact Person 3"
                            value={formData.contactPerson3 || ""}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="designation3"
                            className={`form-control mt-2 ${
                              errors.designation3 ? "is-invalid" : ""
                            }`}
                            placeholder="Designation"
                            value={formData.designation3 || ""}
                            onChange={handleChange}
                          />
                          <input
                            type="text"
                            name="mobile3"
                            className={`form-control mt-2 ${
                              errors.mobile3 ? "is-invalid" : ""
                            }`}
                            placeholder="Mobile No"
                            value={formData.mobile3 || ""}
                            onChange={handleChange}
                          />
                          <input
                            type="email"
                            name="email3"
                            className={`form-control mt-2 ${
                              errors.email3 ? "is-invalid" : ""
                            }`}
                            placeholder="Email"
                            value={formData.email3 || ""}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="d-flex justify-content-between mt-4">
                        <button
                          type="button"
                          className="btn btn-label-secondary btn-prev"
                          onClick={prevStep}
                        >
                          <i className="icon-base ti tabler-arrow-left icon-xs me-sm-2 me-0"></i>
                          Previous
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-next"
                          onClick={nextStep}
                        >
                          Next
                          <i className="icon-base ti tabler-arrow-right icon-xs ms-2"></i>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3 */}
                  {step === 3 && (
                    <div>
                      <h6 className="mb-3">Document Uploads</h6>

                      <div className="row g-3">
                        {/* Left Column */}
                        <div className="col-sm-6">
                          {/* Incorporation Certificate */}
                          <div className="mb-3 d-flex align-items-center">
                            <input
                              type="text"
                              className="form-control col"
                              placeholder="Incorporation Certificate"
                              value={formData.incorporationCertificate || ""}
                              readOnly
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary ms-2"
                              onClick={() =>
                                document
                                  .getElementById("incorporationCertificate")
                                  .click()
                              }
                            >
                              Choose File
                            </button>
                            <input
                              type="file"
                              id="incorporationCertificate"
                              name="incorporationCertificate"
                              onChange={handleChange}
                              className="d-none"
                              accept=".jpg,.jpeg,.png,.gif,.pdf"
                            />
                          </div>

                          {/* PAN Card */}
                          <div className="mb-3 d-flex align-items-center">
                            <input
                              type="text"
                              className={`form-control col ${
                                errors.panCard ? "is-invalid" : ""
                              }`}
                              placeholder="PAN Card"
                              value={formData.panCard || ""}
                              readOnly
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary ms-2"
                              onClick={() =>
                                document.getElementById("panCard").click()
                              }
                            >
                              Choose File
                            </button>
                            <input
                              type="file"
                              id="panCard"
                              name="panCard"
                              onChange={handleChange}
                              className="d-none"
                              accept=".jpg,.jpeg,.png,.gif,.pdf"
                            />
                          </div>

                          {/* Authorized Address Proof */}
                          <div className="mb-3 d-flex align-items-center">
                            <input
                              type="text"
                              className="form-control col"
                              placeholder="Authorized Address Proof"
                              value={formData.authorizedAddressProof || ""}
                              readOnly
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary ms-2"
                              onClick={() =>
                                document
                                  .getElementById("authorizedAddressProof")
                                  .click()
                              }
                            >
                              Choose File
                            </button>
                            <input
                              type="file"
                              id="authorizedAddressProof"
                              name="authorizedAddressProof"
                              onChange={handleChange}
                              className="d-none"
                              accept=".jpg,.jpeg,.png,.gif,.pdf"
                            />
                          </div>

                          {/* Other Documents */}
                          <div className="mb-3 d-flex align-items-center">
                            <input
                              type="text"
                              className="form-control col"
                              placeholder="Other Documents"
                              value={formData.otherDocuments || ""}
                              readOnly
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary ms-2"
                              onClick={() =>
                                document
                                  .getElementById("otherDocuments")
                                  .click()
                              }
                            >
                              Choose File
                            </button>
                            <input
                              type="file"
                              id="otherDocuments"
                              name="otherDocuments"
                              onChange={handleChange}
                              className="d-none"
                              accept=".jpg,.jpeg,.png,.gif,.pdf"
                            />
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="col-sm-6">
                          {/* Billing Address Proof */}
                          <div className="mb-3 d-flex align-items-center">
                            <input
                              type="text"
                              className="form-control col"
                              placeholder="Billing Address Proof"
                              value={formData.billingAddressProof || ""}
                              readOnly
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary ms-2"
                              onClick={() =>
                                document
                                  .getElementById("billingAddressProof")
                                  .click()
                              }
                            >
                              Choose File
                            </button>
                            <input
                              type="file"
                              id="billingAddressProof"
                              name="billingAddressProof"
                              onChange={handleChange}
                              className="d-none"
                              accept=".jpg,.jpeg,.png,.gif,.pdf"
                            />
                          </div>

                          {/* Authorized Person ID */}
                          <div className="mb-3 d-flex align-items-center">
                            <input
                              type="text"
                              className="form-control col"
                              placeholder="Authorized Person ID"
                              value={formData.authorizedId || ""}
                              readOnly
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary ms-2"
                              onClick={() =>
                                document.getElementById("authorizedId").click()
                              }
                            >
                              Choose File
                            </button>
                            <input
                              type="file"
                              id="authorizedId"
                              name="authorizedId"
                              onChange={handleChange}
                              className="d-none"
                              accept=".jpg,.jpeg,.png,.gif,.pdf"
                            />
                          </div>

                          {/* Company Logo */}
                          <div className="mb-3 d-flex align-items-center">
                            <input
                              type="text"
                              className="form-control col"
                              placeholder="Company Logo"
                              value={formData.companyLogo || ""}
                              readOnly
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary ms-2"
                              onClick={() =>
                                document.getElementById("companyLogo").click()
                              }
                            >
                              Choose File
                            </button>
                            <input
                              type="file"
                              id="companyLogo"
                              name="companyLogo"
                              onChange={handleChange}
                              className="d-none"
                              accept=".jpg,.jpeg,.png,.gif,.pdf"
                            />
                          </div>

                          {/* Terms */}
                          <div className="form-check mt-4">
                            <input
                              type="checkbox"
                              name="termsAccepted"
                              checked={formData.termsAccepted || false}
                              onChange={handleChange}
                              className={`form-check-input ${
                                errors.termsAccepted ? "is-invalid" : ""
                              }`}
                            />
                            <span className="form-check-label">
                              I accept Terms & Conditions{" "}
                              <span className="text-danger">*</span>
                            </span>
                            {errors.termsAccepted && (
                              <div className="invalid-feedback">
                                You must accept Terms
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Note */}
                      <p className="text-muted mt-2">
                        Note - Please use only jpg, gif, png, pdf for upload.
                      </p>

                      {/* Footer Buttons */}
                      <div className="d-flex justify-content-between mt-4">
                        <button
                          type="button"
                          className="btn btn-label-secondary btn-prev"
                          onClick={prevStep}
                        >
                          <i className="icon-base ti tabler-arrow-left icon-xs me-sm-2 me-0"></i>
                          Previous
                        </button>
                        <button
                          type="submit"
                          className="btn btn-success btn-submit"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
