import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyGroups } from "../services/groups";
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

  const token = localStorage.getItem("access_token");

  // Charger les rôles et les utilisateurs au montage
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Vérifier rôle initiateur
        const groupData = await getMyGroups();
        const groups = groupData.results || [];
        setIsInitiator(groups.some(group => group.role === "INITIATOR"));
        setLoadingRoles(false);

        // 2. Charger les utilisateurs pour la recherche
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
        cin: v.cin,
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
      if (!res.ok) throw new Error(data.detail || "Erreur lors de la création");

      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-page-container">
      <h2 className="group-page-title">Créer un groupe</h2>

      {loadingRoles ? (
        <div className="loading-msg">Chargement en cours...</div>
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
              <h3 className="section-subtitle">Validateurs ({selectedValidators.length}/5)</h3>
              <div className="selected-list">
                {selectedValidators.map((v) => (
                  <div key={v.phone_number} className="validator-card">
                    <div className="validator-info">
                      <div className="validator-name">{v.full_name}</div>
                      <div className="validator-details">{v.phone_number}</div>
                    </div>
                    <button type="button" className="remove-btn" onClick={() => removeValidator(v.phone_number)}>&times;</button>
                  </div>
                ))}
              </div>

              <div className="add-validator-box">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => {setSearchQuery(e.target.value); setShowDropdown(true);}}
                />
                {showDropdown && searchQuery && (
                  <div className="dropdown-list">
                    {filteredUsers.map(user => (
                      <button key={user.phone_number} type="button" className="dropdown-item" onClick={() => addValidator(user)}>
                        {user.full_name} ({user.phone_number})
                      </button>
                    ))}
                  </div>
                )}
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
  );
}

export default CreateGroupPage;