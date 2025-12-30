import React, { useState, useEffect } from "react";
import api from "../api";
import { useLocation } from "react-router-dom";

const CreateInvoice = () => {

  const location = useLocation();

  const {
    clientId,
    clientName,
    toBeBilled,
    exposure,
  } = location.state || {};



  const [loading, setLoading] = useState(false);

  const getFinancialYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // Jan = 0

    // Assuming financial year is Apr–Mar
    if (month >= 4) {
      return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
      return `${year - 1}-${year.toString().slice(-2)}`;
    }
  };

  const [items, setItems] = useState([
    {
      particulars: "Talk Time",
      qty: Number(String(toBeBilled || 0).replace("-", "")),
      rate: 1,
      amount: 0,
    },
  ]);

  // Compute amount whenever qty or rate changes
  useEffect(() => {
    setItems((prevItems) =>
      prevItems.map((item) => ({
        ...item,
        amount: Number(item.qty || 0) * Number(item.rate || 0),
      }))
    );
  }, [toBeBilled]);

  const IGST_RATE = 0.18;

  const formatDate = (date) => {
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return date.toLocaleDateString("en-GB", options).replace(/ /g, "-");
  };


  const [invoiceData, setInvoiceData] = useState({
    branchName: "",
    costCenter: "",
    financialYear: getFinancialYear(),
    month: new Date().toLocaleString("en-US", { month: "short"}),
    gstNo: "",
    vendorGstNo: "",
  });

  const [billingData, setBillingData] = useState({
    billToName: "",
    billToAddress: "",
    shipToName: "",
    shipToAddress: "",
    date: formatDate(new Date()),
    dueDate: "Immediate",
    description: "Talk Time",
  });

  
  useEffect(() => {
  if (!clientId) return;

  const fetchCostMaster = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/cost-master/${clientId}`);
      const record = res.data?.data?.[0];

      if (!record) return;

      setInvoiceData((prev) => ({
        ...prev,
        branchName: record.branch,
        costCenter: record.cost_center,
        gstNo: record.ServiceTaxNo,
        vendorGstNo: record.VendorGSTNo,
      }));

      const address = [
        record.b_Address1,
        record.b_Address2,
        record.b_Address3,
      ]
        .filter(Boolean)
        .join("\n");

      setBillingData((prev) => ({
        ...prev,
        billToName: record.client.toUpperCase(),
        shipToName: record.client.toUpperCase(),
        billToAddress: address,
        shipToAddress: address,
      }));
    } catch (err) {
      console.error("Cost master error:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchCostMaster();
}, [clientId]);

  // ------------------ Calculations ------------------
  const totalAmount = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const igstAmount = +(totalAmount * IGST_RATE).toFixed(2);
  const grandTotal = +(totalAmount + igstAmount).toFixed(2);

  // ------------------ Handlers ------------------
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "qty" || field === "rate") {
      const qty = Number(updated[index].qty || 0);
      const rate = Number(updated[index].rate || 0);
      updated[index].amount = +(qty * rate).toFixed(2);
    }

    setItems(updated);
  };

  const addRow = () => {
    setItems([
      ...items,
      { particulars: "", qty: "", rate: "", amount: 0 },
    ]);
  };

  const deleteRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    alert("Working on Invoice Submittion..");
  };

  // ------------------ UI ------------------
  return (
    <div className="row">
      <div className="col-12">
        <div className="card p-4 mb-4">
          <h5 className="mb-5 text-center fw-bold text-uppercase">
            Create Invoice
          </h5>

          {/* Header Info */}
           <div className="card p-3 mb-5 border-0 shadow-sm rounded-4 bg-light">
            <div className="row text-start g-3">

              <div className="col-md-2">
                <div className="text-uppercase small text-muted fw-semibold mb-1">
                  Branch
                </div>
                <div className="fw-bold text-dark">
                  {invoiceData.branchName}
                </div>
              </div>

              <div className="col-md-2">
                <div className="text-uppercase small text-muted fw-semibold mb-1">
                  Cost Center
                </div>
                <div className="fw-bold text-dark">
                  {invoiceData.costCenter}
                </div>
              </div>

              <div className="col-md-2">
                <div className="text-uppercase small text-muted fw-semibold mb-1">
                  Financial Year
                </div>
                <div className="fw-bold text-dark">
                  {invoiceData.financialYear}
                </div>
              </div>

              <div className="col-md-2">
                <div className="text-uppercase small text-muted fw-semibold mb-1">
                  For The Month
                </div>
                <div className="fw-bold text-dark">
                  {invoiceData.month}
                </div>
              </div>

              <div className="col-md-2">
                <div className="text-uppercase small text-muted fw-semibold mb-1">
                  GST No.
                </div>
                <div className="fw-bold text-dark">
                  {invoiceData.gstNo}
                </div>
              </div>

              <div className="col-md-2">
                <div className="text-uppercase small text-muted fw-semibold mb-1">
                  Vendor GST No.
                </div>
                <div className="fw-bold text-dark">
                  {invoiceData.vendorGstNo}
                </div>
              </div>

            </div>
          </div>
       

          {/* Billing Info */}
          <div className="card p-3 mb-5 border-0 shadow-sm rounded-4">
            <div className="row align-items-start g-3">

              {/* BILL TO */}
              <div className="col-md-4">
                <div className="d-flex align-items-baseline mb-2">
                  <div className="text-uppercase small text-muted fw-semibold me-2">
                    Bill To :
                  </div>
                  <div className="fw-bold mb-2 text-dark">
                    {billingData.billToName}
                  </div>
                </div>

                <div className="small text-muted">
                  {billingData.billToAddress &&
                    billingData.billToAddress.split("\n").map((line, idx) => (
                      <div key={idx}>{line.replace(/â€“/g, "-")}</div>
                    ))}
                </div>
              </div>

              {/* SHIP TO */}
              <div className="col-md-4">
                <div className="d-flex align-items-baseline mb-2">
                <div className="text-uppercase small text-muted fw-semibold me-2">
                  Ship To :
                </div>
                <div className="fw-bold mb-2 text-dark">
                  {billingData.shipToName}
                </div>
                </div>
                <div className="small text-muted">
                  {billingData.shipToAddress.split("\n").map((line, idx) => (
                    <div key={idx}>{line.replace(/â€“/g, "-")}</div>
                  ))}
                </div>
              </div>

              {/* DATE / DUE DATE / DESCRIPTION */}
              <div className="col-md-4">
                {/* DATE */}
                <div className="row mb-2 align-items-center">
                  <div className="col-5 text-uppercase small text-muted fw-semibold">
                    Date :
                  </div>
                  <div className="col-7 fw-bold text-dark">
                    {billingData.date}
                  </div>
                </div>

                {/* DUE DATE */}
                <div className="row mb-2 align-items-center">
                  <div className="col-5 text-uppercase small text-muted fw-semibold">
                    Due Date :
                  </div>
                  <div className="col-7">
                    <input
                      type="text"
                      className="form-control form-control-sm border-0 shadow-sm"
                      value={billingData.dueDate}
                    />
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div className="row align-items-center">
                  <div className="col-5 text-uppercase small text-muted fw-semibold">
                    Description :
                  </div>
                  <div className="col-7">
                    <input
                      type="text"
                      className="form-control form-control-sm border-0 shadow-sm"
                      value={billingData.description}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>


          {/* Items Table */}
          <div className="table-responsive rounded-4">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "60px" }}>SNO</th>
                  <th>PARTICULARS</th>
                  <th>QTY</th>
                  <th>RATE</th>
                  <th>AMOUNT</th>
                  <th style={{ width: "100px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <input
                        className="form-control"
                        value={row.particulars}
                        onChange={(e) =>
                          handleItemChange(index, "particulars", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control"
                        type="number"
                        value={row.qty}
                        onChange={(e) =>
                          handleItemChange(index, "qty", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control"
                        type="number"
                        step="0.01"
                        value={row.rate}
                        onChange={(e) =>
                          handleItemChange(index, "rate", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input className="form-control" value={row.amount} readOnly />
                    </td>
                    <td className="text-center">
                      {index === items.length - 1 && (
                        <button
                          className="btn fw-bold btn-link p-0 me-2"
                          onClick={addRow}
                        >
                          ADD
                        </button>
                      )}
                      <button
                        className="btn fw-bold btn-link text-danger p-0"
                        onClick={() => deleteRow(index)}
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
        <div className="row justify-content-center">
          <div className="col-md-4 text-start mt-7">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Subtotal</span>
                  <span>₹ {totalAmount.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">IGST @ 18%</span>
                  <span>₹ {igstAmount.toFixed(2)}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between fs-5 fw-bold text-dark">
                  <span>Grand Total</span>
                  <span>₹ {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Submit */}
          <div className="text-center mt-4">
            <button className="btn btn-success px-4" onClick={handleSubmit}>
              SUBMIT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
