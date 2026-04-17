import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Search, ArrowLeft, X } from "lucide-react";

const formatValue = (key, value) => {
  if (value === null || value === undefined) return "";
  if (key.toLowerCase().includes("date") || key.toLowerCase().includes("at")) {
    const d = new Date(value);
    if (!isNaN(d)) return d.toLocaleString("en-GB");
  }
  return String(value);
};

const CheckOutReport = () => {
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  const selectedFields = [
    "Name",
    "Email",
    "Phone",
    "Billing_Name",
    "Billing_Street",
    "Billing_Address1",
    "Billing_Address2",
    "Billing_Company",
    "Billing_City",
    "Billing_Zip",
    "Billing_Province",
    "Billing_Province_Name",
    "Billing_Country",
    "Billing_Phone",
    "Shipping_Name",
    "Shipping_Street",
    "Shipping_Address1",
    "Shipping_Address2",
    "Shipping_Company",
    "Shipping_City",
    "Shipping_Zip",
    "Shipping_Province",
    "Shipping_Province_Name",
    "Shipping_Country",
    "Shipping_Phone",
    "Receipt_Number",
    ];
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!searchText.trim()) return;

    setLoading(true);
    try {
      const query = new URLSearchParams({ phone: searchText });
      const res = await api.get(`/auth/search-by-phone?${query.toString()}`);
      setData(res.data.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => {
    const set = new Set();
    data.forEach((row) => Object.keys(row).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [data]);

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = data.slice(indexOfFirstRow, indexOfLastRow);

  const visibleFields = useMemo(() => {
    return selectedFields.filter((field) =>
        currentRows.some(
        (item) =>
            item[field] !== null &&
            item[field] !== undefined &&
            String(item[field]).trim() !== ""
        )
    );
    }, [currentRows]);

  return (
    <div className="card shadow-sm border-0 p-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0 fw-semibold">CheckOut Report</h6>
        <span className="badge bg-light text-dark border">{data.length} records</span>
      </div>

      {/* Search */}
    <div className="d-flex gap-2 mb-2 align-items-center">
    <div
        className="input-group input-group-sm"
        style={{ width: "20%", minWidth: "220px" }} // 👈 key change
    >
        <span className="input-group-text bg-white">
        <Search size={14} />
        </span>
        <input
        type="text"
        className="form-control"
        placeholder="Search phone..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
    </div>

    <button
        className="btn btn-sm btn-primary d-flex align-items-center gap-1"
        onClick={handleSearch}
    >
        {loading ? "..." : "Search"}
    </button>

    <button
        className="btn btn-sm btn-light border d-flex align-items-center"
        onClick={() => {
        setSearchText("");
        setData([]);
        }}
    >
        Clear
    </button>

    </div>

      {/* Controls */}
      <div className="d-flex justify-content-between align-items-center mb-1 small text-muted">
        <div>
          Show
          <select
            className="form-select form-select-sm d-inline-block mx-1"
            style={{ width: 70 }}
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          rows
        </div>

        {loading && <span className="text-primary">Loading...</span>}
      </div>

      {/* Table */}
      <div className="table-responsive" style={{ maxHeight: 600 }}>
        <table className="table table-sm table-bordered align-middle">
            <thead className="table-light">
            <tr>
                <th>Field</th>
                {currentRows.map((_, index) => (
                <th key={index}>Record {indexOfFirstRow + index + 1}</th>
                ))}
            </tr>
            </thead>

            <tbody>
            {visibleFields.map((field) => (
                <tr key={field}>
                <td className="fw-semibold text-nowrap">{field}</td>

                {currentRows.map((item, idx) => (
                    <td
                    key={idx}
                    style={{
                        maxWidth: 200,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                    title={item[field]}
                    >
                    {formatValue(field, item[field])}
                    </td>
                ))}
                </tr>
            ))}
            </tbody>
        </table>
        </div>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-2 small">
        <button
          className="btn btn-sm btn-light border"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          ◀
        </button>

        <span>
          {indexOfFirstRow + 1}–{Math.min(indexOfLastRow, data.length)}
        </span>

        <button
          className="btn btn-sm btn-light border"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          ▶
        </button>
      </div>
    </div>
  );
};

export default CheckOutReport;