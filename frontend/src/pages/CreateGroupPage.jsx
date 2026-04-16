import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyGroups, getInitiatedGroupCreations, cancelGroupCreation } from "../services/groups";
import "../css/groupCreation.css";

function CreateGroupPage() {
  const navigate = useNavigate();

  // États
  const [groupName, setGroupName] = useState("");
  const [quorum, setQuorum] = useState(1);
  const [users, setUsers] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isInitiator, setIsInitiator] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [initiatedCreations, setInitiatedCreations] = useState([]);
  const [loadingCreations, setLoadingCreations] = useState(true);
  const [cancellingCreation, setCancellingCreation] = useState(false);

  const token = localStorage.getItem("access");

  // Charger les rôles et les utilisateurs au montage
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Vérifier rôle initiateur
        const groupData = await getMyGroups();
        const groups = groupData.results || [];
        setIsInitiator(groups.some(group => group.role === "INITIATOR"));
        setLoadingRoles(false);

        // 2. Charger les créations de groupe initiées par l'utilisateur
        try {
          const creationData = await getInitiatedGroupCreations();
          setInitiatedCreations(creationData.results || []);
        } catch (err) {
          console.error("Erreur chargement créations initiées:", err);
        } finally {
          setLoadingCreations(false);
        }

        // 3. Charger les utilisateurs pour la recherche
        const userRes = await fetch("http://127.0.0.1:8000/api/users/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await userRes.json();
        setUsers(Array.isArray(userData) ? userData : userData.results || []);
      } catch (err) {
        console.error("Erreur de chargement:", err);
        setError("Erreur lors de la récupération des données");
      } finally {
        setLoadingUsers(false);
        setLoadingRoles(false);
      }
    };
    fetchData();
  }, [token]);

  // --- FONCTIONS DE LOGIQUE ---

  const handleCancelCreation = async () => {
    if (!initiatedCreations[0]) return;
    
    setCancellingCreation(true);
    try {
      await cancelGroupCreation(initiatedCreations[0].id);
      setInitiatedCreations([]);
    } catch (err) {
      console.error("Erreur annulation:", err);
      setError("Erreur lors de l'annulation de la demande");
    } finally {
      setCancellingCreation(false);
    }
  };

  const addValidator = (user) => {
    if (selectedValidators.find(v => v.phone_number === user.phone_number)) return;
    if (selectedValidators.length >= 5) {
      setError("Maximum 5 validateurs");
      return;
    }
    setSelectedValidators([...selectedValidators, user]);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const removeValidator = (phone) => {
    setSelectedValidators(selectedValidators.filter(v => v.phone_number !== phone));
  };

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(user => {
    const isAlreadySelected = selectedValidators.some(v => v.phone_number === user.phone_number);
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         user.phone_number.includes(searchQuery);
    return !isAlreadySelected && matchesSearch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (selectedValidators.length === 0) {
      setError("Veuillez sélectionner au moins un validateur");
      setLoading(false);
      return;
    }

    if (quorum > selectedValidators.length) { // Correction logique : quorum peut être égal au nombre de validateurs
      setError("Le quorum ne peut pas dépasser le nombre de validateurs");
      setLoading(false);
      return;
    }

    const requestData = {
      group_name: groupName,
      quorum: Number(quorum),
      validators: selectedValidators.map(v => ({
        phone_number: v.phone_number,
      })),
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/groups/create-request/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      const data = await res.json();
      if (!res.ok) {
        // Chercher le message d'erreur selon le format de réponse
        let errorMessage = "Erreur lors de la création";
        
        if (data.message) {
          errorMessage = data.message;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (typeof data === 'object') {
          // Si c'est une erreur de validation, prendre la première erreur
          const firstErrorKey = Object.keys(data)[0];
          if (firstErrorKey && Array.isArray(data[firstErrorKey])) {
            errorMessage = data[firstErrorKey][0];
          } else if (firstErrorKey && typeof data[firstErrorKey] === 'string') {
            errorMessage = data[firstErrorKey];
          }
        }
        
        throw new Error(errorMessage);
      }

      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-page-wrapper">
      <div className="group-page-container">
        <h2 className="group-page-title">Création de groupe</h2>

        {loadingRoles || loadingCreations ? (
          <div className="loading-msg">Chargement en cours...</div>
        ) : initiatedCreations.length > 0 ? (
          <div className="pending-creation-modal">
            <div className="pending-modal-content">
              <div className="pending-icon">⏳</div>
              <h3>Création de groupe en cours</h3>
              <p>Vous avez déjà une demande de création de groupe en attente de validation :</p>
              <div className="pending-group-info">
                <h4>{initiatedCreations[0].group_name}</h4>
                <p className="validators-info">{initiatedCreations[0].approved_count}/{initiatedCreations[0].total_validators} validateurs ont accepté</p>
                <p className="quorum-info">Quorum requis : {initiatedCreations[0].quorum}</p>
                <p className="status-info">Statut: <span className={`status-badge status-${initiatedCreations[0].status.toLowerCase()}`}>{initiatedCreations[0].status}</span></p>
              </div>
              <p className="info-text">Veuillez attendre que tous les validateurs répondent avant de créer un nouveau groupe.</p>
              <div className="pending-modal-buttons">
                <button className="modal-btn main-btn" onClick={() => navigate("/initiated-operations")}>
                  Voir le statut détaillé
                </button>
                <button 
                  className="modal-btn cancel-btn" 
                  onClick={handleCancelCreation}
                  disabled={cancellingCreation || initiatedCreations[0].status === "APPROVED"}
                >
                  {cancellingCreation ? "Annulation..." : "Annuler la demande"}
                </button>
              </div>
            </div>
          </div>
        ) : isInitiator ? (
          <div className="initiator-restriction">
            <div className="restriction-icon">⚠️</div>
            <h3>Vous êtes déjà initiateur</h3>
            <p>Vous ne pouvez initier qu'un seul groupe à la fois.</p>
            <button className="back-btn" onClick={() => navigate("/groups")}>
              Retour à mes groupes
            </button>
          </div>
        ) : (
          <>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleSubmit} className="group-form">
              <div className="form-section">
                <label className="form-label">Nom du groupe *</label>
                <input
                  className="form-input"
                  placeholder="Ex: Project"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div className="form-section">
                <label className="form-label">Quorum *</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max={selectedValidators.length || 1}
                  value={quorum}
                  onChange={(e) => setQuorum(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div className="validators-section">
                <h3 className="section-subtitle">
                  Validateurs <span className="highlight">({selectedValidators.length}/5)</span>
                </h3>
                
                <div className="selected-list">
                  {selectedValidators.length === 0 ? (
                    <p className="empty-msg">Aucun membre sélectionné.</p>
                  ) : (
                    selectedValidators.map((v) => (
                      <div key={v.phone_number} className="validator-card">
                        <div className="validator-info">
                          <div className="validator-name">{v.full_name}</div>
                          <div className="validator-details">Tél: {v.phone_number}</div>
                        </div>
                        <button type="button" className="remove-btn" onClick={() => removeValidator(v.phone_number)} title="Retirer">
                          &times;
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="add-validator-box">
                  <div className="search-container">
                    <input
                      type="text"
                      className="form-input search-input"
                      placeholder="Rechercher par nom ou téléphone..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      disabled={selectedValidators.length >= 5}
                    />
                    
                    {showDropdown && searchQuery && (
                      <div className="dropdown-list">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <button 
                              key={user.phone_number} 
                              type="button" 
                              className="dropdown-item" 
                              onClick={() => addValidator(user)}
                            >
                              <span className="dropdown-item-name">{user.full_name}</span>
                              <span className="dropdown-item-phone">{user.phone_number}</span>
                            </button>
                          ))
                        ) : (
                          <div className="dropdown-empty">Aucun utilisateur trouvé</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button type="submit" className="submit-group-btn" disabled={loading || selectedValidators.length === 0}>
                {loading ? "Chargement..." : "Confirmer"}
              </button>
            </form>
          </>
        )}

        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-icon">✅</div>
              <h3>Demande envoyée !</h3>
              <p>Le groupe <strong>{groupName}</strong> est en attente.</p>
              <button className="modal-btn" onClick={() => navigate("/notifications")}>Continuer</button>
            </div>
          </div>
        )}
      </div>
    <div className="rules-panel">
      <div className="rules-panel-header">
        <span className="rules-icon">📋</span>
        <h3>Règles de gestion</h3>
      </div>
      <ul className="rules-list">
        <li>Règle 1 — à définir</li>
        <li>Règle 2 — à définir</li>
        <li>Règle 3 — à définir</li>
      </ul>
    </div>
    </div>
  );
}

export default CreateGroupPage;
