import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/groupCreation.css";

function CreateGroupPage() {
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState("");
  const [quorum, setQuorum] = useState(1);
  const [users, setUsers] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);
  const [newValidator, setNewValidator] = useState(""); // Pour l'option sélectionnée
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const token = localStorage.getItem("access_token");

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

  // 2️⃣ Ajouter un validateur depuis la liste déroulante
  const addValidator = () => {
    if (!newValidator) {
      setError("Veuillez sélectionner un utilisateur");
      return;
    }

    // Trouver l'utilisateur sélectionné
    const userToAdd = users.find(user => 
      user.phone_number === newValidator || user.id?.toString() === newValidator
    );

    if (!userToAdd) {
      setError("Utilisateur non trouvé");
      return;
    }

    // Vérifier si déjà sélectionné
    const exists = selectedValidators.find(
      (v) => v.phone_number === userToAdd.phone_number
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
        phone_number: userToAdd.phone_number,
        cin: userToAdd.cin,
        full_name: userToAdd.full_name,
        id: userToAdd.id,
      },
    ]);

    // Réinitialiser la sélection
    setNewValidator("");
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

  if (quorum > selectedValidators.length) {
    setError(
      `Le quorum (${quorum}) ne peut pas dépasser le nombre de validateurs (${selectedValidators.length})`
    );
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


  // Filtrer les utilisateurs non encore sélectionnés
  const availableUsers = users.filter(user => 
    !selectedValidators.some(validator => validator.phone_number === user.phone_number)
  );

// ... (vos imports et logique restent identiques)

return (
  <div className="group-page-container">
    <h2 className="group-page-title">Créer un groupe</h2>

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
            <select
              className="form-select"
              value={newValidator}
              onChange={(e) => setNewValidator(e.target.value)}
              disabled={loadingUsers || selectedValidators.length >= 5}
            >
              <option value="">
                {loadingUsers ? "Chargement..." : "Choisir un utilisateur..."}
              </option>
              {availableUsers.map((user) => (
                <option key={user.phone_number} value={user.phone_number}>
                  {user.full_name} ({user.phone_number})
                </option>
              ))}
            </select>
            
            <button
              type="button"
              className="add-btn"
              onClick={addValidator}
              disabled={!newValidator || selectedValidators.length >= 5 || loadingUsers}
            >
              Ajouter
            </button>
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
  </div>
);
}

export default CreateGroupPage;