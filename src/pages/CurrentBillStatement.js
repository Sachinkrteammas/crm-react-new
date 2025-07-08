import React, { useState } from 'react';
import Select from 'react-select';
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

  const handleSubmit = () => {
    console.log('Submit:', {
      client: selectedClient,
      startDate,
      endDate,
    });
  };

  return (
    <div className="card p-4 mb-4">
      <h5 className="mb-8">CURRENT BILL STATEMENT</h5>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <div style={{ minWidth: '200px' }}>
          <Select
            options={clientOptions}
            placeholder="Select Client"
            value={selectedClient}
            onChange={setSelectedClient}
            isClearable
          />
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
