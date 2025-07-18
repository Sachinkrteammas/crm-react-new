import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CurrentBillStatement = () => {
  const clientOptions = [
    { value: 'client1', label: 'Client 1' },
    { value: 'client2', label: 'Client 2' },
    { value: 'client3', label: 'Client 3' },
  ];

  const [selectedClient, setSelectedClient] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleSubmit = async () => {
  const clientId = localStorage.getItem("company_id");
  const fromDate = startDate;
  const toDate = endDate;

  const url = `/call/download_excel_raw?client_id=${clientId}&from_date=${fromDate}&to_date=${toDate}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    // Download Excel file
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;

    // Optional: Set a filename
    link.download = `report_${clientId}_${fromDate}_to_${toDate}.xlsx`;

    document.body.appendChild(link);
    link.click();
    link.remove();
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
