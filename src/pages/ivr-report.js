import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getIVRReport } from "../services/authService";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


const IVRReport = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [ivrData, setIVRData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const companyId = localStorage.getItem("company_id");

  const handleView = async () => {
    setLoading(true);
    try {
      const payload = {
        company_id: companyId,
        from_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        to_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      };

      const data = await getIVRReport(payload);
      setIVRData(data);
      setShowTable(true);
    } catch (error) {
      console.error("Error fetching IVR report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
      if (ivrData.length === 0) {
        alert("No data to export.");
        return;
      }

      // Create a worksheet
      const worksheet = XLSX.utils.json_to_sheet(ivrData);

      // Create a new workbook and append the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

      // Generate a buffer
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // Save file
      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });
      saveAs(file, "ivr_report.xlsx");
  };

  return (
    <div className="row gy-4 gx-3">
      {/* IVR REPORT CARD */}
      <div className="card p-4 mb-4">
        <h5 className="mb-3">IVR REPORT</h5>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            placeholderText="Start Date"
            className="form-control"
          />
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            placeholderText="End Date"
            className="form-control"
          />
          <button className="btn btn-primary" onClick={handleView}>
            VIEW
          </button>
          <button className="btn btn-primary" onClick={handleExport}>
            EXPORT
          </button>
        </div>
      </div>

      {/* VIEW IVR LOG REPORT */}
      {showTable && (
      <div className="card p-4">
        <h6 className="mb-3">VIEW IVR LOG REPORT</h6>
        <div className="table-responsive">
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th>DATE</th>
                <th>CALL TYPE</th>
                <th>FROM</th>
                <th>START TIME</th>
                <th>END TIME</th>
                <th>DURATION (SEC.)</th>
                <th>OUTCOME</th>
                <th>OPTIONS CHOSEN</th>
              </tr>
            </thead>
            <tbody>
              {ivrData.length > 0 ? (
                ivrData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.Dater}</td>
                    <td>{row.call_type}</td>
                    <td>{row.from_number}</td>
                    <td>{row.StartDate}</td>
                    <td>{row.EndDate}</td>
                    <td>{row.duration_sec}</td>
                    <td>{row.outcome}</td>
                    <td>{row.options_chosen}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">
                    No data available for selected date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

export default IVRReport;
