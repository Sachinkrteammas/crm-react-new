import React, { useEffect, useState } from "react";
import api from "../api";

const ObdManagements_Data_Upload = () => {
  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const response = await api.get("/obd/list");
      setLists(response.data || []);
    } catch (error) {
      console.error("Error loading lists", error);
    }
  };

  const handleUpload = async () => {
    if (!listId) {
      alert("Please Select List");
      return;
    }

    if (!file) {
      alert("Please Select CSV File");
      return;
    }

    const formData = new FormData();

    formData.append("list_id", listId);
    formData.append("file", file);

    try {
      setLoading(true);

      const response = await api.post(
        "/obd/data-upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert(
        response.data.message ||
          "CSV Uploaded Successfully"
      );

      setFile(null);
      document.getElementById("csvFile").value = "";

    } catch (error) {
      console.error(error);
      alert("Upload Failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = () => {
    const csvContent = "Phone Number\n8218024554";

    const blob = new Blob(
      [csvContent],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "Sample_File.csv";

    link.click();
  };

  return (
    <div className="row">
      <div className="col-12">

        <h3 className="mb-4">
          Data Upload
        </h3>

        <div className="card shadow-sm">

          <div className="card-body">

            <div className="row align-items-center g-3">

              <div className="col-md-5">
                <label className="form-label">
                  Select List
                </label>

                <select
                  className="form-select"
                  value={listId}
                  onChange={(e) =>
                    setListId(e.target.value)
                  }
                >
                  <option value="">
                    Select List
                  </option>

                  {lists.map((item, index) => (
                    <option
                      key={index}
                      value={item.list_id}
                    >
                      {item.list_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-5">
                <label className="form-label">
                  CSV File
                </label>

                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  className="form-control"
                  onChange={(e) =>
                    setFile(e.target.files[0])
                  }
                />


              </div>
              <div className="col-md-4">
              <small className="text-muted">
                  Only CSV file allowed{" "}
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={downloadSample}
                  >
                    Sample File
                  </button>
                </small>
                </div>

              <div className="col-md-2">
                <button
                  className="btn btn-primary w-100"
                  onClick={handleUpload}
                  disabled={loading}
                >
                  {loading
                    ? "Uploading..."
                    : "UPLOAD"}
                </button>


              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ObdManagements_Data_Upload;