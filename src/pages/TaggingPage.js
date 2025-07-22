// TaggingHistorySearchTabs.jsx
import React from 'react';
import '../styles/TaggingHistorySearchTabs.css';

export default function TaggingHistorySearchTabs() {
  return (
    <div className="card mb-5 shadow-sm">
      {/* ——— Tabs Header ——— */}
      <div className="card-header bg-light border-0 pb-0">
        <ul className="nav nav-tabs custom-tabs" role="tablist">
          {['Tagging','History','Search'].map((t, i) => (
            <li className="nav-item" key={t}>
              <button
                className={`nav-link ${i===0?'active':''}`}
                data-bs-toggle="tab"
                data-bs-target={`#pane-${t.toLowerCase()}`}
                type="button"
                role="tab"
                aria-selected={i===0}
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ——— Tabs Content ——— */}
      <div className="card-body pt-4">
        <div className="tab-content">

          {/* — Tagging — */}
          <div className="tab-pane fade show active" id="pane-tagging" role="tabpanel">
            <div className="card mb-4">
              <div className="card-header bg-white">
                <h6 className="mb-0">Quick Tag</h6>
              </div>
              <div className="card-body">
                <div className="row g-4">
                  {/** Floating labels example **/}
                  <div className="col-md-6 form-floating">
                    <input id="callFrom" type="text" className="form-control" placeholder=" " />
                    <label htmlFor="callFrom">Call From</label>
                  </div>
                  <div className="col-md-6 form-floating">
                    <select id="scenarios" className="form-select" placeholder=" ">
                      <option value="">Select Scenario</option>
                    </select>
                    <label htmlFor="scenarios">Scenario</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header bg-white">
                <h6 className="mb-0">Details</h6>
              </div>
              <div className="card-body">
                <div className="row g-4">
                  {[
                    ['issue','Issue'],
                    ['contact','Contact Person'],
                    ['mobile','Mobile Number'],
                    ['city','City'],
                    ['house','House No'],
                    ['street','Street No']
                  ].map(([id,label])=>(
                    <div key={id} className="col-md-6 form-floating">
                      <input id={id} type="text" className="form-control" placeholder=" " />
                      <label htmlFor={id}>{label}</label>
                    </div>
                  ))}

                  <div className="col-md-6 form-floating">
                    <select id="block" className="form-select" placeholder=" ">
                      <option value="">Select Block/Marg/Road</option>
                    </select>
                    <label htmlFor="block">Block / Marg / Road</label>
                  </div>
                  <div className="col-md-6 form-floating">
                    <select id="state" className="form-select" placeholder=" ">
                      <option value="">Select State</option>
                    </select>
                    <label htmlFor="state">State</label>
                  </div>

                  <div className="col-12 text-end">
                    <button className="btn btn-primary px-4">Submit</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* — History — */}
          <div className="tab-pane fade" id="pane-history" role="tabpanel">
            <div className="card">
              <div className="card-header bg-white">
                <h6 className="mb-0">History Log</h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        {[
                          'In Call ID','Call From','Scenarios',
                          'Sub 1','Sub 2','Sub 3','Issue','Contact','Mobile',
                          'City','House','Street','Block','State'
                        ].map(h=> <th key={h}>{h}</th> )}
                      </tr>
                    </thead>
                    <tbody>
                      {/* TODO: render your real data here */}
                      <tr>
                        <td>271232</td><td>9810580244</td><td>Complaint</td>
                        <td>Electrical</td><td>Phase 1</td><td>—</td>
                        <td>Electricity</td><td>Surrender</td><td>9810580244</td>
                        <td>Gurgaon</td><td>G-16/32</td><td>Phase 1</td>
                        <td>Block-G</td><td>Haryana</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* — Search — */}
          <div className="tab-pane fade" id="pane-search" role="tabpanel">
            <div className="card mb-4">
              <div className="card-header bg-white">
                <h6 className="mb-0">Advanced Search</h6>
              </div>
              <div className="card-body">
                <div className="row g-4 align-items-end">
                  {[
                    ['searchId','In Call ID','text'],
                    ['searchFrom','Call From','text'],
                    ['searchDate','Call Date','date'],
                  ].map(([id,label,type])=>(
                    <div key={id} className="col-md-4 form-floating">
                      <input id={id} type={type} className="form-control" placeholder=" " />
                      <label htmlFor={id}>{label}</label>
                    </div>
                  ))}
                  <div className="col-md-4 text-end">
                    <button className="btn btn-primary px-4">Search</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header bg-white">
                <h6 className="mb-0">Search Results</h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        {[
                          'In Call ID','Call From','Date','Scenarios','Issue','Contact',
                          'Mobile','City','House','Street','Block'
                        ].map(h=> <th key={h}>{h}</th> )}
                      </tr>
                    </thead>
                    <tbody>
                      {/* TODO: map your results */}
                      <tr>
                        <td>271232</td><td>9810580244</td><td>2025‑07‑20</td>
                        <td>Complaint</td><td>Electricity</td><td>Surrender</td>
                        <td>9810580244</td><td>Gurgaon</td><td>G‑16/32</td>
                        <td>Phase 1</td><td>Block‑G</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
