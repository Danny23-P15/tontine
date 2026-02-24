import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from '../assets/logovalideo.png';
// import '../css/Sidebar.css';

// Importation des icônes
import { 
  Hourglass, 
  Users, 
  PlusCircle, 
  FileText, 
  Bell, 
  LogOut, 
  ShieldCheck 
} from "lucide-react";
import "../css/Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo">
            {/* <ShieldCheck size={20} color="#000" strokeWidth={3} /> */}
                <img src={logo} alt="Logo"  style={{width: "180px", height: "126px"}}/>
        </div>

        {/* <div className="user-header">
          <span className="user-label">Connecté :</span>
          <div className="user-number">{user?.phone_number || localStorage.getItem("phone_number") || "—"}</div>
        </div> */}

        <nav className="nav">
          <p className="nav-section-title">Validation</p>
          <NavLink to="/notifications" className="nav-link">
            <Hourglass size={18} className="icon" /> 
            <span className="link-text">Demandes en attente</span>
          </NavLink>

          <p className="nav-section-title">Mes Groupes</p>
          <NavLink to="/groups" className="nav-link">
            <Users size={18} className="icon" /> 
            <span className="link-text">Mes groupes</span>
          </NavLink>
          <NavLink to="/groups/create" className="nav-link">
            <PlusCircle size={18} className="icon" /> 
            <span className="link-text">Créer un groupe</span>
          </NavLink>

          <p className="nav-section-title">Historique</p>
          <NavLink to="/operations/initiated" className="nav-link">
            <FileText size={18} className="icon" /> 
            <span className="link-text">Mes demandes initiées</span>
          </NavLink>
          <NavLink to="/notifications/inbox" className="nav-link">
            <Bell size={18} className="icon" /> 
            <span className="link-text">Notifications</span>
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} className="icon" />
          <span className="link-text">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;