import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useEffect, useState } from "react";
import { getInboxNotifications } from "../services/notifications";
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
  const [inboxCount, setInboxCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    let mounted = true;

    const loadCount = async () => {
      try {
        const data = await getInboxNotifications();
        if (!mounted) return;
        const count = (typeof data.count === "number") ? data.count : (Array.isArray(data.results) ? data.results.length : 0);
        setInboxCount(count);
      } catch (e) {
        console.error("Erreur chargement inbox count", e);
      }
    };

    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo-container">
          <div className="logo-icon-wrapper">
            <ShieldCheck size={20} color="#000" strokeWidth={3} />
          </div>
          <h2 className="logo-text"><img src="/src/assets/logo_yellowed.png" alt="Valideo"/></h2>
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
            {inboxCount > 0 && <span className="inbox-badge">|{inboxCount}|</span>}
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