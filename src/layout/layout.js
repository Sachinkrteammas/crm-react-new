import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const Layout = () => {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleDashboard = () => {
    setIsDashboardOpen(!isDashboardOpen);
  };

  const toggleSubMenu = (menuName) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    const wrapper = document.querySelector(".layout-wrapper");
    if (!wrapper) return;

    if (isSidebarOpen) {
      wrapper.classList.remove("layout-menu-collapsed");
      wrapper.classList.remove("layout-menu-hover");
    } else {
      wrapper.classList.add("layout-menu-collapsed");

      const handleMouseEnter = () => wrapper.classList.add("layout-menu-hover");
      const handleMouseLeave = () => wrapper.classList.remove("layout-menu-hover");

      wrapper.addEventListener("mouseenter", handleMouseEnter);
      wrapper.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        wrapper.removeEventListener("mouseenter", handleMouseEnter);
        wrapper.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, [isSidebarOpen]);

  return (
    <div className="layout-wrapper layout-content-navbar">
    <div className="layout-container">
      {/* Sidebar */}
      <aside id="layout-menu" className="layout-menu menu-vertical menu">
        {/* Sidebar content using your snippet */}
        <div className="app-brand demo">
          <Link  to="/dashboard" className="app-brand-link">
            <span className="app-brand-logo demo">
              <span className="text-primary">
                {/* SVG logo here */}
                <svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M0.00172773 0V6.85398C0.00172773 6.85398 -0.133178 9.01207 1.98092 10.8388L13.6912 21.9964L19.7809 21.9181L18.8042 9.88248L16.4951 7.17289L9.23799 0H0.00172773Z"
                      fill="currentColor" />
                    <path
                      opacity="0.06"
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M7.69824 16.4364L12.5199 3.23696L16.5541 7.25596L7.69824 16.4364Z"
                      fill="#161616" />
                    <path
                      opacity="0.06"
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M8.07751 15.9175L13.9419 4.63989L16.5849 7.28475L8.07751 15.9175Z"
                      fill="#161616" />
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M7.77295 16.3566L23.6563 0H32V6.88383C32 6.88383 31.8262 9.17836 30.6591 10.4057L19.7824 22H13.6938L7.77295 16.3566Z"
                      fill="currentColor" />
                  </svg>
              </span>
            </span>
            <span className="app-brand-text demo menu-text fw-bold ms-3">DialDesk</span>
          </Link>

          <a
            href="#"
            className="layout-menu-toggle menu-link text-large ms-auto"
            onClick={(e) => {
              e.preventDefault();
              toggleSidebar();
            }}
          >
            <i className="icon-base ti menu-toggle-icon d-none d-xl-block"></i>
            <i className="icon-base ti tabler-x d-block d-xl-none"></i>
          </a>
        </div>

        <div className="menu-inner-shadow"></div>

        <ul className="menu-inner py-1">
          {/* Dashboard structure */}
          <li className={`menu-item ${isDashboardOpen ? "active open" : ""}`}>
            <a
              href="#"
              className="menu-link menu-toggle"
              onClick={(e) => {
                e.preventDefault();
                toggleDashboard();
              }}
            >
              <i className="menu-icon icon-base ti tabler-smart-home"></i>
              <div>Dashboards</div>
            </a>

            <ul className="menu-sub" style={{ display: isDashboardOpen ? "block" : "none" }}>
              {/* In Call Operations */}
              <li className={`menu-item ${openSubMenus["inCall"] ? "active open" : ""}`}>
                <a
                  href="#"
                  className="menu-link menu-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubMenu("inCall");
                  }}
                >
                  <i className="menu-icon icon-base ti tabler-phone-incoming"></i>
                  <div>In Call Operations</div>
                </a>
                <ul className="menu-sub" style={{ display: openSubMenus["inCall"] ? "block" : "none" }}>
                  <li className="menu-item">
                     <Link  to="/call_details" className="menu-link">
                      <div>In Call Details</div>
                      </Link>
                  </li>
                  <li className="menu-item">
                    <a href="#" className="menu-link">
                      <div>CSAT View</div>
                    </a>
                  </li>
                </ul>
              </li>

              {/* Out Call Operations */}
              <li className={`menu-item ${openSubMenus['outCall'] ? 'active open' : ''}`}>
                <a
                  href="#"
                  className="menu-link menu-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubMenu('outCall');
                  }}
                >
                  <i className="menu-icon icon-base ti tabler-phone-outgoing"></i>
                  <div data-i18n="Out Call Operations">Out Call Operations</div>
                </a>
                <ul
                  className="menu-sub"
                  style={{ display: openSubMenus['outCall'] ? 'block' : 'none' }}
                >
                  <li className="menu-item">
                    <a href="#" className="menu-link">
                      <div data-i18n="Out Call Details">Out Call Details</div>
                    </a>
                  </li>
                  <li className="menu-item">
                    <a href="#" className="menu-link">
                      <div data-i18n="Priority Calls via API">Priority Calls via API</div>
                    </a>
                  </li>
                </ul>
              </li>

              {/* MIS & Reports */}
              <li className={`menu-item ${openSubMenus['misReports'] ? 'active open' : ''}`}>
                <a
                  href="#"
                  className="menu-link menu-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubMenu('misReports');
                  }}
                >
                  <i className="menu-icon icon-base ti tabler-file-report"></i>
                  <div data-i18n="MIS & Reports">MIS & Reports</div>
                </a>
                <ul
                  className="menu-sub"
                  style={{ display: openSubMenus['misReports'] ? 'block' : 'none' }}
                >
                  <li className="menu-item">
                    <Link  to="/cdr-report" className="menu-link">
                        <div data-i18n="CDR Report">CDR Report</div>
                    </Link>
                  </li>
                  <li className="menu-item">
                    <Link  to="/ob-cdr-report" className="menu-link">
                      <div data-i18n="OB CDR Report">OB CDR Report</div>
                    </Link>
                  </li>
                  <li className="menu-item">
                    <Link  to="/ivr-report" className="menu-link">
                      <div data-i18n="IVR Reports">IVR Reports</div>
                    </Link>
                  </li>
                  <li className="menu-item">
                    <Link to="/ob-shared-cdr-report" className="menu-link">
                      <div data-i18n="OB Shared CDR Report">OB Shared CDR Report</div>
                    </Link>
                  </li>
                  <li className="menu-item">
                    <Link to="/ivr-funnel-report" className="menu-link">
                      <div data-i18n="IVR Funnel Report">IVR Funnel Report</div>
                    </Link>
                  </li>
                </ul>
              </li>

              {/* Billing Statement */}
              <li className={`menu-item ${openSubMenus['billing'] ? 'active open' : ''}`}>
                <a
                  href="#"
                  className="menu-link menu-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSubMenu('billing');
                  }}
                >
                  <i className="menu-icon icon-base ti tabler-receipt"></i>
                  <div data-i18n="Billing Statement">Billing Statement</div>
                </a>
                <ul
                  className="menu-sub"
                  style={{ display: openSubMenus['billing'] ? 'block' : 'none' }}
                >
                  <li className="menu-item">
                    <a href="#" className="menu-link">
                      <div data-i18n="Statement New">Statement New</div>
                    </a>
                  </li>
                </ul>
              </li>

            </ul>
          </li>
        </ul>
      </aside>

      <div className="menu-mobile-toggler d-xl-none rounded-1">
          <a href="#" className="layout-menu-toggle menu-link text-large text-bg-secondary p-2 rounded-1">
            <i className="ti tabler-menu icon-base"></i>
            <i className="ti tabler-chevron-right icon-base"></i>
          </a>
      </div>

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
                <li className="nav-item dropdown-language dropdown">
                  <a
                    className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
                    href="#"
                    data-bs-toggle="dropdown">
                    <i className="icon-base ti tabler-language icon-22px text-heading"></i>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <a className="dropdown-item" href="#" data-language="en" data-text-direction="ltr">
                        <span>English</span>
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#" data-language="fr" data-text-direction="ltr">
                        <span>French</span>
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#" data-language="ar" data-text-direction="rtl">
                        <span>Arabic</span>
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#" data-language="de" data-text-direction="ltr">
                        <span>German</span>
                      </a>
                    </li>
                  </ul>
                </li>
                {/*/ Language */}

                {/* Style Switcher */}
                <li className="nav-item dropdown">
                  <a
                    className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
                    id="nav-theme"
                    href="#"
                    onClick={e => e.preventDefault()}
                    data-bs-toggle="dropdown">
                    <i className="icon-base ti tabler-sun icon-22px theme-icon-active text-heading"></i>
                    <span className="d-none ms-2" id="nav-theme-text">Toggle theme</span>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="nav-theme-text">
                    <li>
                      <button
                        type="button"
                        className="dropdown-item align-items-center active"
                        data-bs-theme-value="light"
                        aria-pressed="false">
                        <span><i className="icon-base ti tabler-sun icon-22px me-3" data-icon="sun"></i>Light</span>
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item align-items-center"
                        data-bs-theme-value="dark"
                        aria-pressed="true">
                        <span
                          ><i className="icon-base ti tabler-moon-stars icon-22px me-3" data-icon="moon-stars"></i
                          >Dark</span
                        >
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item align-items-center"
                        data-bs-theme-value="system"
                        aria-pressed="false">
                        <span
                          ><i
                            className="icon-base ti tabler-device-desktop-analytics icon-22px me-3"
                            data-icon="device-desktop-analytics"></i
                          >System</span
                        >
                      </button>
                    </li>
                  </ul>
                </li>
                {/* / Style Switcher*/}

                {/* Quick links  */}
                <li className="nav-item dropdown-shortcuts navbar-dropdown dropdown">
                  <a
                    className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
                    href="#"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="outside"
                    aria-expanded="false">
                    <i className="icon-base ti tabler-layout-grid-add icon-22px text-heading"></i>
                  </a>
                  <div className="dropdown-menu dropdown-menu-end p-0">
                    <div className="dropdown-menu-header border-bottom">
                      <div className="dropdown-header d-flex align-items-center py-3">
                        <h6 className="mb-0 me-auto">Shortcuts</h6>
                        <a
                          href="#"
                          className="dropdown-shortcuts-add py-2 btn btn-text-secondary rounded-pill btn-icon"
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          title="Add shortcuts"
                          ><i className="icon-base ti tabler-plus icon-20px text-heading"></i
                        ></a>
                      </div>
                    </div>
                    <div className="dropdown-shortcuts-list scrollable-container">
                      <div className="row row-bordered overflow-visible g-0">
                        <div className="dropdown-shortcuts-item col">
                          <span className="dropdown-shortcuts-icon rounded-circle mb-3">
                            <i className="icon-base ti tabler-calendar icon-26px text-heading"></i>
                          </span>
                          <a href="#" className="stretched-link">Calendar</a>
                          <small>Appointments</small>
                        </div>
                        <div className="dropdown-shortcuts-item col">
                          <span className="dropdown-shortcuts-icon rounded-circle mb-3">
                            <i className="icon-base ti tabler-file-dollar icon-26px text-heading"></i>
                          </span>
                          <a href="#" className="stretched-link">Invoice App</a>
                          <small>Manage Accounts</small>
                        </div>
                      </div>
                      <div className="row row-bordered overflow-visible g-0">
                        <div className="dropdown-shortcuts-item col">
                          <span className="dropdown-shortcuts-icon rounded-circle mb-3">
                            <i className="icon-base ti tabler-user icon-26px text-heading"></i>
                          </span>
                          <a href="#" className="stretched-link">User App</a>
                          <small>Manage Users</small>
                        </div>
                        <div className="dropdown-shortcuts-item col">
                          <span className="dropdown-shortcuts-icon rounded-circle mb-3">
                            <i className="icon-base ti tabler-users icon-26px text-heading"></i>
                          </span>
                          <a href="#" className="stretched-link">Role Management</a>
                          <small>Permission</small>
                        </div>
                      </div>
                      <div className="row row-bordered overflow-visible g-0">
                        <div className="dropdown-shortcuts-item col">
                          <span className="dropdown-shortcuts-icon rounded-circle mb-3">
                            <i className="icon-base ti tabler-device-desktop-analytics icon-26px text-heading"></i>
                          </span>
                          <a href="#" className="stretched-link">Dashboard</a>
                          <small>User Dashboard</small>
                        </div>
                        <div className="dropdown-shortcuts-item col">
                          <span className="dropdown-shortcuts-icon rounded-circle mb-3">
                            <i className="icon-base ti tabler-settings icon-26px text-heading"></i>
                          </span>
                          <a href="#" className="stretched-link">Setting</a>
                          <small>Account Settings</small>
                        </div>
                      </div>
                      <div className="row row-bordered overflow-visible g-0">
                        <div className="dropdown-shortcuts-item col">
                          <span className="dropdown-shortcuts-icon rounded-circle mb-3">
                            <i className="icon-base ti tabler-help-circle icon-26px text-heading"></i>
                          </span>
                          <a href="#" className="stretched-link">FAQs</a>
                          <small>FAQs & Articles</small>
                        </div>
                        <div className="dropdown-shortcuts-item col">
                          <span className="dropdown-shortcuts-icon rounded-circle mb-3">
                            <i className="icon-base ti tabler-square icon-26px text-heading"></i>
                          </span>
                          <a href="#" className="stretched-link">Modals</a>
                          <small>Useful Popups</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                {/* Quick links */}

                {/* Notification */}
                <li className="nav-item dropdown-notifications navbar-dropdown dropdown me-3 me-xl-2">
                  <a
                    className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
                    href="#"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="outside"
                    aria-expanded="false">
                    <span className="position-relative">
                      <i className="icon-base ti tabler-bell icon-22px text-heading"></i>
                      <span className="badge rounded-pill bg-danger badge-dot badge-notifications border"></span>
                    </span>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end p-0">
                    <li className="dropdown-menu-header border-bottom">
                      <div className="dropdown-header d-flex align-items-center py-3">
                        <h6 className="mb-0 me-auto">Notification</h6>
                        <div className="d-flex align-items-center h6 mb-0">
                          <span className="badge bg-label-primary me-2">8 New</span>
                          <a
                            href="#"
                            className="dropdown-notifications-all p-2 btn btn-icon"
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Mark all as read"
                            ><i className="icon-base ti tabler-mail-opened text-heading"></i
                          ></a>
                        </div>
                      </div>
                    </li>
                    <li className="dropdown-notifications-list scrollable-container">
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item list-group-item-action dropdown-notifications-item">
                          <div className="d-flex">
                            <div className="flex-shrink-0 me-3">
                              <div className="avatar">
                                <img src="../../assets/img/avatars/1.png" alt className="rounded-circle" />
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="small mb-1">Congratulation Lettie 🎉</h6>
                              <small className="mb-1 d-block text-body">Won the monthly best seller gold badge</small>
                              <small className="text-body-secondary">1h ago</small>
                            </div>
                            <div className="flex-shrink-0 dropdown-notifications-actions">
                              <a href="#" className="dropdown-notifications-read"
                                ><span className="badge badge-dot"></span
                              ></a>
                              <a href="#" className="dropdown-notifications-archive"
                                ><span className="icon-base ti tabler-x"></span
                              ></a>
                            </div>
                          </div>
                        </li>
                        <li className="list-group-item list-group-item-action dropdown-notifications-item">
                          <div className="d-flex">
                            <div className="flex-shrink-0 me-3">
                              <div className="avatar">
                                <span className="avatar-initial rounded-circle bg-label-danger">CF</span>
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 small">Charles Franklin</h6>
                              <small className="mb-1 d-block text-body">Accepted your connection</small>
                              <small className="text-body-secondary">12hr ago</small>
                            </div>
                            <div className="flex-shrink-0 dropdown-notifications-actions">
                              <a href="#" className="dropdown-notifications-read"
                                ><span className="badge badge-dot"></span
                              ></a>
                              <a href="#" className="dropdown-notifications-archive"
                                ><span className="icon-base ti tabler-x"></span
                              ></a>
                            </div>
                          </div>
                        </li>
                        <li className="list-group-item list-group-item-action dropdown-notifications-item marked-as-read">
                          <div className="d-flex">
                            <div className="flex-shrink-0 me-3">
                              <div className="avatar">
                                <img src="../../assets/img/avatars/2.png" alt className="rounded-circle" />
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 small">New Message ✉️</h6>
                              <small className="mb-1 d-block text-body">You have new message from Natalie</small>
                              <small className="text-body-secondary">1h ago</small>
                            </div>
                            <div className="flex-shrink-0 dropdown-notifications-actions">
                              <a href="#" className="dropdown-notifications-read"
                                ><span className="badge badge-dot"></span
                              ></a>
                              <a href="#" className="dropdown-notifications-archive"
                                ><span className="icon-base ti tabler-x"></span
                              ></a>
                            </div>
                          </div>
                        </li>
                        <li className="list-group-item list-group-item-action dropdown-notifications-item">
                          <div className="d-flex">
                            <div className="flex-shrink-0 me-3">
                              <div className="avatar">
                                <span className="avatar-initial rounded-circle bg-label-success"
                                  ><i className="icon-base ti tabler-shopping-cart"></i
                                ></span>
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 small">Whoo! You have new order 🛒</h6>
                              <small className="mb-1 d-block text-body">ACME Inc. made new order $1,154</small>
                              <small className="text-body-secondary">1 day ago</small>
                            </div>
                            <div className="flex-shrink-0 dropdown-notifications-actions">
                              <a href="#" className="dropdown-notifications-read"
                                ><span className="badge badge-dot"></span
                              ></a>
                              <a href="#" className="dropdown-notifications-archive"
                                ><span className="icon-base ti tabler-x"></span
                              ></a>
                            </div>
                          </div>
                        </li>
                        <li className="list-group-item list-group-item-action dropdown-notifications-item marked-as-read">
                          <div className="d-flex">
                            <div className="flex-shrink-0 me-3">
                              <div className="avatar">
                                <img src="../../assets/img/avatars/9.png" alt className="rounded-circle" />
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 small">Application has been approved 🚀</h6>
                              <small className="mb-1 d-block text-body"
                                >Your ABC project application has been approved.</small
                              >
                              <small className="text-body-secondary">2 days ago</small>
                            </div>
                            <div className="flex-shrink-0 dropdown-notifications-actions">
                              <a href="#" className="dropdown-notifications-read"
                                ><span className="badge badge-dot"></span
                              ></a>
                              <a href="#" className="dropdown-notifications-archive"
                                ><span className="icon-base ti tabler-x"></span
                              ></a>
                            </div>
                          </div>
                        </li>
                        <li className="list-group-item list-group-item-action dropdown-notifications-item marked-as-read">
                          <div className="d-flex">
                            <div className="flex-shrink-0 me-3">
                              <div className="avatar">
                                <span className="avatar-initial rounded-circle bg-label-success"
                                  ><i className="icon-base ti tabler-chart-pie"></i
                                ></span>
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 small">Monthly report is generated</h6>
                              <small className="mb-1 d-block text-body">July monthly financial report is generated </small>
                              <small className="text-body-secondary">3 days ago</small>
                            </div>
                            <div className="flex-shrink-0 dropdown-notifications-actions">
                              <a href="#" className="dropdown-notifications-read"
                                ><span className="badge badge-dot"></span
                              ></a>
                              <a href="#" className="dropdown-notifications-archive"
                                ><span className="icon-base ti tabler-x"></span
                              ></a>
                            </div>
                          </div>
                        </li>
                        <li className="list-group-item list-group-item-action dropdown-notifications-item marked-as-read">
                          <div className="d-flex">
                            <div className="flex-shrink-0 me-3">
                              <div className="avatar">
                                <img src="../../assets/img/avatars/5.png" alt className="rounded-circle" />
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 small">Send connection request</h6>
                              <small className="mb-1 d-block text-body">Peter sent you connection request</small>
                              <small className="text-body-secondary">4 days ago</small>
                            </div>
                            <div className="flex-shrink-0 dropdown-notifications-actions">
                              <a href="#" className="dropdown-notifications-read"
                                ><span className="badge badge-dot"></span
                              ></a>
                              <a href="#" className="dropdown-notifications-archive"
                                ><span className="icon-base ti tabler-x"></span
                              ></a>
                            </div>
                          </div>
                        </li>
                        <li className="list-group-item list-group-item-action dropdown-notifications-item">
                          <div className="d-flex">
                            <div className="flex-shrink-0 me-3">
                              <div className="avatar">
                                <img src="../../assets/img/avatars/6.png" alt className="rounded-circle" />
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 small">New message from Jane</h6>
                              <small className="mb-1 d-block text-body">Your have new message from Jane</small>
                              <small className="text-body-secondary">5 days ago</small>
                            </div>
                            <div className="flex-shrink-0 dropdown-notifications-actions">
                              <a href="#" className="dropdown-notifications-read"
                                ><span className="badge badge-dot"></span
                              ></a>
                              <a href="#" className="dropdown-notifications-archive"
                                ><span className="icon-base ti tabler-x"></span
                              ></a>
                            </div>
                          </div>
                        </li>
                        <li className="list-group-item list-group-item-action dropdown-notifications-item marked-as-read">
                          <div className="d-flex">
                            <div className="flex-shrink-0 me-3">
                              <div className="avatar">
                                <span className="avatar-initial rounded-circle bg-label-warning"
                                  ><i className="icon-base ti tabler-alert-triangle"></i
                                ></span>
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 small">CPU is running high</h6>
                              <small className="mb-1 d-block text-body"
                                >CPU Utilization Percent is currently at 88.63%,</small
                              >
                              <small className="text-body-secondary">5 days ago</small>
                            </div>
                            <div className="flex-shrink-0 dropdown-notifications-actions">
                              <a href="#" className="dropdown-notifications-read"
                                ><span className="badge badge-dot"></span
                              ></a>
                              <a href="#" className="dropdown-notifications-archive"
                                ><span className="icon-base ti tabler-x"></span
                              ></a>
                            </div>
                          </div>
                        </li>
                      </ul>
                    </li>
                    <li className="border-top">
                      <div className="d-grid p-4">
                        <a className="btn btn-primary btn-sm d-flex" href="#">
                          <small className="align-middle">View all notifications</small>
                        </a>
                      </div>
                    </li>
                  </ul>
                </li>
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
                            <h6 className="mb-0">John Doe</h6>
                            <small className="text-body-secondary">Admin</small>
                          </div>
                        </div>
                      </a>
                    </li>
                    <li>
                      <div className="dropdown-divider my-1 mx-n2"></div>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#">
                        <i className="icon-base ti tabler-user me-3 icon-md"></i
                        ><span className="align-middle">My Profile</span>
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#">
                        <i className="icon-base ti tabler-settings me-3 icon-md"></i
                        ><span className="align-middle">Settings</span>
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#">
                        <span className="d-flex align-items-center align-middle">
                          <i className="flex-shrink-0 icon-base ti tabler-file-dollar me-3 icon-md"></i
                          ><span className="flex-grow-1 align-middle">Billing</span>
                          <span className="flex-shrink-0 badge bg-danger d-flex align-items-center justify-content-center"
                            >4</span
                          >
                        </span>
                      </a>
                    </li>
                    <li>
                      <div className="dropdown-divider my-1 mx-n2"></div>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#">
                        <i className="icon-base ti tabler-currency-dollar me-3 icon-md"></i
                        ><span className="align-middle">Pricing</span>
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#">
                        <i className="icon-base ti tabler-question-mark me-3 icon-md"></i
                        ><span className="align-middle">FAQ</span>
                      </a>
                    </li>
                    <li>
                      <div className="d-grid px-2 pt-2 pb-1">
                        <a className="btn btn-sm btn-danger d-flex" href="#" target="_blank">
                          <small className="align-middle">Logout</small>
                          <i className="icon-base ti tabler-logout ms-2 icon-14px"></i>
                        </a>
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

          {/* Footer */}
          <footer className="content-footer footer bg-footer-theme">
            <div className="container-xxl">
              <div className="footer-container d-flex align-items-center justify-content-between py-4 flex-md-row flex-column">
                <div className="text-body">
                  © {new Date().getFullYear()}, made with ❤️ by
                  <a href="https://pixinvent.com" target="_blank" className="footer-link" rel="noreferrer">
                    Pixinvent
                  </a>
                </div>
                <div className="d-none d-lg-inline-block">
                  <a href="https://themeforest.net/licenses/standard" className="footer-link me-4" target="_blank" rel="noreferrer">
                    License
                  </a>
                  <a href="https://themeforest.net/user/pixinvent/portfolio" target="_blank" className="footer-link me-4" rel="noreferrer">
                    More Themes
                  </a>
                  <a href="https://demos.pixinvent.com/vuexy-html-admin-template/documentation/" target="_blank" className="footer-link me-4" rel="noreferrer">
                    Documentation
                  </a>
                  <a href="https://pixinvent.ticksy.com/" target="_blank" className="footer-link d-none d-sm-inline-block" rel="noreferrer">
                    Support
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Layout;
