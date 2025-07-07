import React, { useState } from "react";
import DataTable from "react-data-table-component";
import { Card, CardHeader, CardBody, Button, Input } from "reactstrap";

const PriorityCalls = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Replace with your API call:
    setData([
      {
        id: 1,
        recording: "Download Recording",
        fullName: "John Doe",
        email: "john@example.com",
        mobile: "9999601467",
        company: "ABC Ltd",
        city: "Delhi",
        deliveryDate: "2025-07-07",
        entryDate: "2025-07-07 08:06:10",
      },
      {
        id: 2,
        recording: "Download Recording",
        fullName: "Jane Doe",
        email: "jane@example.com",
        mobile: "9999601467",
        company: "XYZ Pvt",
        city: "Mumbai",
        deliveryDate: "2025-07-07",
        entryDate: "2025-07-07 08:07:20",
      },
    ]);
  };

  const columns = [
    { name: "S.NO", selector: (row) => row.id, sortable: true, width: "70px" },
    {
      name: "RECORDING",
      cell: (row) => (
        <a href="#" onClick={(e) => e.preventDefault()}>
          {row.recording}
        </a>
      ),
      sortable: false,
    },
    { name: "FULL NAME", selector: (row) => row.fullName },
    { name: "EMAIL", selector: (row) => row.email },
    { name: "MOBILE NO.", selector: (row) => row.mobile },
    { name: "COMPANY", selector: (row) => row.company },
    { name: "CITY", selector: (row) => row.city },
    { name: "DELIVERY DATE", selector: (row) => row.deliveryDate },
    { name: "ENTRY DATE", selector: (row) => row.entryDate },
  ];

  return (
    <div className="row gy-4 gx-3">
      <h4 className="fw-bold py-2">Priority Calls</h4>
      <Card>
        <CardHeader>Priority Calls Filter</CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="d-flex flex-wrap gap-2 align-items-center">
            <Input
              type="date"
              placeholder="Select Start Time"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ maxWidth: "200px" }}
            />
            <Input
              type="date"
              placeholder="Select End Time"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ maxWidth: "200px" }}
            />
            <Button color="primary" type="submit">
              Submit
            </Button>
          </form>
        </CardBody>
      </Card>

      {data.length > 0 && (
        <Card className="mt-3">
          <CardHeader>Priority Calls List</CardHeader>
          <CardBody>
            <DataTable
              columns={columns}
              data={data}
              pagination
              highlightOnHover
              responsive
              dense
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default PriorityCalls;
