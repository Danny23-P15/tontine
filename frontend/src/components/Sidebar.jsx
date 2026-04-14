import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useState, useEffect } from "react";
import logo from '../assets/logovalideo.png';
// import '../css/Sidebar.css';

// Importation des icônes
import { 
  Users, 
  PlusCircle, 
  FileText, 
  LogOut, 
  ShieldCheck,
  DollarSign,
  Settings
} from "lucide-react";
import axios from "axios";
import "../css/Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [groupId, setGroupId] = useState(null);

  useEffect(() => {
    // Récupérer le premier groupe de l'utilisateur
    axios.get("/api/groups/my-groups/")
      .then(response => {
        if (response.data && response.data.length > 0) {
          setGroupId(response.data[0].id);
        }
      })
      .catch(err => {
        console.error("Erreur lors de la récupération des groupes", err);
      });
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo">
            {/* <ShieldCheck size={20} color="#000" strokeWidth={3} /> */}
            <img src={logo} alt="Valid'eo" className="app-logo" style={{width: "120px", height: "60px"}}/>
        </div>

        <nav className="nav">
          <p className="nav-section-title">Mes Groupes</p>
          <NavLink to="/groups" className="nav-link">
            <Users size={18} className="icon" /> 
            <span className="link-text">Mes groupes</span>
          </NavLink>
          <NavLink to="/groups/create" className="nav-link">
            <PlusCircle size={18} className="icon" /> 
            <span className="link-text">Création de groupe</span>
          </NavLink>

          <p className="nav-section-title">Historique</p>
          <NavLink to="/operations/initiated" className="nav-link">
            <FileText size={18} className="icon" /> 
            <span className="link-text">Mes demandes initiées</span>
          </NavLink>
          <NavLink to="/transactions" className="nav-link">
            <DollarSign size={18} className="icon" /> 
            <span className="link-text">Transactions</span>
          </NavLink>

          {/* {user && user.is_superadmin && ( */}
            <>
              <p className="nav-section-title">Administration</p>
              <NavLink to="/admin/operations" className="nav-link">
                <Settings size={18} className="icon" /> 
                <span className="link-text">Opérations</span>
              </NavLink>
            </>
          {/* )} */}

        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} className="icon" />
          <span className="link-text">Déconnexion</span>
        </button>
      </div>

      {/* <div className="sidebar-bottom">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} className="icon" />
          <span className="link-text">Déconnexion</span>
        </button>
      </div> */}
    </aside>
  );
}

export default Sidebar;