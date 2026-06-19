import React, { useEffect, useState } from "react";
import api from "../api";

const Obd_Managements_addlist = () => {
  const [listId, setListId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [listData, setListData] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const response = await api.get("/obd/list-master");
      setListData(response.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!listId.trim()) {
      alert("Please Enter List Id");
      return;
    }

    if (!description.trim()) {
      alert("Please Enter Description");
      return;
    }

    try {
      setLoading(true);

      await api.post("/obd/add-list", {
        list_id: listId,
        description: description,
        created_by: "Admin"
      });

      alert("List Added Successfully");

      setListId("");
      setDescription("");

      fetchLists();
    } catch (error) {
      console.error(error);
      alert("Failed to Add List");
    } finally {
      setLoading(false);
    }
  };

  const deleteList = async (id) => {
    if (!window.confirm("Delete this List?")) {
      return;
    }

    try {
      await api.delete(`/obd/list/${id}`);

      alert("Deleted Successfully");

      fetchLists();
    } catch (error) {
      console.error(error);
      alert("Delete Failed");
    }
  };

  const filteredData = listData.filter(
    (row) =>
      row.list_id?.toString().includes(search) ||
      row.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-fluid">

      <h3 className="mb-4">Add List</h3>

      {/* Add Form */}
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h6 className="mb-0">ADD LIST</h6>
        </div>

        <div className="card-body">
          <div className="row align-items-start">

            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="List Id"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <textarea
                rows="5"
                className="form-control"
                placeholder="Description"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
              />
            </div>

            <div className="col-md-2">
              <button
                className="btn btn-primary w-100"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Submitting..." : "SUBMIT"}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* List Table */}
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">VIEW LIST ID</h6>

          <input
            type="text"
            className="form-control"
            placeholder="Search..."
            style={{ width: "220px" }}
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="table-responsive">
          <table className="table table-bordered table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>LIST ID</th>
                <th>DESCRIPTION</th>
                <th>CREATE DATE</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{row.list_id}</td>
                    <td>{row.description}</td>
                    <td>{row.createdate}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteList(row.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center"
                  >
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

export default Obd_Managements_addlist;