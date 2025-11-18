import React, { useState } from "react";

const ManageWorkFlow = () => {
  const [isWhatsAppBot, setIsWhatsAppBot] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState("");
  const [callType, setCallType] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(
      `Workflow Submitted:\nWhatsApp Bot: ${isWhatsAppBot}\nFlow: ${selectedFlow}\nType: ${callType}`
    );
  };

  return (
    <div className="row">
      <div className="col-12">
        {/* Page Title */}
        <h4 className="mb-4">Manage Work Flow</h4>

        {/* Card */}
        <div className="card">
          <div className="card-body">
            <h6 className="fw-semibold mb-3">Manage Work Flow</h6>

            {/* Workflow Controls */}
            <form onSubmit={handleSubmit}>
              <div className="d-flex align-items-center mb-4" style={{ gap: "15px" }}>
                <div className="form-check">
                  {/* <input
                    className="form-check-input"
                    type="checkbox"
                    id="whatsappBot"
                    checked={isWhatsAppBot}
                    onChange={(e) => setIsWhatsAppBot(e.target.checked)}
                  /> */}
                  <label >
                    WhatsApp Bot
                  </label>
                </div>

                <button
                  type="button"
                  className={`btn btn-outline-secondary btn-sm ${
                    selectedFlow === "start" ? "active" : ""
                  }`}
                  onClick={() => setSelectedFlow("start")}
                >
                  Start
                </button>

                <button
                  type="button"
                  className={`btn btn-outline-secondary btn-sm ${
                    selectedFlow === "end" ? "active" : ""
                  }`}
                  onClick={() => setSelectedFlow("end")}
                >
                  End
                </button>

                <div className="form-check ms-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="callType"
                    id="dialdesk"
                    value="Dialdesk"
                    checked={callType === "Dialdesk"}
                    onChange={(e) => setCallType(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="dialdesk">
                    Dialdesk
                  </label>
                </div>

                <div className="form-check ms-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="callType"
                    id="internal"
                    value="Internal"
                    checked={callType === "Internal"}
                    onChange={(e) => setCallType(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="internal">
                    Internal
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn btn-primary px-4 fw-semibold">
                SUBMIT
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageWorkFlow;
