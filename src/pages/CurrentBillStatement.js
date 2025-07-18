import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from "date-fns";

const CurrentBillStatement = () => {
  const clientOptions = [
    { value: 'client1', label: 'Client 1' },
    { value: 'client2', label: 'Client 2' },
    { value: 'client3', label: 'Client 3' },
  ];

  const [selectedClient, setSelectedClient] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const formattedStart = format(startDate, "yyyy-MM-dd");
  const formattedEnd = format(endDate, "yyyy-MM-dd");

  const handleSubmit = async () => {
  const clientId = localStorage.getItem("company_id");
  const fromDate = formattedStart;
  const toDate = formattedEnd;

  const url = `http://localhost:8025/call/download_excel_raw?client_id=${clientId}&from_date=${fromDate}&to_date=${toDate}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.ms-excel'
      }
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `report_${clientId}_${fromDate}_to_${toDate}.xls`;  // <-- .xls
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl); // cleanup
  } catch (error) {
    console.error('Download failed:', error);
    alert('Download failed. See console for details.');
  }
};




  return (
    <div className="card p-4 mb-4">
      <h5 className="mb-8">CURRENT BILL STATEMENT</h5>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <div style={{ minWidth: '200px' }}>
          <select
            className="form-select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            <option value="">Select Client</option>
            {clientOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <DatePicker
          selected={startDate}
          onChange={setStartDate}
          placeholderText="From Date"
          className="form-control"
          dateFormat="yyyy-MM-dd"
        />
        <DatePicker
          selected={endDate}
          onChange={setEndDate}
          placeholderText="To Date"
          className="form-control"
          dateFormat="yyyy-MM-dd"
        />
        <button className="btn btn-primary" onClick={handleSubmit}>
          SUBMIT
        </button>
      </div>
    </div>
  );
};

export default CurrentBillStatement;
