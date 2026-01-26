import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  // Validation
  if (selectedValidators.length === 0) {
    setError("Veuillez sélectionner au moins un validateur");
    setLoading(false);
    return;
  }

  if (quorum > selectedValidators.length) {
    setError(`Le quorum (${quorum}) ne peut pas dépasser le nombre de validateurs (${selectedValidators.length})`);
    setLoading(false);
    return;
  }

  // Construire l'objet de données
  const requestData = {
    group_name: groupName,
    quorum: Number(quorum),
    validators: selectedValidators.map(v => ({
    phone_number: v.phone_number,
    cin: v.cin,
  }))
  
  

  };

  console.log("Données envoyées au serveur:", JSON.stringify(requestData, null, 2));
  console.log("Validateurs:", selectedValidators);

  try {
    const res = await fetch("http://127.0.0.1:8000/api/groups/create-request/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
    });

    console.log("Réponse status:", res.status);
    
    const data = await res.json();
    console.log("Réponse du serveur:", data);

    if (!res.ok) {
      throw new Error(data.message || data.detail || JSON.stringify(data) || "Erreur création groupe");
    }

    // ✅ succès → notifications
    navigate("/notifications");
  } catch (err) {
    console.error("Erreur détaillée:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

for (const v of selectedValidators) {
  if (!v.phone_number || !v.cin) {
    alert("Chaque validateur doit avoir un téléphone et un CIN");
    return;
  }
}

  // Filtrer les utilisateurs non encore sélectionnés
  const availableUsers = users.filter(user => 
    !selectedValidators.some(validator => validator.phone_number === user.phone_number)
  );

  return (
    <div className="page" style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>Créer un groupe</h2>

      {error && (
        <div style={{ 
          color: "red", 
          marginBottom: "10px", 
          padding: "10px", 
          backgroundColor: "#ffe6e6",
          borderRadius: "4px" 
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Nom du groupe */}
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            Nom du groupe *
          </label>
          <input
            style={{ 
              width: "100%", 
              padding: "10px", 
              border: "1px solid #ccc", 
              borderRadius: "4px",
              fontSize: "16px" 
            }}
            placeholder="Ex: Fond..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
        </div>

        {/* Quorum */}
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            Quorum *
            <span style={{ fontSize: "13px", color: "#666", marginLeft: "8px", fontWeight: "normal" }}>
              (nombre minimum de validateurs requis pour valider une opération)
            </span>
          </label>
          <input
            style={{ 
              width: "100%", 
              padding: "10px", 
              border: "1px solid #ccc", 
              borderRadius: "4px",
              fontSize: "16px" 
            }}
            type="number"
            min="1"
            max={selectedValidators.length || 1}
            value={quorum}
            onChange={(e) => setQuorum(Math.max(1, parseInt(e.target.value) || 1))}
            required
          />
          <div style={{ fontSize: "13px", color: "#666", marginTop: "5px" }}>
            Nombre de validateurs sélectionnés: {selectedValidators.length} | 
            Quorum maximum possible: {selectedValidators.length || 1}
          </div>
        </div>

        {/* Section validateurs */}
        <div>
          <h3 style={{ marginBottom: "15px" }}>
            Validateurs ({selectedValidators.length}/5 maximum)
          </h3>

          {/* Liste des validateurs sélectionnés */}
          <div style={{ marginBottom: "20px" }}>
            {selectedValidators.length === 0 ? (
              <p style={{ color: "#999", fontStyle: "italic", padding: "10px" }}>
                Aucun validateur sélectionné. Ajoutez-en depuis la liste ci-dessous.
              </p>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "10px" 
              }}>
                {selectedValidators.map((validator) => (
                  <div
                    key={validator.phone_number}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 15px",
                      backgroundColor: "#f0f7ff",
                      border: "1px solid #cce0ff",
                      borderRadius: "6px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold" }}>
                        {validator.full_name || "Nom non disponible"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#666" }}>
                        Tél: {validator.phone_number} | CIN: {validator.cin}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeValidator(validator.phone_number)}
                      style={{
                        background: "#ff6b6b",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        width: "30px",
                        height: "30px",
                        cursor: "pointer",
                        fontSize: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Retirer ce validateur"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sélection d'un nouveau validateur */}
          <div style={{ 
            backgroundColor: "#f9f9f9", 
            padding: "20px", 
            borderRadius: "6px",
            border: "1px solid #eee" 
          }}>
            <h4 style={{ marginBottom: "15px" }}>Ajouter un validateur</h4>
            
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <select
                style={{ 
                  flex: 1, 
                  padding: "10px", 
                  border: "1px solid #ccc", 
                  borderRadius: "4px",
                  fontSize: "16px",
                  backgroundColor: "white" 
                }}
                value={newValidator}
                onChange={(e) => setNewValidator(e.target.value)}
                disabled={loadingUsers || selectedValidators.length >= 5}
              >
                <option value="">
                  {loadingUsers ? "Chargement des utilisateurs..." : "Sélectionnez un utilisateur..."}
                </option>
                {availableUsers.map((user) => (
                  <option 
                    key={user.phone_number} 
                    value={user.phone_number}
                  >
                    {user.full_name} - {user.phone_number} {user.cin ? `(CIN: ${user.cin})` : ''}
                  </option>
                ))}
              </select>
              
              <button
                type="button"
                onClick={addValidator}
                disabled={!newValidator || selectedValidators.length >= 5 || loadingUsers}
                style={{
                  padding: "10px 20px",
                  backgroundColor: selectedValidators.length >= 5 ? "#ccc" : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: selectedValidators.length >= 5 ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Ajouter
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "#666" }}>
              {loadingUsers ? (
                "Chargement des utilisateurs..."
              ) : availableUsers.length === 0 ? (
                "Tous les utilisateurs sont déjà sélectionnés ou aucune donnée disponible."
              ) : (
                <>
                  {availableUsers.length} utilisateur(s) disponible(s) | 
                  {selectedValidators.length >= 5 && " Limite de 5 validateurs atteinte"}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bouton de soumission */}
        <button
          type="submit"
          disabled={loading || selectedValidators.length === 0}
          style={{
            padding: "14px",
            backgroundColor: loading || selectedValidators.length === 0 ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading || selectedValidators.length === 0 ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            marginTop: "10px",
          }}
        >
          {loading ? "Création en cours..." : "Créer le groupe"}
        </button>

        <div style={{ fontSize: "13px", color: "#666", marginTop: "10px", textAlign: "center" }}>
          * Les champs marqués d'une astérisque sont obligatoires
        </div>
      </form>
    </div>
  );
}

export default CreateGroupPage;