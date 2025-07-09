import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const Layout = () => {
const [theme, setTheme] = useState('dark');
const [username, setUsername] = useState("");

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);



useEffect(() => {

    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
  };



    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSidebarHovered, setIsSidebarHovered] = useState(false);



    const [openMenus, setOpenMenus] = useState({
        inCall: false,
        outCall: false,
        misReports: false,
        billing: false,
    });

    const toggleMenu = (menu) => {
        setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
    };

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
    };

    useEffect(() => {
        if (isSidebarOpen || isSidebarHovered) {
            document.body.classList.remove("layout-menu-collapsed");
        } else {
            document.body.classList.add("layout-menu-collapsed");
        }
    }, [isSidebarOpen, isSidebarHovered]);

  return (
    <div className="layout-wrapper layout-content-navbar">
    <div className="layout-container">
      {/* Sidebar */}
      <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme"
          onMouseEnter={() => {
                if (!isSidebarOpen) {
                    setIsSidebarHovered(true);
                }
            }}
            onMouseLeave={() => {
                if (!isSidebarOpen) {
                    setIsSidebarHovered(false);
                }
          }}>
          <div className="app-brand demo">
            <Link to="/dashboard" className="app-brand-link">
              <span className="app-brand-logo demo">
                <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M0 0V6.85C0 6.85 -0.13 9.01 1.98 10.84L13.69 22L19.78 21.92L18.8 9.88L16.49 7.17L9.23 0H0Z" fill="currentColor" />
                  <path opacity="0.06" fillRule="evenodd" clipRule="evenodd" d="M7.7 16.43L12.52 3.23L16.55 7.25L7.7 16.43Z" fill="#161616" />
                  <path opacity="0.06" fillRule="evenodd" clipRule="evenodd" d="M8.07 15.91L13.94 4.63L16.58 7.28L8.07 15.91Z" fill="#161616" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M7.77 16.35L23.65 0H32V6.88C32 6.88 31.82 9.17 30.65 10.40L19.78 22H13.69L7.77 16.35Z" fill="currentColor" />
                </svg>
              </span>
              <span className="app-brand-text demo menu-text fw-bold ms-3">DialDesk</span>
            </Link>
            <a
                href="#"
                className="layout-menu-toggle menu-link text-large ms-auto"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSidebarOpen((prev) => !prev);
                  if (isSidebarHovered) {
                      setIsSidebarHovered(false);
                  }
                }}
            >
                <i className="icon-base ti menu-toggle-icon d-none d-xl-block"></i>
                <i className="icon-base ti tabler-x d-block d-xl-none"></i>
            </a>
          </div>

          <div className="menu-inner-shadow"></div>

          <ul className="menu-inner py-1">

            {/* Dashboard */}
            <li className={`menu-item ${location.pathname === "/dashboard" ? "active" : ""}`}>
              <Link to="/dashboard" className="menu-link">
                <i className="menu-icon icon-base ti tabler-smart-home"></i>
                <div>Dashboard</div>
              </Link>
            </li>

            {/* In Call Operations */}
            <li className={`menu-item ${openMenus.inCall ? "open active" : ""}`}>
              <a href="#" className="menu-link menu-toggle" onClick={() => toggleMenu("inCall")}>
                <i className="menu-icon icon-base ti tabler-phone-incoming"></i>
                <div>In Call Operations</div>
              </a>
              <ul className="menu-sub" style={{ display: openMenus.inCall ? "block" : "none" }}>
                <li className="menu-item">
                  <Link to="/call_details" className="menu-link">
                    <div>In Call Details</div>
                  </Link>
                </li>
                <li className="menu-item">
                  <Link to="/csat_view" className="menu-link">
                    <div>CSAT View</div>
                  </Link>
                </li>
              </ul>
            </li>

            {/* Out Call Operations */}
            <li className={`menu-item ${openMenus.outCall ? "open active" : ""}`}>
              <a href="#" className="menu-link menu-toggle" onClick={() => toggleMenu("outCall")}>
                <i className="menu-icon icon-base ti tabler-phone-outgoing"></i>
                <div>Out Call Operations</div>
              </a>
              <ul className="menu-sub" style={{ display: openMenus.outCall ? "block" : "none" }}>
                <li className="menu-item">
                  <Link to="/out_call_details" className="menu-link">
                    <div>Out Call Details</div>
                  </Link>
                </li>
                <li className="menu-item">
                  <Link to="/priority_calls" className="menu-link">
                    <div>Priority Calls via API</div>
                  </Link>
                </li>
              </ul>
            </li>

            {/* MIS & Reports */}
            <li className={`menu-item ${openMenus.misReports ? "open active" : ""}`}>
              <a href="#" className="menu-link menu-toggle" onClick={() => toggleMenu("misReports")}>
                <i className="menu-icon icon-base ti tabler-file-report"></i>
                <div>MIS & Reports</div>
              </a>
              <ul className="menu-sub" style={{ display: openMenus.misReports ? "block" : "none" }}>
                <li className="menu-item">
                  <Link to="/cdr-report" className="menu-link">
                    <div>CDR Report</div>
                  </Link>
                </li>
                <li className="menu-item">
                  <Link to="/ob-cdr-report" className="menu-link">
                    <div>OB CDR Report</div>
                  </Link>
                </li>
                <li className="menu-item">
                  <Link to="/ivr-report" className="menu-link">
                    <div>IVR Report</div>
                  </Link>
                </li>
                <li className="menu-item">
                  <Link to="/ob-shared-cdr-report" className="menu-link">
                    <div>OB Shared CDR Report</div>
                  </Link>
                </li>
                <li className="menu-item">
                  <Link to="/ivr-funnel-report" className="menu-link">
                    <div>IVR Funnel Report</div>
                  </Link>
                </li>
              </ul>
            </li>

            {/* Billing Statement */}
            <li className={`menu-item ${openMenus.billing ? "open active" : ""}`}>
              <a href="#" className="menu-link menu-toggle" onClick={() => toggleMenu("billing")}>
                <i className="menu-icon icon-base ti tabler-receipt"></i>
                <div>Billing Statement</div>
              </a>
              <ul className="menu-sub" style={{ display: openMenus.billing ? "block" : "none" }}>
                <li className="menu-item">
                  <Link to="/bill_statement" className="menu-link">
                    <div>Statement New</div>
                  </Link>
                </li>
              </ul>
            </li>

          </ul>
      </aside>

      {/* Main Content */}
      <div className="layout-page">
        {/* Header */}
        <header className="layout-header navbar">
          {/* Add your header logic here if needed */}
          <nav
            className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme"
            id="layout-navbar">
            <div className="layout-menu-toggle navbar-nav align-items-xl-center me-3 me-xl-0 d-xl-none">
              <a className="nav-item nav-link px-0 me-xl-6" href="#">
                <i className="icon-base ti tabler-menu-2 icon-md"></i>
              </a>
            </div>

            <div className="navbar-nav-right d-flex align-items-center justify-content-end" id="navbar-collapse">
              {/* Search */}
              <div className="navbar-nav align-items-center">
                <div className="nav-item navbar-search-wrapper px-md-0 px-2 mb-0">
                  <a className="nav-item nav-link search-toggler d-flex align-items-center px-0" href="#">
                    <span className="d-inline-block text-body-secondary fw-normal" id="autocomplete"></span>
                  </a>
                </div>
              </div>

              {/* /Search */}

              <ul className="navbar-nav flex-row align-items-center ms-md-auto">


                {/* Style Switcher */}
                <li className="nav-item dropdown">
                  <a
                    className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
                    id="nav-theme"
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    data-bs-toggle="dropdown"
                  >
                    <i className={`icon-base ti icon-22px theme-icon-active text-heading tabler-${theme === 'light' ? 'sun' : theme === 'dark' ? 'moon-stars' : 'device-desktop-analytics'}`}></i>
                    <span className="d-none ms-2" id="nav-theme-text">Toggle theme</span>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="nav-theme-text">
                    {['light', 'dark', 'system'].map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          className={`dropdown-item align-items-center ${theme === t ? 'active' : ''}`}
                          data-bs-theme-value={t}
                          aria-pressed={theme === t}
                          onClick={() => handleThemeChange(t)}
                        >
                          <span>
                            <i
                              className={`icon-base ti icon-22px me-3 ${
                                t === 'light' ? 'tabler-sun' : t === 'dark' ? 'tabler-moon-stars' : 'tabler-device-desktop-analytics'
                              }`}
                            ></i>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>

                {/* / Style Switcher*/}

                {/* Quick links  */}

                {/* Quick links */}

                {/* Notification */}

                {/*/ Notification */}

                {/* User */}
                <li className="nav-item navbar-dropdown dropdown-user dropdown">
                  <a
                    className="nav-link dropdown-toggle hide-arrow p-0"
                    href="#"
                    data-bs-toggle="dropdown">
                    <div className="avatar avatar-online">
                      <img src="../../assets/img/avatars/1.png" alt className="rounded-circle" />
                    </div>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <a className="dropdown-item mt-0" href="#">
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0 me-2">
                            <div className="avatar avatar-online">
                              <img src="../../assets/img/avatars/1.png" alt className="rounded-circle" />
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-0">{username}</h6>
                            <small className="text-body-secondary">Admin</small>
                          </div>
                        </div>
                      </a>
                    </li>
                    <li>
                      <div className="dropdown-divider my-1 mx-n2"></div>
                    </li>

                    <li>
                      <div className="d-grid px-2 pt-2 pb-1">
                        <Link to="/logout" className="btn btn-sm btn-danger d-flex">
                          <small className="align-middle">Logout</small>
                          <i className="icon-base ti tabler-logout ms-2 icon-14px"></i>
                        </Link>
                      </div>
                    </li>
                  </ul>
                </li>
                {/*/ User */}
              </ul>
            </div>
          </nav>
        </header>

        <div className="content-wrapper">
          <div className="container-xxl flex-grow-1 container-p-y">
            <Outlet /> {/* Routes will render here */}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Layout;
