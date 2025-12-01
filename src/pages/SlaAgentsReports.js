// SL/AL/RL Report For Hourly..//
import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../api";
import "../styles/loader.css";

export default function SlaAgentsReports() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("CrystalEyeCentr00000");

  const campaigns = [
    { id: "CrystalEyeCentr00000", name: "CrystalEyeCentr00000" }
  ]; // only this campaign

  useEffect(() => {
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
  }, []);

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
  };

  const pct = (v) =>
    v !== null && v !== undefined ? `${(v * 100).toFixed(2)}%` : "-";

  const validate = () => {
    if (!startDate || !endDate) {
      alert("Please select From and To dates");
      return false;
    }
    if (!selectedCampaign) {
      alert("Please select a campaign");
      return false;
    }
    return true;
  };

  const fetchReport = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const s = formatDate(startDate);
      const e = formatDate(endDate);

      const res = await api.get("/sla/agents", {
        params: {
          start_date: s,
          end_date: e,
          campaign_ids: selectedCampaign,
        },
      });

      // Map backend fields and filter hours 9-20
      const mapped = res.data?.data
        .map((r) => {
          const hour = r.TimeSlot ? parseInt(r.TimeSlot.substring(11, 13)) : null;
          return {
            date: r.TimeSlot?.substring(0, 10),
            hour,
            total_calls: r.TotalCalls,
            answered: r.Answered,
            abandon: r.Abandon,
            sla_calls: r.SLA_Calls,
            manpower: r.Manpower,
            al_percent: r.AL_Percentage != null ? r.AL_Percentage / 100 : null,
            sl_percent: r.SL_Percentage != null ? r.SL_Percentage / 100 : null,
          };
        })
        .filter((r) => r.hour >= 9 && r.hour <= 20);

      setRows(mapped || []);
    } catch (err) {
      console.error(err);
      alert("Could not load SLA Report");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const s = formatDate(startDate);
      const e = formatDate(endDate);

      const res = await api.get("/sla/agents/export", {
        params: {
          start_date: s,
          end_date: e,
          campaign_ids: selectedCampaign,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SLA_Report_${s}_to_${e}.xlsx`;
      a.click();
    } catch (err) {
      console.error(err);
      alert("Excel download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <div className="loader-overlay">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      )}

      <div className="mt-4">
        <h3 className="fw-bold mb-4">SLA Report </h3>

        <div className="card shadow-sm p-4 mb-4">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="fw-semibold d-block mb-1">Campaign</label>
              <select
                className="form-select"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="fw-semibold d-block mb-1">From Date</label>
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                className="form-control"
              />
            </div>

            <div className="col-md-2">
              <label className="fw-semibold d-block mb-1">To Date</label>
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                className="form-control"
              />
            </div>

            <div className="col-md-12 d-flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
                View Data
              </button>
              <button className="btn btn-success" onClick={downloadExcel} disabled={loading}>
                Download Excel
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card shadow-sm p-4">
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-dark">
                <tr>
                  <th>S.N</th>
                  <th>Date</th>
                  <th>Hour</th>
                  <th>Total</th>
                  <th>Answered</th>
                  <th>Manpower</th>
                  <th>AL%</th>
                  <th>SL%</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{r.date}</td>
                      <td>{r.hour}</td>
                      <td>{r.total_calls}</td>
                      <td>{r.answered}</td>
                      <td>{r.manpower}</td>
                      <td>{pct(r.al_percent)}</td>
                      <td>{pct(r.sl_percent)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="text-center py-3">
                      No Data Available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
