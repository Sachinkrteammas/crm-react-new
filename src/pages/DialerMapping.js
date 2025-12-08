
// // Dailer Mapping dynmaic..
// import React, { useState, useEffect } from "react";
// import api from "../api"; // axios instance

// const DialerMapping = () => {
//   const userType = localStorage.getItem("user_type");
//   const companyId = localStorage.getItem("company_id");

//   const [selectedClient, setSelectedClient] = useState("");
//   const [clients, setClients] = useState([]);

//   const [extension1, setExtension1] = useState("");
//   const [extension2, setExtension2] = useState("");

//   const [mappings, setMappings] = useState([]);

//   // ================================
//   // FETCH CLIENTS
//   // ================================
//   useEffect(() => {
//     if (userType === "Super-Admin" || userType === "Admin") {
//       api
//         .get("/agents/clients-rights")
//         .then((res) => {
//           const list = res.data || [];
//           list.sort((a, b) =>
//             a.company_name?.localeCompare(b.company_name, "en", {
//               sensitivity: "base",
//             })
//           );
//           setClients(list);
//         })
//         .catch((err) => console.error("Error fetching clients:", err));
//     } else {
//       setSelectedClient(String(companyId));
//     }
//   }, [userType, companyId]);

//   // ================================
//   // Load mappings on client change
//   // ================================
//   useEffect(() => {
//     if (selectedClient) loadMappings(selectedClient);
//   }, [selectedClient]);

//   const loadMappings = async (clientId) => {
//     try {
//       const res = await api.get("/did-master/list", {
//         params: { ClientId: clientId },
//       });

//       const list = res.data || [];
//       setMappings(list);

//       // ===== AUTO-FILL LATEST RECORD =====
//       if (list.length > 0) {
//         const latest = list[list.length - 1];

//         setExtension1(latest.did_number || "");
//         setExtension2(latest.customer_care_number || "");
//       } else {
//         setExtension1("");
//         setExtension2("");
//       }
//     } catch (err) {
//       console.error("Mappings Load Error:", err);
//     }
//   };

//   // ================================
//   // Create / Update DID
//   // ================================
//   // const handleUpdate = () => {
//   //   if (
//   //     !selectedClient ||
//   //     !String(extension1).trim() ||
//   //     !String(extension2).trim()
//   //   ) {
//   //     alert("Please fill all fields");
//   //     return;
//   //   }

//   //   const formData = new FormData();
//   //   formData.append("did_number", extension1);
//   //   formData.append("customer_care_number", extension2);
//   //   formData.append("client_id", selectedClient);

//   //   api
//   //     .post("/did-master/create", formData)
//   //     .then(() => {
//   //       loadMappings(selectedClient);
//   //     })
//   //     .catch((err) => console.error("Create DID Error:", err));
//   // };


// const handleUpdate = () => {
//   const ext1 = String(extension1 || "").trim();
//   const ext2 = String(extension2 || "").trim();

//   if (!selectedClient || !ext1 || !ext2) {
//     alert("Please fill all fields");
//     return;
//   }

//   const formData = new FormData();
//   formData.append("did_number", ext1);
//   formData.append("customer_care_number", ext2);
//   formData.append("client_id", selectedClient);

//   // Find existing DID for the client
//   const existing = mappings.length > 0 ? mappings[0] : null;

//   if (existing) {
//     // 🔄 UPDATE
//     api
//       .put(`/did-master/update/${existing.id}`, formData)
//       .then(() => loadMappings(selectedClient))
//       .catch((err) => console.error("Update DID Error:", err));
//   } else {
//     // ➕ CREATE
//     api
//       .post("/did-master/create", formData)
//       .then(() => loadMappings(selectedClient))
//       .catch((err) => console.error("Create DID Error:", err));
//   }
// };


//   // ================================
//   // DELETE MAPPING
//   // ================================
//   const handleDelete = (id) => {
//     if (!window.confirm("Are you sure you want to delete this mapping?")) return;

//     api
//       .delete(`/did-master/delete/${id}`)
//       .then(() => loadMappings(selectedClient))
//       .catch((err) => console.error("Delete DID Error:", err));
//   };

//   return (
//     <div className="row">
//       <div className="col-12">
//         <h4 className="mb-4">Dialer Mapping To Client</h4>

//         {/* Client Dropdown */}
//         {(userType === "Super-Admin" || userType === "Admin") && (
//           <div className="mb-4">
//             <label className="form-label fw-semibold">Select Client</label>
//             <select
//               className="form-select"
//               value={selectedClient}
//               onChange={(e) => setSelectedClient(e.target.value)}
//               style={{ width: "300px" }}
//             >
//               <option value="">-- Select Client --</option>

//               {clients.map((c) => (
//                 <option key={c.company_id} value={String(c.company_id)}>
//                   {c.company_name}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}

//         {/* Add Mapping */}
//         <div className="card mb-3">
//           <div className="card-body">
//             <h5 className="mb-3">Dialer Mapping</h5>

//             <div className="mb-3">
//               <input
//                 type="text"
//                 className="form-control"
//                 placeholder="Dialer Extension"
//                 value={extension1}
//                 onChange={(e) => setExtension1(e.target.value)}
//                 style={{ width: "250px" }}
//               />
//             </div>

//             <div className="mb-3">
//               <input
//                 type="text"
//                 className="form-control"
//                 placeholder="Customer Care Number"
//                 value={extension2}
//                 onChange={(e) => setExtension2(e.target.value)}
//                 style={{ width: "250px" }}
//               />
//             </div>

//             <button className="btn btn-primary" onClick={handleUpdate}>
//               Update
//             </button>
//           </div>
//         </div>

//         {/* Mapping Table */}
//         <div className="card mb-3">
//           <div className="card-body">
//             <h5 className="mb-3">View Client Ext Mapping</h5>

//             <div className="table-responsive">
//               <table className="table table-striped table-bordered">
//                 <thead className="table-light">
//                   <tr>
//                     <th>Dialer Extension</th>
//                     <th>Dialer Extension</th>
//                     <th>Create Date</th>
//                     <th>Update Date</th>
//                     <th>Action</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {mappings.length > 0 ? (
//                     mappings.map((m) => (
//                       <tr key={m.id}>
//                         <td>{m.did_number}</td>
//                         <td>{m.customer_care_number}</td>
//                         <td>{m.create_date}</td>
//                         <td>{m.update_date}</td>
//                         <td>
//                           <button
//                             className="btn btn-danger btn-sm"
//                             onClick={() => handleDelete(m.id)}
//                           >
//                             Delete
//                           </button>
//                         </td>
//                       </tr>
//                     ))
//                   ) : (
//                     <tr>
//                       <td colSpan="5" className="text-center">
//                         No mappings found
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>

//         {/* History Table */}
//         <div className="card mb-3">
//           <div className="card-body">
//             <h5 className="mb-3">Client Dialer Extension History</h5>

//             <div className="table-responsive">
//               <table className="table table-striped table-bordered">
//                 <thead className="table-light">
//                   <tr>
//                     <th>Dialer Extension</th>
//                     <th>Dialer Extension</th>
//                     <th>Create Date</th>
//                     <th>Update Date</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {mappings.length > 0 ? (
//                     mappings.map((m) => (
//                       <tr key={`history-${m.id}`}>
//                         <td>{m.did_number}</td>
//                         <td>{m.customer_care_number}</td>
//                         <td>{m.create_date}</td>
//                         <td>{m.update_date}</td>
//                       </tr>
//                     ))
//                   ) : (
//                     <tr>
//                       <td colSpan="4" className="text-center">
//                         No history found
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default DialerMapping;








// Dailer Mapping dynmaic..
import React, { useState, useEffect } from "react";
import api from "../api"; // axios instance

const DialerMapping = () => {
  const userType = localStorage.getItem("user_type");
  const companyId = localStorage.getItem("company_id");

  const [selectedClient, setSelectedClient] = useState("");
  const [clients, setClients] = useState([]);

  const [extension1, setExtension1] = useState("");
  const [extension2, setExtension2] = useState("");

  const [mappings, setMappings] = useState([]);

  // Alerts
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");

  const showAlert = (type, message) => {
    setAlertType(type);
    setAlertMessage(message);

    setTimeout(() => {
      setAlertMessage("");
    }, 3000);
  };

  // ================================
  // FETCH CLIENTS
  // ================================
  useEffect(() => {
    if (userType === "Super-Admin" || userType === "Admin") {
      api
        .get("/agents/clients-rights")
        .then((res) => {
          const list = res.data || [];
          list.sort((a, b) =>
            a.company_name?.localeCompare(b.company_name, "en", {
              sensitivity: "base",
            })
          );
          setClients(list);
        })
        .catch((err) => console.error("Error fetching clients:", err));
    } else {
      setSelectedClient(String(companyId));
    }
  }, [userType, companyId]);

  // ================================
  // Load mappings on client change
  // ================================
  useEffect(() => {
    if (selectedClient) loadMappings(selectedClient);
  }, [selectedClient]);

  const loadMappings = async (clientId) => {
    try {
      const res = await api.get("/did-master/list", {
        params: { ClientId: clientId },
      });

      const list = res.data || [];
      setMappings(list);

      // ===== AUTO-FILL LATEST RECORD =====
      if (list.length > 0) {
        const latest = list[list.length - 1];

        setExtension1(latest.did_number || "");
        setExtension2(latest.customer_care_number || "");
      } else {
        setExtension1("");
        setExtension2("");
      }
    } catch (err) {
      console.error("Mappings Load Error:", err);
    }
  };

  // ================================
  // Create / Update DID
  // ================================
  const handleUpdate = () => {
    const ext1 = String(extension1 || "").trim();
    const ext2 = String(extension2 || "").trim();

    if (!selectedClient || !ext1 || !ext2) {
      showAlert("danger", "Please fill all fields");
      return;
    }

    const formData = new FormData();
    formData.append("did_number", ext1);
    formData.append("customer_care_number", ext2);
    formData.append("client_id", selectedClient);

    const existing = mappings.length > 0 ? mappings[0] : null;

    if (existing) {
      // UPDATE
      api
        .put(`/did-master/update/${existing.id}`, formData)
        .then(() => {
          showAlert("success", "Dialer Mapping Updated Successfully");
          loadMappings(selectedClient);
        })
        .catch((err) => {
          showAlert("danger", "Update Failed!");
          console.error("Update DID Error:", err);
        });
    } else {
      // CREATE
      api
        .post("/did-master/create", formData)
        .then(() => {
          showAlert("success", "Dialer Mapping Created Successfully");
          loadMappings(selectedClient);
        })
        .catch((err) => {
          showAlert("danger", "Create Failed!");
          console.error("Create DID Error:", err);
        });
    }
  };

  // ================================
  // DELETE MAPPING
  // ================================
  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this mapping?")) return;

    api
      .delete(`/did-master/delete/${id}`)
      .then(() => {
        showAlert("success", "Mapping Deleted Successfully");
        loadMappings(selectedClient);
      })
      .catch((err) => {
        showAlert("danger", "Delete Failed!");
        console.error("Delete DID Error:", err);
      });
  };

  return (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Dialer Mapping To Client</h4>

        {/* Alerts */}
        {alertMessage && (
          <div className={`alert alert-${alertType}`} role="alert">
            {alertMessage}
          </div>
        )}

        {/* Client Dropdown */}
        {(userType === "Super-Admin" || userType === "Admin") && (
          <div className="mb-4">
            <label className="form-label fw-semibold">Select Client</label>
            <select
              className="form-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              style={{ width: "300px" }}
            >
              <option value="">-- Select Client --</option>

              {clients.map((c) => (
                <option key={c.company_id} value={String(c.company_id)}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Add Mapping */}
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="mb-3">Dialer Mapping</h5>

            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Dialer Extension"
                value={extension1}
                onChange={(e) => setExtension1(e.target.value)}
                style={{ width: "250px" }}
              />
            </div>

            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Customer Care Number"
                value={extension2}
                onChange={(e) => setExtension2(e.target.value)}
                style={{ width: "250px" }}
              />
            </div>

            <button className="btn btn-primary" onClick={handleUpdate}>
              Update
            </button>
          </div>
        </div>

        {/* Mapping Table */}
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="mb-3">View Client Ext Mapping</h5>

            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Dialer Extension</th>
                    <th>Customer Care Number</th>
                    <th>Create Date</th>
                    <th>Update Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {mappings.length > 0 ? (
                    mappings.map((m) => (
                      <tr key={m.id}>
                        <td>{m.did_number}</td>
                        <td>{m.customer_care_number}</td>
                        <td>{m.create_date}</td>
                        <td>{m.update_date}</td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(m.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">
                        No mappings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="mb-3">Client Dialer Extension History</h5>

            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Dialer Extension</th>
                    <th>Customer Care Number</th>
                    <th>Create Date</th>
                    <th>Update Date</th>
                  </tr>
                </thead>

                <tbody>
                  {mappings.length > 0 ? (
                    mappings.map((m) => (
                      <tr key={`history-${m.id}`}>
                        <td>{m.did_number}</td>
                        <td>{m.customer_care_number}</td>
                        <td>{m.create_date}</td>
                        <td>{m.update_date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center">
                        No history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DialerMapping;
