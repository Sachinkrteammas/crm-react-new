import React, { useEffect, useState } from "react";
import api from "../api";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export default function SaatvikDashboard() {
  const today = new Date().toISOString().split("T")[0];

    const [loading, setLoading] = useState(true);

    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);

  const [dashboard, setDashboard] = useState({
    ivr_summary: {},
    digital_summary: {},
    latest_leads: [],
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const today = new Date().toISOString().split("T")[0];

      const res = await api.post("/report/saatvik_dashboard", {
      from_date: fromDate,
      to_date: toDate,
      });

      setDashboard(res.data);
    } catch (err) {
      console.error(err);
      alert(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  const leadStatusData = [
    {
      name: "Pending",
      value: Number(
        dashboard?.digital_summary?.pending_leads || 0
      ),
    },
    {
      name: "Processed",
      value: Number(
        dashboard?.digital_summary?.processed_leads || 0
      ),
    },
  ];

  const ivrData = [
    {
      name: "Incoming",
      count: Number(
        dashboard?.ivr_summary?.total_incoming_calls || 0
      ),
    },
    {
      name: "Connected",
      count: Number(
        dashboard?.ivr_summary?.connected_calls || 0
      ),
    },
    {
      name: "Missed",
      count: Number(
        dashboard?.ivr_summary?.missed_calls || 0
      ),
    },
    {
      name: "Outbound",
      count: Number(
        dashboard?.ivr_summary?.outbound_calls || 0
      ),
    },
  ];

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <h4>Loading Dashboard...</h4>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 bg-light min-vh-100">

      {/* HEADER */}

      <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
              <h3 className="fw-bold mb-1">
                Saatvik Lead Dashboard
              </h3>

            <div className="row align-items-end">

              <div className="col-md-3">
                <label className="form-label fw-bold">
                  From Date
                </label>

                <input
                  type="date"
                  className="form-control"
                  value={fromDate}
                  onChange={(e) =>
                    setFromDate(e.target.value)
                  }
                />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-bold">
                  To Date
                </label>

                <input
                  type="date"
                  className="form-control"
                  value={toDate}
                  onChange={(e) =>
                    setToDate(e.target.value)
                  }
                />
              </div>

              <div className="col-md-2">
                <button
                  className="btn btn-primary w-100"
                  onClick={loadDashboard}
                >
                  Apply Filter
                </button>
              </div>

              <div className="col-md-2">
                <button
                  className="btn btn-secondary w-100"
                  onClick={() => {
                    setFromDate(today);
                    setToDate(today);
                  }}
                >
                  Today
                </button>
              </div>

            </div>

          </div>
        </div>

      {/* KPI SECTION */}

      <div className="row">

        <KPI
          title="IVR Incoming Calls"
          value={
            dashboard?.ivr_summary?.total_incoming_calls || 0
          }
          color="#0d6efd"
        />

        <KPI
          title="Connected Calls"
          value={
            dashboard?.ivr_summary?.connected_calls || 0
          }
          color="#198754"
        />

        <KPI
          title="Missed Calls"
          value={
            dashboard?.ivr_summary?.missed_calls || 0
          }
          color="#dc3545"
        />

        <KPI
          title="Outbound Calls"
          value={
            dashboard?.ivr_summary?.outbound_calls || 0
          }
          color="#fd7e14"
        />

        <KPI
          title="Salesforce Leads"
          value={
            dashboard?.digital_summary?.total_leads || 0
          }
          color="#6f42c1"
        />

        <KPI
          title="Pending Leads"
          value={
            dashboard?.digital_summary?.pending_leads || 0
          }
          color="#ffc107"
        />

        <KPI
          title="Processed Leads"
          value={
            dashboard?.digital_summary?.processed_leads || 0
          }
          color="#20c997"
        />

      </div>

      {/* CHARTS */}

      <div className="row mt-4">

        <div className="col-lg-5 mb-4">

          <div className="card border-0 shadow-sm h-100">

            <div className="card-header bg-white fw-bold">
              Lead Status Distribution
            </div>

            <div className="card-body">

              <ResponsiveContainer
                width="100%"
                height={350}
              >
                <PieChart>

                  <Pie
                    data={leadStatusData}
                    dataKey="value"
                    outerRadius={120}
                    label
                  >
                    <Cell fill="#ffc107" />
                    <Cell fill="#20c997" />
                  </Pie>

                  <Tooltip />
                  <Legend />

                </PieChart>
              </ResponsiveContainer>

            </div>

          </div>

        </div>

        <div className="col-lg-7 mb-4">

          <div className="card border-0 shadow-sm h-100">

            <div className="card-header bg-white fw-bold">
              IVR Call Summary
            </div>

            <div className="card-body">

              <ResponsiveContainer
                width="100%"
                height={350}
              >
                <BarChart data={ivrData}>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis />

                  <Tooltip />

                  <Bar
                      dataKey="count"
                      fill="#0d6efd"
                      radius={[8, 8, 0, 0]}
                    />

                </BarChart>
              </ResponsiveContainer>

            </div>

          </div>

        </div>

      </div>

      {/* LEAD TABLE */}

      <div className="card border-0 shadow-sm">

        <div className="card-header bg-white">

          <div className="d-flex justify-content-between">

            <div className="fw-bold">
              Latest Lead Queue (LIFO)
            </div>

            <span className="badge bg-primary">
              {dashboard?.latest_leads?.length || 0} Leads
            </span>

          </div>

        </div>

        <div className="card-body">

          <div className="table-responsive">

            <table className="table table-hover align-middle">

              <thead className="table-light">

                <tr>
                  <th>Lead ID</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                  <th>Comments</th>
                  <th>Source ID</th>
                  <th>Entry Date</th>
                </tr>

              </thead>

              <tbody>

                {dashboard?.latest_leads?.length > 0 ? (
                  dashboard.latest_leads.map((lead) => (
                    <tr key={lead.lead_id}>
                      <td>{lead.lead_id}</td>

                      <td>{lead.phone_number}</td>

                      <td>
                        <span
                          className={`badge ${
                            lead.status === "NEW"
                              ? "bg-warning text-dark"
                              : "bg-success"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td>{lead.comments}</td>

                      <td>{lead.source_id}</td>

                      <td>
                        {new Date(
                          lead.entry_date
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center"
                    >
                      No Leads Found
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}

function KPI({ title, value, color }) {
  return (
    <div className="col-xl col-lg-3 col-md-6 mb-3">

      <div
        className="card border-0 shadow-sm h-100"
        style={{
          borderLeft: `5px solid ${color}`,
        }}
      >
        <div className="card-body">

          <div
            className="text-muted mb-2"
            style={{
              fontSize: "12px",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color,
            }}
          >
            {value}
          </div>

        </div>
      </div>

    </div>
  );
}