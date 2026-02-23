import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useEffect, useState } from "react";
import { getMyGroups } from "../services/groups";
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
  const [isInitiator, setIsInitiator] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Vérifier si l'utilisateur est déjà initiateur
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const data = await getMyGroups();
        const groups = data.results || [];
        const hasInitiatorRole = groups.some(group => group.role === "INITIATOR");
        setIsInitiator(hasInitiatorRole);
      } catch (err) {
        console.error("Erreur lors de la vérification du rôle:", err);
      } finally {
        setLoadingRoles(false);
      }
    };

    checkUserRole();
  }, []);

  const handleCreateGroupClick = (e) => {
    if (isInitiator) {
      e.preventDefault();
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo-container">
          <div className="logo-icon-wrapper">
            <ShieldCheck size={20} color="#000" strokeWidth={3} />
          </div>
          <h2 className="logo-text">Valideo</h2>
        </div>

        <div className="user-header">
          <span className="user-label">Connecté :</span>
          <div className="user-number">{user?.phone_number || localStorage.getItem("phone_number") || "—"}</div>
        </div>

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
          <NavLink 
            to="/groups/create" 
            className={`nav-link ${isInitiator ? 'nav-link-disabled' : ''}`}
            onClick={handleCreateGroupClick}
            title={isInitiator ? "Vous êtes déjà initiateur d'un groupe" : ""}
          >
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