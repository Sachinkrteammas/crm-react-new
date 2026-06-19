import React, { useEffect, useState } from "react";
import api from "../api";

const OrderStatus = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get("/order-status");
      setData(response.data || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data.length) {
      alert("No Data Found");
      return;
    }

    const headers = [
      "SRNO",
      "ORDER ID",
      "PHONE NO",
      "CALL DATE",
      "STATUS",
      "CALL COUNT",
      "TAG STATUS",
      "RESPONSE"
    ];

    const csvRows = [
      headers.join(","),
      ...data.map((row, index) => [
        index + 1,
        row.order_id,
        row.phone_number,
        row.call_date,
        row.status,
        row.call_count,
        row.tag_status,
        row.response
      ].join(","))
    ];

    const blob = new Blob(
      [csvRows.join("\n")],
      { type: "text/csv" }
    );

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Order_Status.csv";
    link.click();
  };

  return (
    <div className="container-fluid">

      <h3 className="mb-4">
        Order Status
      </h3>

      <div className="card shadow-sm">

        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            VIEW ORDER STATUS
          </h6>

          <button
            className="btn btn-secondary"
            onClick={exportCSV}
          >
            EXPORT
          </button>
        </div>

        <div className="table-responsive">

          <table className="table table-bordered table-hover mb-0">

            <thead>
              <tr>
                <th>SRNO.</th>
                <th>ORDER ID</th>
                <th>PHONE NO.</th>
                <th>CALL DATE</th>
                <th>STATUS</th>
                <th>CALL COUNT</th>
                <th>TAG STATUS</th>
                <th>RESPONSE</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center">
                    Loading...
                  </td>
                </tr>
              ) : data.length > 0 ? (
                data.map((row, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{row.order_id}</td>
                    <td>{row.phone_number}</td>
                    <td>{row.call_date}</td>
                    <td>{row.status}</td>
                    <td>{row.call_count}</td>
                    <td>{row.tag_status}</td>
                    <td>{row.response}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">
                    No Data Found
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>
      </div>

    </div>
  );
};

export default OrderStatus;