import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../css/Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth(); // ✅ correct

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <h2 className="logo">Validex</h2>

      <nav className="nav">
        <NavLink to="/notifications" className="nav-link">
          Notifications
        </NavLink>
        <NavLink to="/groups" className="nav-link">
          Mes groupes
        </NavLink>

        <NavLink to="/groups/create" className="nav-link">
          Créer un groupe
        </NavLink>
        <NavLink to="/notifications" className="nav-link">
          À valider
        </NavLink>

        <NavLink to="/notifications/inbox" className="nav-link">
          Historique
        </NavLink>

      </nav>

      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
