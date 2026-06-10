import React, { useState, useEffect } from "react";
import api from "../api";

const ShopifyIntegration = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [clientId, setClientId] = useState(companyId);
  const [clients, setClients] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [shopifyToken, setShopifyToken] = useState("");
  const [listId, setListId] = useState("");

  // ✅ Key → Label mapping
  const fieldMap = {
    phone_number: "Phone Number",
    title: "Title",
    first_name: "First Name",
    middle_initial: "Middle Initial",
    last_name: "Last Name",
    address1: "Address1",
    address2: "Address2",
    address3: "Address3",
    city: "City",
    state: "State",
    province: "Province",
    postal_code: "Postal Code",
    country_code: "Country Code",
    gender: "Gender",
    date_of_birth: "Date Of Birth",
    alt_phone: "Alt Phone",
    email: "Email",
    comments: "Comments",
  };

  const fields = Object.keys(fieldMap);

  const activeClientId =
    userType === "Super-Admin" || userType === "Admin"
      ? clientId
      : companyId;

  /* ---------------------------
     FETCH CLIENTS
  --------------------------- */
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api.get("/agents/clients-rights").then((res) => {
        const sorted = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name)
        );
        setClients(sorted);
      });
    }
  }, [userType]);

  /* ---------------------------
     AUTO SET CLIENT
  --------------------------- */
  useEffect(() => {
    if (!(userType === "Super-Admin" || userType === "Admin")) {
      setClientId(companyId);
    }
  }, [userType, companyId]);

  /* ---------------------------
     FETCH SELECTED FIELDS FROM API
  --------------------------- */
  useEffect(() => {
    if (!activeClientId) return;

    const fetchFields = async () => {
      try {
        setLoadingFields(true);

        const res = await api.get(
          `/bot/get-client-fields?client_id=${activeClientId}`
        );

        if (res.data?.status === "success") {
          setSelectedFields(res.data.fields || []);
        }
      } catch (err) {
        console.error("Error fetching fields:", err);
        setSelectedFields([]);
      } finally {
        setLoadingFields(false);
      }
    };

    fetchFields();
  }, [activeClientId]);

  /* ---------------------------
     HANDLE CHECKBOX
  --------------------------- */
  const handleCheckboxChange = (fieldKey) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleSave = async () => {
    if (!activeClientId) {
        alert("Please select client");
        return;
    }

    if (selectedFields.length === 0) {
        alert("Please select at least one field");
        return;
    }

    try {
        const res = await api.post(
        `/bot/save-client-fields?client_id=${activeClientId}`,
        {
            fields: selectedFields,
            list_id: listId
        }
        );

        if (res.data?.status === "success") {
        alert("Fields saved successfully ✅");

        } else {
        alert("Failed to save fields");
        }
    } catch (err) {
        console.error("Save error:", err);
        alert("Error saving fields");
    }
  };

  useEffect(() => {
    if (!activeClientId) return;

    const fetchToken = async () => {
        try {
        const res = await api.get(
            `/bot/get-shopify-token?client_id=${activeClientId}`
        );

        if (res.data?.status === "success") {
            setShopifyToken(res.data.token || "");
            setListId(res.data.list_id || "");
        }
        } catch (err) {
        console.error("Token fetch error:", err);
        setShopifyToken("");
        }
    };

    fetchToken();
  }, [activeClientId]);



  return (
    <div className="container py-4">
      <div className="card p-4 shadow-sm">
        <h4 className="mb-4">Shopify Integration Field Mapping</h4>

        {/* Client Dropdown */}
        <div className="d-flex flex-wrap gap-3 mb-4">
          {(userType === "Super-Admin" || userType === "Admin") && (
            <div style={{ maxWidth: "250px" }}>
              <label className="form-label">Select Client</label>
              <select
                className="form-select"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">-- Select Client --</option>
                {clients.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ maxWidth: "250px" }}>
          <label className="form-label">List ID</label>
          <input
            type="number"
            className="form-control"
            value={listId}
            onChange={(e) => setListId(e.target.value)}
          />
        </div>
        </div>



        {/* Mapping Section */}
        <div className="row g-3">
          {/* LEFT */}
          <div className="col-md-6">
            <div className="card p-3 h-100">
                <h6 className="mb-3">Field Selection</h6>

                {!activeClientId ? (
                <p className="text-muted">Please select client first</p>
                ) : loadingFields ? (
                <p className="text-muted">Loading...</p>
                ) : (
                <div className="d-flex flex-column gap-2">
                    {fields.map((key) => (
                    <div className="form-check" key={key}>
                        <input
                        className="form-check-input"
                        type="checkbox"
                        checked={selectedFields.includes(key)}
                        onChange={() => handleCheckboxChange(key)}
                        id={key}
                        />
                        <label className="form-check-label" htmlFor={key}>
                        {fieldMap[key]}
                        </label>
                    </div>
                    ))}
                </div>
                )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-md-6">
            <div className="card p-3 h-100">
                <h6 className="mb-3">Selected Fields</h6>

                {!activeClientId ? (
                <p className="text-muted">Please select client first</p>
                ) : selectedFields.length === 0 ? (
                <p className="text-muted">No fields selected</p>
                ) : (
                <ul className="list-group">
                    {selectedFields.map((key) => (
                    <li
                        key={key}
                        className="list-group-item d-flex justify-content-between align-items-center"
                    >
                        {fieldMap[key]}
                        <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleCheckboxChange(key)}
                        >
                        Remove
                        </button>
                    </li>
                    ))}
                </ul>
                )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-4">
          <button className="btn btn-primary" onClick={handleSave}  disabled={!activeClientId || selectedFields.length === 0}>
            Save Mapping
          </button>

          <button
            className="btn btn-success ms-3"
            onClick={() => setShowModal(true)}
          >
            Show Webhook
          </button>
        </div>
      </div>


        {showModal && (
        <div
            className="modal show fade d-block"
            style={{ background: "rgba(0,0,0,0.5)" }}
        >
            <div className="modal-dialog modal-lg">
            <div className="modal-content">

                {/* Header */}
                <div className="modal-header">
                <h5 className="modal-title">Shopify Webhook Details</h5>
                <button
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                />
                </div>

                {/* Body */}
                <div className="modal-body">

                {/* Token */}
                <div className="mb-3">
                    <h6>Shopify Token</h6>
                    <code className="text-primary">{shopifyToken || "Token not generated yet"}</code>
                </div>

                {/* API Endpoint */}
                <div className="mb-3">
                    <h6>API Endpoint</h6>
                    <code>
                    https://crmapi.dialdesk.in/bot/shopify/webhook-api
                    </code>
                </div>

                {/* Request Headers */}
                <div className="mb-3">
                    <h6>Request Headers</h6>
                    <pre className="bg-light p-2 rounded">
                        {JSON.stringify(
                        {
                            "Content-Type": "application/json",
                            "Auth-Token": shopifyToken
                        },
                        null,
                        2
                        )}
                    </pre>
                </div>

                {/* Request Body */}
                <div className="mb-3">
                <h6>Request Data</h6>

                <pre
                    className="p-3 rounded text-white"
                    style={{ background: "#111", overflowX: "auto" }}
                >
                    {JSON.stringify(
                    selectedFields.reduce((acc, key) => {
                        acc[key] = "";
                        return acc;
                    }, {}),
                    null,
                    2
                    )}
                </pre>
                </div>

                {/* Response */}
                <div className="mb-3">
                <h6>Sample Response</h6>

                <pre 
                className="bg-light p-2 rounded">
                    {JSON.stringify(
                    shopifyToken
                        ? {
                            status: "success",
                            message: "Webhook triggered successfully",
                        }
                        : {
                            status: "error",
                            message: "Auth token missing",
                        },
                    null,
                    2
                    )}
                </pre>
                </div>

                </div>

                {/* Footer */}
                <div className="modal-footer">
                <button
                    className="btn btn-primary"
                    onClick={() => setShowModal(false)}
                >
                    Close
                </button>
                </div>

            </div>
            </div>
        </div>
        )}
    </div>
  );
};

export default ShopifyIntegration;