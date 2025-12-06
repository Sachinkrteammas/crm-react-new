import React, { useState } from "react";
import DialerMapping from "./DialerMapping";
import CampaignsMapping from "./CampaignsMapping";

export default function DidClientCampaignsMapping() {
  const [activePage, setActivePage] = useState(""); // EMPTY = show only menu

  return (
    <div className="py-3">
      <h4 className="mb-4">Clients & Campaigns Mapping</h4>

      {/* TAB BUTTONS */}
      <div className="mb-3">
        <button
          className={`btn ${activePage === "did" ? "btn-primary" : "btn-outline-primary"} me-2`}
          onClick={() => setActivePage("did")}
        >
          DID Client Mapping
        </button>

        <button
          className={`btn ${activePage === "campaign" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setActivePage("campaign")}
        >
          Campaign Mapping
        </button>
      </div>

      {/* SHOW PAGE ONLY AFTER CLICK */}
      <div>
        {activePage === "" && (
          <p className="text-secondary small">
            Please select a module above to continue.
          </p>
        )}

        {activePage === "did" && <DialerMapping />}

        {activePage === "campaign" && <CampaignsMapping />}
      </div>
    </div>
  );
}
