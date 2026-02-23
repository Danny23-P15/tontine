import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyGroups } from "../services/groups";
import "../css/MesGroupesPage.css";

function MesGroupesPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await getMyGroups();
        setGroups(data.results || []);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger vos groupes");
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []); 

  if (loading) {
    return <div className="page-msg">Chargement des groupes...</div>;
  }

  if (error) {
    return <div className="page-msg error">{error}</div>;
  }

  return (
  <div className="groups-container">
    <header className="groups-header">
      <div className="header-text">
        <h2 className="page-title">Mes Cercles de Gestion</h2>
        <p className="sub-title">Visualisez et gérez vos groupes de validation collective</p>
      </div>
      <button className="btn-create-shortcut" onClick={() => navigate('/groups/create')}>
        + Nouveau Groupe
      </button>
    </header>

    {groups.length === 0 ? (
      <div className="empty-state-container">
        <div className="empty-icon">📂</div>
        <p className="empty-msg">Vous n’appartenez à aucun groupe pour le moment.</p>
        <button className="btn-primary-gold" onClick={() => navigate('/groups/create')}>
          Créer mon premier groupe
        </button>
      </div>
    ) : (
      <div className="groups-grid">
        {groups.map((group) => (
          <div 
            key={group.id} 
            className={`group-card-premium ${group.role === 'INITIATOR' ? 'is-owner' : ''}`}
            onClick={() => navigate(`/group/${group.id}`)}
          >
            <div className="card-accent-line"></div>
            
            <div className="card-main-content">
              <div className="card-top-info">
                <h3 className="group-name">{group.group_name}</h3>
                <span className={`status-pill-small ${group.is_active ? "active" : "pending"}`}>
                  {group.is_active ? "Actif" : "En attente"}
                </span>
              </div>

              <div className="card-middle-info">
                <div className="info-item">
                  <span className="info-label">Rôle</span>
                  <span className={`role-badge ${group.role.toLowerCase()}`}>
                    {group.role === 'INITIATOR' ? '👑 Initiateur' : '🛡️ Validateur'}
                  </span>
                </div>
                {/* <div className="info-item">
                  <span className="info-label">Membres</span>
                  <span className="info-value">{group.members_count} / 5</span>
                </div> */}
              </div>

              <div className="card-footer">
                <span className="view-link">Accéder au tableau de bord →</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
}

export default MesGroupesPage;
