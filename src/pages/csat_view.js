import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import api from "../api";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


function CsatView() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [data, setData] = useState([]);
  const companyId = 605;

    const customColStyle = {
        flex: "0 0 auto",
        width: "19.666667%"
      };


  const handleViewClick = async () => {
  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }

  const formattedStart = format(startDate, "yyyy-MM-dd");
  const formattedEnd = format(endDate, "yyyy-MM-dd");

  try {
    const response = await api.get(`/call/csat-report/${companyId}`, {
      params: {
        client_id: companyId,
        from_date: formattedStart,
        to_date: formattedEnd,
      },
    });
    setData(response.data);
    console.log("CSAT Report Data:", response.data);
  } catch (error) {
    console.error("Failed to fetch CSAT report:", error);
    alert("Error fetching CSAT report");
  }
};


const handleExportToExcel = () => {
  if (data.length === 0) {
    alert("No data to export.");
    return;
  }

  // Create a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

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
  saveAs(file, "csat_report.xlsx");
};

  return (
    <div className="col-12">
  <div className="card">
    <h5 className="card-header">Csat View</h5>
    <div className="card-body">
      <div className="row g-2 align-items-end">
  <div style={customColStyle} className="col-md-3 col-sm-6">
    <label className="form-label" htmlFor="start-date">Start Date</label>
    <DatePicker
      selected={startDate}
      onChange={(date) => setStartDate(date)}
      dateFormat="yyyy-MM-dd"
      placeholderText="YYYY-MM-DD"
      className="form-control"
      id="start-date"
    />
  </div>

  <div style={customColStyle} className="col-md-3 col-sm-6">
    <label className="form-label" htmlFor="end-date">End Date</label>
    <DatePicker
      selected={endDate}
      onChange={(date) => setEndDate(date)}
      dateFormat="yyyy-MM-dd"
      placeholderText="YYYY-MM-DD"
      className="form-control"
      id="end-date"
    />
  </div>

  <div className="col-md-3 col-sm-6">
    <button
  type="submit"
  className="btn btn-primary w-75 px-4 py-2"
  onClick={handleViewClick}
>
  View
</button>
  </div>

  <div className="col-md-3 col-sm-6">
    <button
              type="button"
              className="btn btn-primary w-75 px-4 py-2"
              onClick={handleExportToExcel}
            >
              Export
            </button>
  </div>
</div>


    {data.length > 0 && (
      <div className="col-12 mt-4">
        <div className="table-responsive" style={{ maxHeight: "600px", overflowX: "auto", overflowY: "auto"}}>
          <table className="table table-bordered table-striped">
            <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 2 }}>
              <tr>
                {Object.keys(data[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((val, idx) => (
                    <td key={idx}>{val ?? "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}



    </div>
  </div>
</div>


  );
}

export default CsatView;
