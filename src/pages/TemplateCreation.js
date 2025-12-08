import React, { useState, useEffect, useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import api from "../api";

export default function TemplateCreation() {

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const companyId = localStorage.getItem("company_id");
  const userType = localStorage.getItem("user_type");

  const [fields, setFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [templateType, setTemplateType] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [manualText, setManualText] = useState("");
  const [templateText, setTemplateText] = useState("");

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/agents/clients-rights");
        const sortedClients = res.data.sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "en", { sensitivity: "base" })
        );
        setClients(sortedClients);
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (userType === "Client") setSelectedClient(companyId);
    else if ((userType === "Super-Admin" || userType === "Admin") && clients.length === 1)
      setSelectedClient(clients[0].company_id);
  }, [userType, companyId, clients]);


  useEffect(() => {
    if (selectedClient) fetchFields(selectedClient);
  }, [selectedClient]);

  const fetchFields = async (clientId) => {
    try {
      const res = await api.get(`/core_api/fields?client_id=${clientId}`);
      setFields(res.data);
    } catch (err) {
      console.error("Error fetching fields:", err);
    }
  };

  useEffect(() => {

    const scenarioTokens = selectedScenarios.map(s => `:${s}:`);
    const fieldTokens = selectedFields.map(f => {
      const fieldObj = fields.find(fd => String(fd.fieldNumber) === String(f));
      return fieldObj ? `:${fieldObj.FieldName}:` : "";
    });

    const allTokens = [...scenarioTokens, ...fieldTokens];

    let updatedText = manualText;
    allTokens.forEach(token => {
      if (!updatedText.includes(token)) {
        updatedText += token;
      }
    });

    setTemplateText(updatedText);
  }, [selectedScenarios, selectedFields, fields, manualText]);

  const handleScenarioChange = (e) => {
    const options = Array.from(e.target.selectedOptions, opt => opt.value);
    setSelectedScenarios(options);
  };

  const handleFieldChange = (e) => {
    const options = Array.from(e.target.selectedOptions, opt => opt.value);
    setSelectedFields(options);
  };

  const handleManualTextChange = (e) => {
    setManualText(e.target.value);
  };


  const handleSave = async () => {
    if (!selectedClient) return alert("Please select a client first.");
    try {
      const formData = new FormData();
      formData.append("template_name", templateName);
      formData.append("template_type", templateType);
      formData.append("tagging", JSON.stringify(selectedScenarios));
      formData.append("required_fields", JSON.stringify(selectedFields));
      formData.append("template_text", templateText);

      await api.post(`/templates/insert?client_id=${selectedClient}`, formData);
      alert("Template saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving template");
    }
  };


  const handleReset = () => {
    setTemplateType("");
    setTemplateName("");
    setSelectedScenarios([]);
    setSelectedFields([]);
    setManualText("");
    setTemplateText("");
  };


  return(
    <div className="row">
      <div className="col-12">
        <h3>Manage Templates</h3>
      </div>

      {/* Select Client (same as ManageCloseField) */}
      {(userType === "Super-Admin" || userType === "Admin") && (
        <div className="card col-12 mb-4">
          <div className="card-body col-md-4">
            <label className="form-label fw-semibold">Select Client</label>
            <select
              className="form-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">-- Select Client --</option>
              {clients.map((client) => (
                <option key={client.company_id} value={String(client.company_id)}>
                  {client.company_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {selectedClient ? (
        <div className="col-12">
          <div className="d-flex">
            <div className="flex-fill">
              <div className="card shadow-sm border-0 rounded-3">
                  <div className="card-body">
                    <h5 className="card-title mb-4 text-secondary">Template Management</h5>
                    <form className="row g-4">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Template Type</label>
                        <select
                          className="form-select shadow-sm rounded-2"
                          value={templateType}
                          onChange={(e) => setTemplateType(e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="SMS">SMS</option>
                          <option value="Email">Email</option>
                          <option value="WhatsApp">WhatsApp</option>
                        </select>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Template Name</label>
                        <input
                          type="text"
                          className="form-control shadow-sm rounded-2"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Enter template name"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Select Scenario</label>
                        <select
                          className="form-select shadow-sm rounded-2"
                          multiple
                          value={selectedScenarios}
                          onChange={handleScenarioChange}
                        >
                          <option value="Scenario">Scenario</option>
                          <option value="Sub Scenario 1">Sub Scenario 1</option>
                          <option value="Sub Scenario 2">Sub Scenario 2</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Select Fields</label>
                        <select
                          className="form-select shadow-sm rounded-2"
                          multiple
                          value={selectedFields}
                          onChange={handleFieldChange}
                        >
                          {fields.map((f) => (
                            <option key={f.fieldNumber} value={f.fieldNumber}>
                              {f.FieldName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-12">
                        <label className="form-label fw-semibold">Template Text</label>
                        <Editor
                          apiKey="ofd6e9qqhtme50qw3m5m9blembl5sv38ngr7dijtcet3e0sy"   // optional, TinyMCE works without it
                          value={templateText}
                          onEditorChange={(content) => {
                            setManualText(content);
                            setTemplateText(content);
                          }}
                          init={{
                            height: 300,
                            menubar: false,
                            branding: false,
                            promotion: false,
                            plugins: [
                              "advlist autolink lists link charmap preview anchor",
                              "searchreplace visualblocks code fullscreen",
                              "insertdatetime table paste help wordcount"
                            ],
                            toolbar:
                              "undo redo | bold italic underline | " +
                              "alignleft aligncenter alignright alignjustify | " +
                              "bullist numlist outdent indent | " +
                              "removeformat | code | preview",
                          }}
                        />
                      </div>

                      <div className="col-12 d-flex justify-content-center gap-3 mt-4">
                        <button type="button" className="btn btn-primary shadow-sm px-5 py-2 rounded-3" onClick={handleSave}>
                          ADD
                        </button>
                        <button
                          type="reset"
                          className="btn btn-outline-secondary shadow-sm px-5 py-2 rounded-3"
                          onClick={handleReset}
                        >
                          RESET
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
      ) : (
        (userType === "Super-Admin" || userType === "Admin") && (
          <p className="card-title text-muted">Please select a client to manage templates.</p>
        )
      )}
    </div>
  );
}