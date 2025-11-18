import React, { useState } from "react";

const UploadExistingCustomers = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a file before uploading.");
      return;
    }
    alert(`File uploaded successfully: ${selectedFile.name}`);
  };

  return (
    <div className="row">
      <div className="col-12">
        {/* Page Title */}
        <h4 className="mb-4">Upload Existing Customers</h4>

        {/* Upload Card */}
        <div className="card">
          <div className="card-body">
            <h6 className="fw-semibold mb-3">Upload Existing Customers</h6>
            <hr />

            <form
              onSubmit={handleUpload}
              className="d-flex flex-column align-items-center justify-content-center py-3"
            >
              <div className="d-flex align-items-center justify-content-center mb-4">
                <label
                  htmlFor="fileUpload"
                  className="me-2 fw-semibold"
                  style={{ minWidth: "120px", textAlign: "right" }}
                >
                  Upload Base<span className="text-danger">*</span>
                </label>

                <input
                  type="file"
                  id="fileUpload"
                  className="form-control"
                  style={{ width: "260px" }}
                  onChange={handleFileChange}
                />

                <div className="ms-4 text-muted small">
                  Click On Import Format
                  <span className="text-danger">*</span>{" "}
                  <a href="#" className="text-primary text-decoration-none">
                    Download
                  </a>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary fw-semibold px-5"
                style={{ marginTop: "10px" }}
              >
                UPLOAD
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadExistingCustomers;
