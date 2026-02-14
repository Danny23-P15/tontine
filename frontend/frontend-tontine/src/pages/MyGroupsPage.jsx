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
    <div className="groups-page">
      <h2 className="page-title">Mes groupes</h2>

      {groups.length === 0 ? (
        <p className="empty-msg">Vous n’appartenez à aucun groupe.</p>
      ) : (
        <div className="groups-list">
          {groups.map((group) => (
            <div key={group.id} className="group-card">
              <div className="group-info">
                <h3 className="group-name">{group.group_name}</h3>

                <p className="group-meta">
                  Rôle : <strong>{group.role}</strong>
                </p>

                <p className="group-meta">
                  Membres : {group.members_count}
                </p>

                <p
                  className={`group-status ${
                    group.is_active ? "active" : "pending"
                  }`}
                >
                  {group.is_active ? "Actif" : "En validation"}
                </p>
              </div>

              <button
                className="view-btn"
                onClick={() => navigate(`/group/${group.id}`)}
              >
                Voir
              </button>
            </div>
          ))}
          
        </div>
      )}
    </div>
  );
}

export default MesGroupesPage;
