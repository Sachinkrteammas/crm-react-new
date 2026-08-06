import { useState, useEffect } from 'react';
import api from '../api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CampaignSubTypePage = () => {
  const [client, setClient] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [search, setSearch] = useState('');

  const [clients, setClients] = useState([]);
  const [campaignTypes, setCampaignTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const userType = localStorage.getItem('user_type');
  const companyId = localStorage.getItem('company_id');
  const isAdmin = userType === 'Super-Admin' || userType === 'Admin';

  useEffect(() => {
    fetchClients();
    fetchCampaignTypes();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get('/campaign-sub-type/clients');
      const data = res.data || [];
      setClients(data);
      if (!isAdmin) setClient(companyId || '');
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast.error('Failed to load clients.');
    }
  };

  const fetchCampaignTypes = async () => {
    try {
      const url = isAdmin
        ? '/campaign-sub-type/list'
        : `/campaign-sub-type/list?client_id=${companyId}`;
      const res = await api.get(url);
      setCampaignTypes(res.data || []);
    } catch (err) {
      console.error('Error fetching campaign types:', err);
      toast.error('Failed to load campaign types.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!client) {
      toast.error('Please select a client.');
      return;
    }
    if (!campaignType.trim()) {
      toast.error('Please enter a campaign type.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/campaign-sub-type/save', {
        client_id: Number(client),
        campaign_type: campaignType.trim(),
      });
      toast.success(res.data.message || 'Add Campaign Sub Type Successfully.');
      setCampaignType('');
      fetchCampaignTypes();
    } catch (err) {
      console.error('Error saving campaign type:', err.response || err);
      toast.error(err.response?.data?.detail || 'Failed to save campaign type.');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = campaignTypes.filter(
    (item) =>
      (item.CampaignType || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.ClientId !== null && item.ClientId !== undefined &&
        String(item.ClientId).toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const addPage = (num) => {
      if (!pages.includes(num)) pages.push(num);
    };

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) addPage(i);
    } else {
      addPage(1);
      if (currentPage > 3) addPage("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        if (i > 1 && i < totalPages) addPage(i);
      }
      if (currentPage < totalPages - 2) addPage("...");
      addPage(totalPages);
    }
    return pages;
  };

  return (
    <div className="row">
      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar
        style={{ marginTop: '90px' }}
      />
      <div className="col-12">
        {/* Add Campaign Sub Type */}
        <div className="card mb-4">
          <div className="card-header">
            <h6 className="mb-0">Add Campaign Sub Type</h6>
          </div>
          <div className="card-body">
            <form className="row g-3" onSubmit={handleSubmit}>
              {isAdmin && (
                <div className="col-md-2">
                  <label className="form-label">Select Client</label>
                  <select
                    className="form-select"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c.company_id} value={c.company_id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={`${isAdmin ? 'col-md-2' : 'col-md-2'}`}>
                <label className="form-label">Campaign Type</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Campaign Type"
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value)}
                />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* View Client Campaign Table */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">View Client Campaign</h6>
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm w-auto"
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search..."
                value={search}
                onChange={handleSearchChange}
                style={{ width: '200px' }}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered mb-0">
              <thead className="table-light">
                <tr>
                  <th>Sr.No.</th>
                  <th>Campaign Type</th>
                  <th>Client ID</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length > 0 ? (
                  currentRows.map((item, index) => (
                    <tr key={item.Id}>
                      <td>{indexOfFirstRow + index + 1}</td>
                      <td>{item.CampaignType}</td>
                      <td>{item.company_name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card-footer d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <small>
                Showing {filteredData.length === 0 ? 0 : indexOfFirstRow + 1} to{' '}
                {Math.min(indexOfLastRow, filteredData.length)} of {filteredData.length} entries
              </small>
            </div>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </button>
              </li>
              {getPageNumbers().map((num, i) =>
                num === "..." ? (
                  <li key={`ellipsis-${i}`} className="page-item disabled">
                    <span className="page-link">...</span>
                  </li>
                ) : (
                  <li
                    key={num}
                    className={`page-item ${currentPage === num ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => handlePageChange(num)}
                    >
                      {num}
                    </button>
                  </li>
                )
              )}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignSubTypePage;
