import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyGroups } from "../services/groups";
import "../css/groupCreation.css";

function CreateGroupPage() {
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState("");
  const [quorum, setQuorum] = useState(1);
  const [users, setUsers] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // Pour la recherche
  const [showDropdown, setShowDropdown] = useState(false); // Pour afficher/masquer le dropdown
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isInitiator, setIsInitiator] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const token = localStorage.getItem("access_token");

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

  // 1️⃣ Charger les users
  useEffect(() => {
    setLoadingUsers(true);
    fetch("http://127.0.0.1:8000/api/users/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur de chargement des utilisateurs");
        return res.json();
      })
      .then((data) => {
        // S'assurer que data est un tableau
        const usersList = Array.isArray(data) ? data : data.results || [];
        setUsers(usersList);
      })
      .catch((err) => {
        console.error("Erreur:", err);
        setError("Impossible de charger les utilisateurs");
      })
      .finally(() => {
        setLoadingUsers(false);
      });
  }, [token]);

  // 2️⃣ Ajouter un validateur depuis la recherche
  const addValidator = (user) => {
    // Vérifier si déjà sélectionné
    const exists = selectedValidators.find(
      (v) => v.phone_number === user.phone_number
    );

    if (exists) {
      setError("Cet utilisateur est déjà sélectionné");
      return;
    }

    // Vérifier la limite
    if (selectedValidators.length >= 5) {
      setError("Maximum 5 validateurs autorisés");
      return;
    }

    // Ajouter le validateur
    setSelectedValidators([
      ...selectedValidators,
      {
        phone_number: user.phone_number,
        cin: user.cin,
        full_name: user.full_name,
        id: user.id,
      },
    ]);

    // Réinitialiser la recherche
    setSearchQuery("");
    setShowDropdown(false);
    setError("");
  };

  const removeValidator = (phoneNumber) => {
    setSelectedValidators(
      selectedValidators.filter(
        (v) => v.phone_number !== phoneNumber
      )
    );
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  if (selectedValidators.length === 0) {
    setError("Veuillez sélectionner au moins un validateur");
    setLoading(false);
    return;
  }

  if (quorum >= selectedValidators.length) {
    setError("Quorum doit être inférieur au nombre de validateur");
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

  console.log("Données envoyées au serveur:", requestData);

  try {
    const res = await fetch(
      "http://127.0.0.1:8000/api/groups/create-request/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      }
    );

    const data = await res.json();
    console.log("Réponse serveur:", data);

    if (!res.ok) {
      throw new Error(data.detail || "Erreur création groupe");
    }

    navigate("/notifications");
  } catch (err) {
    console.error(err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};


  // Filtrer les utilisateurs par recherche et non encore sélectionnés
  const filteredUsers = users.filter(user => {
    const isSelected = selectedValidators.some(validator => validator.phone_number === user.phone_number);
    const matchesSearch = !searchQuery || 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone_number.includes(searchQuery) ||
      (user.cin && user.cin.includes(searchQuery));
    
    return !isSelected && matchesSearch;
  });

// ... (vos imports et logique restent identiques)

return (
  <div className="group-page-container">
    <h2 className="group-page-title">Créer un groupe</h2>

    {loadingRoles ? (
      <div className="loading-msg">Chargement en cours...</div>
    ) : isInitiator ? (
      <div className="initiator-restriction">
        <div className="restriction-icon">⚠️</div>
        <h3>Vous êtes déjà initiateur d'un groupe</h3>
        <p>Vous ne pouvez initier qu'un seul groupe à la fois.</p>
        <p>Pour créer un autre groupe, veuillez terminer l'initialisation du groupe actuel ou contacter l'administrateur.</p>
        <button 
          className="back-btn"
          onClick={() => navigate("/groups")}
        >
          Retour à mes groupes
        </button>
      </div>
    ) : (
      <>
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="group-form">
      {/* Nom du groupe */}
      <div className="form-section">
        <label className="form-label">
          Nom du groupe *
        </label>
        <input
          className="form-input"
          placeholder="Ex: Fond de solidarité..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          required
        />
      </div>

      {/* Quorum */}
      <div className="form-section">
        <label className="form-label">
          Quorum *
          <span className="label-helper">
            (nombre minimum de validateurs requis)
          </span>
        </label>
        <input
          className="form-input"
          type="number"
          min="1"
          max={selectedValidators.length || 1}
          value={quorum}
          onChange={(e) => setQuorum(Math.max(1, parseInt(e.target.value) || 1))}
          required
        />
        <div className="form-info-text">
          Sélectionnés: {selectedValidators.length} | Max possible: {selectedValidators.length || 1}
        </div>
      </div>

      {/* Section validateurs */}
      <div className="validators-section">
        <h3 className="section-subtitle">
          Validateurs <span className="highlight">({selectedValidators.length}/5 max)</span>
        </h3>

        {/* Liste des sélectionnés */}
        <div className="selected-list">
          {selectedValidators.length === 0 ? (
            <p className="empty-msg">Aucun validateur sélectionné.</p>
          ) : (
            selectedValidators.map((validator) => (
              <div key={validator.phone_number} className="validator-card">
                <div className="validator-info">
                  <div className="validator-name">{validator.full_name}</div>
                  <div className="validator-details">
                    Tél: {validator.phone_number} | CIN: {validator.cin}
                  </div>
                </div>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeValidator(validator.phone_number)}
                  title="Retirer"
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>

        {/* Ajout d'un validateur */}
        <div className="add-validator-box">
          <h4 className="add-title">Ajouter un membre</h4>
          <div className="add-controls">
            <div className="search-container">
              <input
                type="text"
                className="form-input search-input"
                placeholder="Rechercher par nom, téléphone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true); // Afficher le dropdown lors de la recherche
                }}
                onFocus={() => setShowDropdown(true)}
                disabled={loadingUsers || selectedValidators.length >= 5}
              />
              
              {showDropdown && filteredUsers.length > 0 && (
                <div className="dropdown-list">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.phone_number}
                      type="button"
                      className="dropdown-item"
                      onClick={() => addValidator(user)}
                    >
                      <div className="dropdown-item-name">{user.full_name}</div>
                      <div className="dropdown-item-meta">
                        {user.phone_number} | {user.cin}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {showDropdown && filteredUsers.length === 0 && searchQuery && (
                <div className="dropdown-empty">Aucun utilisateur trouvé</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="submit-group-btn"
        disabled={loading || selectedValidators.length === 0}
      >
        {loading ? "Création en cours..." : "Confirmer la création"}
      </button>

      <div className="required-footer">* Champs obligatoires</div>
    </form>
      </>
    )}
  </div>
);
}

export default CreateGroupPage;