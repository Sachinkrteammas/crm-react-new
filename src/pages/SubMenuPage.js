import { useLocation, useParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const SubMenuPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const children = location.state?.children || [];
  const parentName = location.state?.parentName;

  const navigate = useNavigate();

  return (
    // <div className="container px-0">
      <div className="card p-4 mb-4 shadow-sm">

        {/* Title */}
        <h5 className="mb-4 text-primary">{parentName}</h5>

        {/* If no menu */}
        {children.length === 0 ? (
          <p className="text-muted">No sub pages available.</p>
        ) : (
          <div className="row">
            {children.map((child) => (
              <div key={child.id} className="col-md-4 mb-3">

                <label
                  className="d-flex align-items-center gap-2"
                  style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  <input type="radio" name="submenu" onClick={() => navigate(child.page_url ? `/${child.page_url}` : "#", {
                    state: {
                      parentName: parentName,
                      childName: child.page_name   // optional (very useful 🔥)
                    }
                  })}/>
                  <Link
                    to={child.page_url ? `/${child.page_url}` : "#"}
                    state={{
                      parentName: parentName,
                      childName: child.page_name
                    }}
                    className="text-decoration-none text-dark fw-semibold"
                  >
                    {child.page_name}
                  </Link>
                </label>

              </div>
            ))}
          </div>
        )}

      </div>
    // </div>
  );
};

export default SubMenuPage;
