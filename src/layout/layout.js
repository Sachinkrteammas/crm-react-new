//.. Show Dynamic menu according Client company_id..///
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";

const Layout = () => {
  const [username, setUsername] = useState("");
  const storedCompanyId = localStorage.getItem("company_id");
  const userType = localStorage.getItem("user_type");
  const companyId =
    userType === "Super-Admin" || userType === "Admin" ? 0 : storedCompanyId;
  const [menuData, setMenuData] = useState([]);
  const storedUsername = localStorage.getItem("username");
  const storedUserType = localStorage.getItem("user_type");
  const [selectedParent, setSelectedParent] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  const navigate = useNavigate();

  const user = {
    name: storedUsername || "John Doe",
    userType: storedUserType || "Client",
  };

  // useEffect(() => {
  //     const fetchMenu = async () => {
  //       try {
  //         const res = await api.get(`/dynamic_menu/pages/dynamic-menu/${companyId}`);
  //         setMenuData(Array.isArray(res.data) ? res.data : []);
  //       } catch (err) {
  //         console.error("Failed to fetch menu:", err);
  //       }
  //     };

  //     if (companyId) fetchMenu();
  //   }, [companyId]);

  // 🔹 Recursive counter
  const countPages = (items) => {
    let count = 0;
    for (const item of items) {
      count += 1; // count this menu
      if (item.children && item.children.length > 0) {
        count += countPages(item.children);
      }
    }
    return count;
  };


useEffect(() => {
  const fetchMenu = async () => {
    try {
      // ✅ Wait until userData exists (max wait = 2s)
      let userData = null;
      for (let i = 0; i < 10; i++) {
        userData = JSON.parse(localStorage.getItem("userData"));
        if (userData) break;
        await new Promise(res => setTimeout(res, 200)); // wait 200ms
      }

      console.log("🟡 Loaded userData:", userData);

      if (!userData) {
        console.warn("⚠️ No user data found, skipping menu fetch.");
        return;
      }

      const { auth_person, user_type, company_id: companyId } = userData;
      console.log("🔹 user_type:", user_type, "companyId:", companyId, "auth_person:", auth_person);

      let url = "";
      if (user_type === "Super-Admin" || user_type === "Admin") {
        url = `/dynamic_menu/pages/dynamic-menu/0`;
      } else if (user_type === "Client" && companyId && auth_person) {
        url = `/dynamic_menu/pages/dynamic-menu/${companyId}?name=${encodeURIComponent(auth_person)}`;
      } else {
        console.warn("⚠️ Skipping menu fetch - insufficient data");
        return;
      }

      console.log("📡 Fetching URL:", url);
      const res = await api.get(url);
      console.log("✅ Menu response:", res.data);
      setMenuData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("❌ Failed to fetch menu:", err);
    }
  };

  fetchMenu();
}, []);




  
  // useEffect(() => {
  //   const fetchMenu = async () => {
  //     try {
  //       const res = await api.get(
  //         `/dynamic_menu/pages/dynamic-menu/${companyId}`
  //       );
  //       setMenuData(Array.isArray(res.data) ? res.data : []);
  //     } catch (err) {
  //       console.error("Failed to fetch menu:", err);
  //     }
  //   };

  //   if (companyId !== null && companyId !== undefined) {
  //     fetchMenu();
  //   }
  // }, [companyId]);

  const renderMenu = (items, level = 1) => {
    if (!Array.isArray(items)) return null;

    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isOpen = openMenus[item.id] || false;
      // Check if this menu or any of its children matches the current path
      const isActive =
        location.pathname === `/${item.page_url}` ||
        (hasChildren &&
          item.children.some(
            (child) => location.pathname === `/${child.page_url}`
          ));

      // If level 1 and active, set as selectedParent
      if (level === 1 && isActive && selectedParent?.id !== item.id) {
        setSelectedParent(item);
      }

      return (
        <li key={item.id} className={`menu-item ${hasChildren ? (isOpen ? "open" : "") : ""} ${
            isActive ? "active" : ""
          }`}>
          {hasChildren ? (
            <>
              <a
                href="#"
                className="menu-link menu-toggle"
                onClick={(e) => {
                  e.preventDefault();
                  toggleMenu(item.id);

                  // Only top-level updates selectedParent
                  if (level === 1) {
                    setSelectedParent(item);
                  }
                  else if (level === 2 && item.children.length > 0) {
                    // Navigate to SubMenuPage if this child has children
                    navigate(`/submenu/${item.id}`, { state: { children: item.children, parentName: item.page_name } });
                  }
                }}
              >
                <i className="menu-icon icon-base ti tabler-folder"></i>
                <div>{item.page_name}</div>
              </a>

              {level < 2 && (
                <ul className="menu-sub" style={{ display: isOpen ? "block" : "none" }}>
                  {renderMenu(item.children, level + 1)}
                </ul>
              )}
            </>
          ) : (
            <Link
              to={`/${item.page_url || ""}`}
              className={`menu-link ${isActive ? "primary" : ""}`}
              onClick={(e) => {
                handleMenuLinkClick();   // keeps mobile sidebar behavior
                setActiveMenu(item.id);  // marks this child as active
              }}
            >
              <div>{item.page_name}</div>
            </Link>
          )}
        </li>
      );
    });
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const [openMenus, setOpenMenus] = useState({});

  // const toggleMenu = (menu) => {
  //     setOpenMenus((prev) => {
  //         const updatedMenus = Object.keys(prev).reduce((acc, key) => {
  //             acc[key] = key === menu ? !prev[key] : false;
  //             return acc;
  //         }, {});
  //         return updatedMenus;
  //     });
  // };

  const toggleMenu = (id) => {
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const isActiveMenu = (paths) => {
    return paths.some(
      (path) =>
        location.pathname === path
        // location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  useEffect(() => {
    const sidebar = document.getElementById("layout-menu");

    if (window.innerWidth >= 1200) {
      // Desktop behavior
      if (isSidebarOpen || isSidebarHovered) {
        document.body.classList.remove("layout-menu-collapsed");
      } else {
        document.body.classList.add("layout-menu-collapsed");
      }
      sidebar.classList.remove("show"); // Ensure mobile show class is removed
    } else {
      // Mobile behavior
      if (isSidebarOpen) {
        sidebar.classList.add("show");
      } else {
        sidebar.classList.remove("show");
      }
    }
  }, [isSidebarOpen, isSidebarHovered]);

  const handleThemeChange = (theme) => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("theme", theme);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-bs-theme", savedTheme);
  }, []);

  const handleMenuLinkClick = () => {
    if (window.innerWidth < 1200) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        {/* Sidebar */}
        <aside
          id="layout-menu"
          className="layout-menu menu-vertical menu"
          onMouseEnter={() => {
            if (!isSidebarOpen) {
              setIsSidebarHovered(true);
            }
          }}
          onMouseLeave={() => {
            if (!isSidebarOpen) {
              setIsSidebarHovered(false);
            }
          }}
        >
          {/* <div className="app-brand demo">
            <Link to="/dashboard" className="app-brand-link">
              <span className="app-brand-logo demo">
                <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0 0V6.85C0 6.85 -0.13 9.01 1.98 10.84L13.69 22L19.78 21.92L18.8 9.88L16.49 7.17L9.23 0H0Z"
                    fill="currentColor"
                  />
                  <path
                    opacity="0.06"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.7 16.43L12.52 3.23L16.55 7.25L7.7 16.43Z"
                    fill="#161616"
                  />
                  <path
                    opacity="0.06"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.07 15.91L13.94 4.63L16.58 7.28L8.07 15.91Z"
                    fill="#161616"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.77 16.35L23.65 0H32V6.88C32 6.88 31.82 9.17 30.65 10.40L19.78 22H13.69L7.77 16.35Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="app-brand-text demo menu-text fw-bold ms-3">
                DialDesk
              </span>
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
          </div> */}


          <div className="app-brand demo">
            <Link to="/dashboard" className="app-brand-link">
              {/* <img
                src="/assets/img/branding/logo.DialDesk.png"   // <-- replace with your actual filename in public folder
                alt="Company Logo"
                style={{ height: "40px", width: "auto" }} // adjust as needed
              /> */}

                <img
                src={
                  isSidebarOpen
                    ? "/assets/img/branding/logo.DialDesk.png"   // full logo (expanded)
                    : "/assets/img/favicon/favicon.ico"       // small icon (collapsed)
                }
                alt="Company Logo"
                style={{
                  height: isSidebarOpen ? "40px" : "36px",
                  width: "auto",
                  // transition: "all 0.3s ease",
                }}
              />                        

            </Link>

            <a
              href="#"
              className="layout-menu-toggle menu-link text-large ms-auto"
              onClick={(e) => {
                e.preventDefault();
                setIsSidebarOpen((prev) => !prev);
                if (isSidebarHovered) setIsSidebarHovered(false);
              }}
            >
              <i className="icon-base ti menu-toggle-icon d-none d-xl-block"></i>
              <i className="icon-base ti tabler-x d-block d-xl-none"></i>
            </a>
          </div>


          <div className="menu-inner-shadow"></div>

          <ul className="menu-inner py-1 overflow-y-auto">
            {/* Dashboard */}
            <li
              className={`menu-item ${
                location.pathname === "/dashboard" || location.pathname === "/outbound_dashboard" ? "active" : ""
              }`}
            >
              <Link
                to="/dashboard"
                className="menu-link"
                onClick={handleMenuLinkClick}
              >
                <i className="menu-icon icon-base ti tabler-dashboard"></i>
                <div>Dashboard</div>
              </Link>
            </li>

            {renderMenu(menuData)}
          </ul>
        </aside>

        <div className="menu-mobile-toggler d-xl-none rounded-1">
          <a
            href="#"
            className="layout-menu-toggle menu-link text-large text-bg-secondary p-2 rounded-1"
          >
            <i className="ti tabler-menu icon-base"></i>
            <i className="ti tabler-chevron-right icon-base"></i>
          </a>
        </div>

        {/* Main Content */}
        <div className="layout-page">
          {/* Header */}
          <nav
            className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme"
            id="layout-navbar"
          >
            <div className="layout-menu-toggle navbar-nav align-items-xl-center me-3 me-xl-0 d-xl-none">
              <a
                href="#"
                className="nav-item nav-link px-0 me-xl-6"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSidebar();
                  if (isSidebarHovered) {
                    setIsSidebarHovered(false);
                  }
                }}
              >
                <i className="icon-base ti tabler-menu-2 icon-md"></i>
              </a>
            </div>

            <div
              className="navbar-nav-right d-flex align-items-center justify-content-end"
              id="navbar-collapse"
            >
              {/* Search */}
              <div className="navbar-nav align-items-center">
                <div className="nav-item navbar-search-wrapper px-md-0 px-2 mb-0">
                  <a
                    className="nav-item nav-link search-toggler d-flex align-items-center px-0"
                    href="#"
                  >
                    <span
                      className="d-inline-block text-body-secondary fw-normal"
                      id="autocomplete"
                    ></span>
                  </a>
                </div>
              </div>

              {/* /Search */}

              <ul className="navbar-nav flex-row align-items-center ms-md-auto">
                {/*/ Language */}

                {/* Style Switcher */}
                <li className="nav-item dropdown">
                  <a
                    className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
                    id="nav-theme"
                    href="#"
                    data-bs-toggle="dropdown"
                  >
                    <i className="icon-base ti tabler-sun icon-22px theme-icon-active text-heading"></i>
                    <span className="d-none ms-2" id="nav-theme-text">
                      Toggle theme
                    </span>
                  </a>
                  <ul
                    className="dropdown-menu dropdown-menu-end"
                    aria-labelledby="nav-theme-text"
                  >
                    <li>
                      <button
                        type="button"
                        className="dropdown-item align-items-center active"
                        data-bs-theme-value="light"
                        aria-pressed="false"
                        onClick={() => handleThemeChange("light")}
                      >
                        <span>
                          <i
                            className="icon-base ti tabler-sun icon-22px me-3"
                            data-icon="sun"
                          ></i>
                          Light
                        </span>
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item align-items-center"
                        data-bs-theme-value="dark"
                        aria-pressed="true"
                        onClick={() => handleThemeChange("dark")}
                      >
                        <span>
                          <i
                            className="icon-base ti tabler-moon-stars icon-22px me-3"
                            data-icon="moon-stars"
                          ></i>
                          Dark
                        </span>
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item align-items-center"
                        data-bs-theme-value="system"
                        aria-pressed="false"
                        onClick={() => handleThemeChange("auto")}
                      >
                        <span>
                          <i
                            className="icon-base ti tabler-device-desktop-analytics icon-22px me-3"
                            data-icon="device-desktop-analytics"
                          ></i>
                          System
                        </span>
                      </button>
                    </li>
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
                    data-bs-toggle="dropdown"
                  >
                    <div className="avatar avatar-online">
                      <img
                        src={
                          user.userType === "Super-Admin"
                            ? "/assets/img/avatars/1.png"
                            : user.userType === "Admin"
                            ? "/assets/img/avatars/1.png"
                            : "/assets/img/avatars/1.png"
                        }
                        alt={user.userType}
                        className="rounded-circle"
                      />
                    </div>
                  </a>

                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <a className="dropdown-item mt-0">
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0 me-2">
                            <div className="avatar avatar-online">
                              <img
                                src={
                                  user.userType === "Super-Admin"
                                    ? "/assets/img/avatars/1.png"
                                    : user.userType === "Admin"
                                    ? "/assets/img/avatars/1.png"
                                    : "/assets/img/avatars/1.png"
                                }
                                alt={user.userType}
                                className="rounded-circle"
                              />
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-0">{user.name}</h6>
                            <small className="text-body-secondary">
                              {user.userType}
                            </small>
                          </div>
                        </div>
                      </a>
                    </li>
                    <li>
                      <div className="dropdown-divider my-1 mx-n2"></div>
                    </li>
                    <li>
                      <div className="d-grid px-2 pt-2 pb-1">
                        <Link
                          to="/logout"
                          className="btn btn-sm btn-danger d-flex"
                        >
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

          <div className="content-wrapper">
            <div className="container-xxl flex-grow-1 container-p-y">                              
              <Outlet /> {/* Routes will render here */}
            </div>
            <div className="content-backdrop fade"></div>
          </div>
        </div>
      </div>
      <div className="layout-overlay layout-menu-toggle"></div>
      <div className="drag-target"></div>
    </div>
  );
};

export default Layout;
