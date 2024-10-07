import { Link, useLocation } from "react-router-dom";


const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">Voice Verification</div>
      <ul className="navbar-links">
        <li>
          <Link to="/" className={location.pathname === "/" ? "active" : ""}>
            <i className="pi pi-home"></i> Compare
          </Link>
        </li>
        <li>
          <Link
            to="/users"
            className={location.pathname === "/users" ? "active" : ""}
          >
            <i className="pi pi-users"></i> Users
          </Link>
        </li>
        <li>
          <Link
            to="/add-user"
            className={location.pathname === "/add-user" ? "active" : ""}
          >
            <i className="pi pi-user-plus"></i> Add User
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
