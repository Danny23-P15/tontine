import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGroupDetail, requestRemoveValidator, requestDeleteGroup } from "../services/groups";
import "../css/GroupDetailPage.css";
import axios from "axios";
import api from "../services/api";

function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showValidator, setShowValidator] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const getToken = () => {
    return localStorage.getItem("access_token")
  };

  useEffect(() => {
    const loadGroup = async () => {
      try {
        const data = await getGroupDetail(groupId);
        setGroup(data);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger le groupe");
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [groupId]);

  // 👇 Charger tous les utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      const token = getToken();
      
      if (!token) {
        console.error("Token non trouvé");
        setError("Session expirée, veuillez vous reconnecter");
        setLoadingUsers(false);
        return;
      }

      setLoadingUsers(true);
      try {
        const response = await fetch("http://127.0.0.1:8000/api/users/", {
          headers: {
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Non autorisé - Token invalide ou expiré");
          }
          throw new Error("Erreur de chargement des utilisateurs");
        }
        
        const data = await response.json();
        // S'assurer que data est un tableau
        const usersList = Array.isArray(data) ? data : data.results || [];
        console.log("Structure du premier utilisateur:", usersList[0]);
        console.log("Tous les utilisateurs:", usersList);

        setAllUsers(usersList);
      } catch (err) {
        console.error("Erreur détaillée:", err);
        setError(err.message || "Impossible de charger les utilisateurs");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []); // Pas de dépendances car getToken est appelé à l'intérieur

const handleAddValidator = async () => {
  try {
    const token = getToken();
    
    const selectedUserData = allUsers.find(
      u => {
        return u.phone_number === selectedUser || 
               u.phone === selectedUser || 
               u.telephone === selectedUser ||
               u.id?.toString() === selectedUser;
      }
    );

    if (!selectedUserData) {
      console.error("Utilisateur non trouvé:", selectedUser);
      alert("Utilisateur non trouvé");
      return;
    }

    // Récupérer le numéro de téléphone
    const validatorPhone = selectedUserData.phone_number || 
                          selectedUserData.phone || 
                          selectedUserData.telephone;

    if (!validatorPhone) {
      alert("Cet utilisateur n'a pas de numéro de téléphone");
      return;
    }

    // 👇 CORRECTION ICI - Utiliser validator_phone_number au lieu de validator_phone
    const payload = {
      validator_phone_number: validatorPhone,  // Changé ici !
      validator_cin: selectedUserData.cin || "" // Optionnel
    };

    console.log("Payload envoyé:", payload);

    const response = await axios.post(
      `http://127.0.0.1:8000/api/groups/${group.id}/validator/add/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    alert("Demande envoyée avec succès");
    setShowValidator(false);
    setSelectedUser("");
    
    const updatedGroup = await getGroupDetail(groupId);
    setGroup(updatedGroup);
    
  } catch (error) {
    console.error("Erreur complète:", error);
    console.error("Response:", error.response?.data);
    
    // Afficher l'erreur du backend
    if (error.response?.data) {
      alert("Erreur: " + JSON.stringify(error.response.data));
    } else {
      alert("Erreur lors de l'envoi");
    }
  }
};

const handleRemoveValidator = async (phone) => {
  if (!window.confirm("Confirmer la demande de suppression ?")) return;

  try {
    const response = await requestRemoveValidator(group.id, phone);
    alert("✅ Demande envoyée avec succès");
  } catch (e) {
    console.error(e);
    alert("❌ Erreur lors de la demande");
  }
};

const handleDeleteGroupRequest = async () => {
  if (!window.confirm("Voulez-vous vraiment lancer la demande de suppression ?")) return;

  try {
    const resp = await requestDeleteGroup(group.id);
    alert(resp.message || "Demande de suppression envoyée.");

    const updatedGroup = await getGroupDetail(groupId);
    setGroup(updatedGroup);
  } catch (error) {
    console.error("Erreur deletion group", error);
    const msg =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      "Erreur lors de la suppression";
    alert(msg);
  }
};

  if (loading) {
    return <div className="page-msg">Chargement du groupe...</div>;
  }

  if (error) {
    return <div className="page-msg error">{error}</div>;
  }

return (
  <div className="group-detail-container">
    <header className="group-detail-header">
      <div>
        <h2 className="group-name">{group.group_name}</h2>
        <p className="creation-date">Créé le {group.created_at ? new Date(group.created_at).toLocaleDateString("fr-FR") : "N/A"}</p>
      </div>
      <div className={`status-pill ${group.is_active ? "active" : "pending"}`}>
        {group.is_active ? "🟢 Groupe Actif" : "🟡 En cours de validation"}
      </div>
    </header>

    <div className="group-content-grid">
      {/* Colonne de gauche : Infos clés */}
      <aside className="group-stats">
        <div className="stat-card">
          <span className="stat-label">Seuil de validation (Quorum)</span>
          <span className="stat-value">{group.quorum}</span>
        </div>
        <div className="stat-card gold-border">
          <span className="stat-label">Votre Rôle</span>
          <span className="stat-value highlight">{group.me?.role}</span>
        </div>
        
        {group.me?.role === "INITIATOR" && !group.pending_deletion && !group.has_pending_operations && (
           <button className="delete-group-link" onClick={handleDeleteGroupRequest}>
             Supprimer le groupe définitivement
           </button>
        )}
        {group.me?.role === "INITIATOR" && group.pending_deletion && (
           <div className="delete-group-pending">
             ⚠️ Demande de suppression en cours
           </div>
        )}
        {group.me?.role === "INITIATOR" && group.has_pending_operations && !group.pending_deletion && (
           <div className="delete-group-pending">
             ⚠️ Opérations en attente - Suppression impossible
           </div>
        )}
      </aside>

      {/* Colonne de droite : Liste des membres */}
      <main className="members-section">
        <div className="section-header">
          <h3>Membres du groupe <span className="member-count">({group.members.length})</span></h3>
          {group.me?.role === "INITIATOR" && group.members?.filter(m => m.role === "VALIDATOR").length < 5 && (
            <button className="btn-add-mini" onClick={() => setShowValidator(true)}>+ Ajouter</button>
          )}
        </div>

        <div className="members-stack">
          {group.members.map((member) => (
            <div key={member.phone_number} className="member-item">
              <div className="member-avatar-mini">{member.full_name?.charAt(0)?.toUpperCase()}</div>
              <div className="member-body">
                <span className="member-fullname">{member.full_name}</span>
                {member.username && <span className="member-username">@{member.username}</span>}
                <span className="member-sub">{member.phone_number}</span>
              </div>
              <div className="member-tag-wrapper">
                <span className={`role-tag ${member.role.toLowerCase()}`}>{member.role}</span>
                {member.role === "VALIDATOR" && group.me?.role === "INITIATOR" && (
                  <button className="btn-remove-member" onClick={() => handleRemoveValidator(member.phone_number)}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal / Overlay d'ajout de validateur */}
        {showValidator && (
          <div className="validator-overlay">
            <div className="validator-modal">
              <h4>Ajouter un Validateur</h4>
              <p>Sélectionnez un membre pour rejoindre votre cercle.</p>
              
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                <option value="">-- Choisir un utilisateur --</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.phone_number || user.id}>
                    {user.full_name || "Sans nom"} {user.username ? `(@${user.username})` : ""} - {user.phone_number}
                  </option>
                ))}
              </select>

              <div className="modal-actions">
                <button className="btn-confirm" onClick={handleAddValidator} disabled={!selectedUser}>Inviter</button>
                <button className="btn-cancel" onClick={() => setShowValidator(false)}>Fermer</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  </div>
);
}

export default GroupDetailPage;

//Membres du groupe 