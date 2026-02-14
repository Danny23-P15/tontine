import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGroupDetail } from "../services/groups";
import "../css/GroupDetailPage.css";
import axios from "axios";

function GroupDetailPage() {
  const { groupId } = useParams();
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

  if (loading) {
    return <div className="page-msg">Chargement du groupe...</div>;
  }

  if (error) {
    return <div className="page-msg error">{error}</div>;
  }

  return (
    <div className="group-detail-page">
      <h2 className="page-title">{group.group_name}</h2>

      <div className="group-summary">
        <p>
          <strong>Statut :</strong>{" "}
          <span className={group.is_active ? "active" : "pending"}>
            {group.is_active ? "Actif" : "En validation"}
          </span>
        </p>

        <p>
          <strong>Quorum :</strong> {group.quorum}
        </p>

        <p>
          <strong>Mon rôle :</strong>{" "}
          <span className="my-role">{group.me?.role}</span>
        </p>
      </div>

      <h3 className="section-title">Membres du groupe</h3>

      <div className="members-list">
        {group.members.map((member) => (
          <div key={member.phone_number} className="member-card">
            <div className="member-info">
              <div className="member-name">{member.full_name}</div>
              <div className="member-meta">
                {member.phone_number} | {member.cin}
              </div>
            </div>

            <div className={`member-role ${member.role.toLowerCase()}`}>
              {member.role}
            </div>
          </div>
        ))}
      </div>

      {/* 🔒 Actions pour l'initiateur */}
      {group.me?.role === "INITIATOR" && (
        <div className="initiator-actions">
          <button 
            className="action-btn"
            onClick={() => {
              setShowValidator(true);
              // Recharger les utilisateurs au moment d'ouvrir le select
              if (allUsers.length === 0) {
                fetchUsers();
              }
            }}
          >
            + Ajouter un validateur        
          </button>
          
          {showValidator && (
            <div className="add-validator-box">
              <h4>Choisir un validateur</h4>
              
              {loadingUsers ? (
                <p>Chargement des utilisateurs...</p>
              ) : error && !allUsers.length ? (
                <p className="error-message">{error}</p>
              ) : (
                <>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">-- Sélectionner un utilisateur --</option>

                  {allUsers
                    .filter(user => {
                      const userIdentifier = user.phone_number || user.phone || user.id;
                      const isAlreadyMember = group.members.some(
                        m => m.phone_number === userIdentifier || m.id === user.id
                      );
                      const isSelf = userIdentifier === group.me?.phone_number || 
                                    user.id === group.me?.id;
                      return !isAlreadyMember && !isSelf;
                    })
                    .map(user => {
                      // Utiliser l'ID comme valeur si le phone_number est vide
                      const userValue = user.phone_number || user.phone || user.id;
                      const userDisplay = user.full_name || user.username || user.email;
                      const userPhone = user.phone_number || user.phone || user.telephone || 'pas de téléphone';
                      
                      return (
                        <option key={user.id || userValue} value={userValue}>
                          {userDisplay} ({userPhone})
                        </option>
                      );
                    })}
                </select>

                  {allUsers.filter(user => {
                    const isAlreadyMember = group.members.some(
                      m => m.phone_number === user.phone_number
                    );
                    const isSelf = user.phone_number === group.me?.phone_number;
                    return !isAlreadyMember && !isSelf;
                  }).length === 0 && (
                    <p className="info-message">
                      Aucun utilisateur disponible à ajouter
                    </p>
                  )}

                  <div className="validator-actions">
                    <button 
                      onClick={handleAddValidator}
                      disabled={!selectedUser}
                    >
                      Envoyer la demande
                    </button>

                    <button 
                      className="cancel-btn"
                      onClick={() => {
                        setShowValidator(false);
                        setSelectedUser("");
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GroupDetailPage;

//axios