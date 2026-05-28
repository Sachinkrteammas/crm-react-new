import React, { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import api from "../api";

const C2PCDRReports = () => {

  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState("");

  const [dates, setDates] = useState({
    startDate: null,
    endDate: null,
  });

  const [cdrData, setCdrData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ============================================
  // Pagination
  // ============================================

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 25;

  // ============================================
  // Load Queue Names
  // ============================================

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {

      const response = await api.get(
        "/api/webhook/c2p_cdr_queues"
      );

      if (response.data.status) {
        setQueues(response.data.queues || []);
      }

    } catch (error) {
      console.error(error);
    }
  };

  // ============================================
  // Date Change
  // ============================================

  const handleDateChange = (key, date) => {
    setDates((prev) => ({
      ...prev,
      [key]: date,
    }));
  };

  // ============================================
  // Format Date
  // ============================================

 const formatDate = (date) => {

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

  // ============================================
  // View Data
  // ============================================

  const handleView = async () => {

    if (!dates.startDate || !dates.endDate) {
      alert("Please select start and end date");
      return;
    }

    try {

      setLoading(true);

      const response = await api.get(
        "/api/webhook/c2p_cdr",
        {
          params: {
            start_date: formatDate(dates.startDate),
            end_date: formatDate(dates.endDate),
            queue_name: selectedQueue,
          },
        }
      );

      if (response.data.status) {
        setCdrData(response.data.data || []);
        setCurrentPage(1);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Excel Export
  // ============================================

  const exportToExcel = async () => {

  if (!dates.startDate || !dates.endDate) {
    alert("Please select start and end date");
    return;
  }

  try {

    setLoading(true);

    const response = await api.get(
      "/api/webhook/c2p_cdr",
      {
        params: {
          start_date: formatDate(dates.startDate),
          end_date: formatDate(dates.endDate),
          queue_name: selectedQueue,
        },
      }
    );

    if (!response.data.status) {
      alert("Failed to fetch data");
      return;
    }

    const exportData = response.data.data || [];

    if (exportData.length === 0) {
      alert("No data found");
      return;
    }

    const excelData = exportData.map((item) => ({
      "Customer Name": item.customer_name,
      "Customer Number": item.customer_number,
      "DID CLID": item.did_clid,
      "Created On": item.created_on,
      "Queue Name": item.queue_name,
      "Call Direction": item.call_direction,
      "Call Status": item.call_status,
      "Call Type": item.call_type,
      "Agent Name": item.agent_name,
      "Agent Username": item.agent_username,
      "Agent Number": item.agent_number,
      "Setup Time": item.customer_call_setup_time,
      "Recording": item.recording,
    }));

    const worksheet =
      XLSX.utils.json_to_sheet(excelData);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "C2P_CDR_Report"
    );

    XLSX.writeFile(
      workbook,
      `C2P_CDR_Report_${formatDate(dates.startDate)}_${formatDate(dates.endDate)}.xlsx`
    );

  } catch (error) {

    console.error(error);
    alert("Excel export failed");

  } finally {

    setLoading(false);

  }
};

  // ============================================
  // Pagination Logic
  // ============================================

  const totalPages = Math.ceil(
    cdrData.length / recordsPerPage
  );

  const paginatedData = useMemo(() => {

    const startIndex =
      (currentPage - 1) * recordsPerPage;

    return cdrData.slice(
      startIndex,
      startIndex + recordsPerPage
    );

  }, [cdrData, currentPage]);

  return (
    <div className="row">

      <div className="col-12">

        <h3 className="mb-4">
          C2P CDR Reports
        </h3>

        {/* ============================================
            FILTER CARD
        ============================================ */}

        <div className="card shadow-sm mb-4">

          <div className="card-header">
            <h6 className="mb-0">
              Filter Reports
            </h6>
          </div>

          <div className="card-body">

            <div className="row g-4 align-items-end">

              {/* Queue */}

              <div className="col-md-3">

                <label className="form-label">
                  Queue Name
                </label>

                <select
                  className="form-select"
                  value={selectedQueue}
                  onChange={(e) =>
                    setSelectedQueue(e.target.value)
                  }
                >
                  <option value="">
                    All Queues
                  </option>

                  {queues.map((queue, index) => (
                    <option
                      key={index}
                      value={queue}
                    >
                      {queue}
                    </option>
                  ))}
                </select>

              </div>

              {/* Start Date */}

              <div className="col-md-3">

                <label className="form-label">
                  Start Date
                </label>

                <DatePicker
                  selected={dates.startDate}
                  onChange={(date) =>
                    handleDateChange("startDate", date)
                  }
                  className="form-control"
                  placeholderText="Start Date"
                  dateFormat="dd-MM-yyyy"
                />

              </div>

              {/* End Date */}

              <div className="col-md-3">

                <label className="form-label">
                  End Date
                </label>

                <DatePicker
                  selected={dates.endDate}
                  onChange={(date) =>
                    handleDateChange("endDate", date)
                  }
                  className="form-control"
                  placeholderText="End Date"
                  dateFormat="dd-MM-yyyy"
                />

              </div>

              {/* View Button */}

              <div className="col-md-1">

                <button
                  className="btn btn-primary w-100"
                  onClick={handleView}
                  disabled={loading}
                >
                  VIEW
                </button>

              </div>

              {/* Export */}

              <div className="col-md-2">

                <button
                  className="btn btn-success w-100"
                  onClick={exportToExcel}
                >
                  EXPORT
                </button>

              </div>

            </div>

          </div>

        </div>

        {/* ============================================
            TABLE
        ============================================ */}

        <div className="card shadow-sm">

          <div className="card-header d-flex justify-content-between">

            <h6 className="mb-0">
              CDR Data
            </h6>

            <span>
              Total Records: {cdrData.length}
            </span>

          </div>

          <div className="card-body table-responsive">

            <table className="table table-bordered table-striped">

              <thead>

                <tr>
                  <th>Customer Name</th>
                  <th>Customer Number</th>
                  <th>DID CLID</th>
                  <th>Created On</th>
                  <th>Queue Name</th>
                  <th>Call Direction</th>
                  <th>Call Status</th>
                  <th>Call Type</th>
                  <th>Agent Name</th>
                  <th>Agent Username</th>
                  <th>Agent Number</th>
                  <th>Setup Time</th>
                  <th>Recording</th>
                </tr>

              </thead>

              <tbody>

                {paginatedData.length > 0 ? (
                  paginatedData.map((item, index) => (
                    <tr key={index}>

                      <td>{item.customer_name}</td>
                      <td>{item.customer_number}</td>
                      <td>{item.did_clid}</td>
                      <td>{item.created_on}</td>
                      <td>{item.queue_name}</td>
                      <td>{item.call_direction}</td>
                      <td>{item.call_status}</td>
                      <td>{item.call_type}</td>
                      <td>{item.agent_name}</td>
                      <td>{item.agent_username}</td>
                      <td>{item.agent_number}</td>
                      <td>{item.customer_call_setup_time}</td>

                      <td>
                        {item.recording ? (
                          <audio controls>
                            <source
                              src={item.recording}
                              type="audio/mpeg"
                            />
                          </audio>
                        ) : (
                          "-"
                        )}
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="13"
                      className="text-center"
                    >
                      No Data Found
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

            {/* ============================================
                PAGINATION
            ============================================ */}

            {totalPages > 1 && (

              <div className="d-flex justify-content-end mt-3">

                <nav>

                  <ul className="pagination">

                    <li
                      className={`page-item ${
                        currentPage === 1
                          ? "disabled"
                          : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() =>
                          setCurrentPage(currentPage - 1)
                        }
                      >
                        Previous
                      </button>
                    </li>

                    {[...Array(totalPages)].map(
                      (_, index) => (
                        <li
                          key={index}
                          className={`page-item ${
                            currentPage === index + 1
                              ? "active"
                              : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() =>
                              setCurrentPage(index + 1)
                            }
                          >
                            {index + 1}
                          </button>
                        </li>
                      )
                    )}

                    <li
                      className={`page-item ${
                        currentPage === totalPages
                          ? "disabled"
                          : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() =>
                          setCurrentPage(currentPage + 1)
                        }
                      >
                        Next
                      </button>
                    </li>

                  </ul>

                </nav>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default C2PCDRReports;