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
  

  // 👇 Nouveaux états pour le solde inline
  const [showBalance, setShowBalance] = useState(false);
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState("");

  const getToken = () => {
    return localStorage.getItem("access_token");
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

  // Charger tous les utilisateurs
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
            Authorization: `Bearer ${token}`,
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
        const usersList = Array.isArray(data) ? data : data.results || [];
        setAllUsers(usersList);
      } catch (err) {
        console.error("Erreur détaillée:", err);
        setError(err.message || "Impossible de charger les utilisateurs");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // 👇 Fonction pour charger + toggler le solde
  const handleToggleBalance = async () => {
    if (showBalance) {
      setShowBalance(false);
      return;
    }

    setLoadingBalance(true);
    setBalanceError("");

    try {
      const token = getToken();
      const response = await fetch(
        `http://127.0.0.1:8000/api/groups/${group.id}/balance/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Impossible de récupérer le solde");
      }

      const data = await response.json();
      setBalance(data);
      setShowBalance(true);
    } catch (err) {
      console.error(err);
      setBalanceError(err.message || "Erreur lors du chargement du solde");
      setShowBalance(true); // Afficher quand même pour montrer l'erreur
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleAddValidator = async () => {
    try {
      const token = getToken();

      const selectedUserData = allUsers.find(
        (u) =>
          u.phone_number === selectedUser ||
          u.phone === selectedUser ||
          u.telephone === selectedUser ||
          u.id?.toString() === selectedUser
      );

      if (!selectedUserData) {
        alert("Utilisateur non trouvé");
        return;
      }

      const validatorPhone =
        selectedUserData.phone_number ||
        selectedUserData.phone ||
        selectedUserData.telephone;

      if (!validatorPhone) {
        alert("Cet utilisateur n'a pas de numéro de téléphone");
        return;
      }

      const payload = {
        validator_phone_number: validatorPhone,
        validator_cin: selectedUserData.cin || "",
      };

      await axios.post(
        `http://127.0.0.1:8000/api/groups/${group.id}/validator/add/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
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
      await requestRemoveValidator(group.id, phone);
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
          <p className="creation-date">
            Créé le{" "}
            {group.created_at
              ? new Date(group.created_at).toLocaleDateString("fr-FR")
              : "N/A"}
          </p>
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

          {/* 👇 Bouton toggle solde */}
          <button
            className="btn-view-balance"
            onClick={handleToggleBalance}
            disabled={loadingBalance}
          >
            {loadingBalance
              ? "⏳ Chargement..."
              : showBalance
              ? " Masquer le solde"
              : " Voir le solde du groupe"}
          </button>

          {/* 👇 Bouton voir les transactions */}
          <button
            className="btn-view-balance"
            onClick={() => navigate(`/groups/${group.id}/transactions`)}
          >
            📊 Voir les transactions
          </button>

          {/* 👇 Bloc solde inline */}
        {/* Modal d'affichage du solde */}
        {showBalance && (
          <div className="modal-overlay" onClick={() => setShowBalance(false)}>
            <div className="modal balance-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-icon">💰</span>
                <h4>État du compte</h4>
              </div>

              <div className="balance-content">
                {balanceError ? (
                  <div className="balance-error-state">
                    <p>❌ {balanceError}</p>
                  </div>
                ) : balance ? (
                  <div className="balance-details">
                    <div className="balance-main">
                      <span className="label">Solde Total</span>
                      <div className="amount-wrapper">
                        <span className="amount">
                          {Number(balance.total_balance ?? balance.balance ?? 0).toLocaleString("fr-FR")}
                        </span>
                        <span className="currency">{balance.currency || "Ar"}</span>
                      </div>
                    </div>

                    <div className="balance-split">
                      <div className="split-item">
                        <span className="label">Disponible</span>
                        <span className="value available">
                          {Number(balance.available_balance || 0).toLocaleString("fr-FR")} {balance.currency || "Ar"}
                        </span>
                      </div>
                      <div className="split-item">
                        <span className="label">En attente</span>
                        <span className="value pending">
                          {Number(balance.pending_balance || 0).toLocaleString("fr-FR")} {balance.currency || "Ar"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="balance-empty">Aucune donnée disponible</p>
                )}
              </div>

              <div className="modal-actions">
                <button className="btn-close-modal" onClick={() => setShowBalance(false)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
          {group.me?.role === "INITIATOR" &&
            !group.pending_deletion &&
            !group.has_pending_operations && (
              <button
                className="delete-group-link"
                onClick={handleDeleteGroupRequest}
              >
                Supprimer le groupe définitivement
              </button>
            )}
          {group.me?.role === "INITIATOR" && group.pending_deletion && (
            <div className="delete-group-pending">
              ⚠️ Demande de suppression en cours
            </div>
          )}
          {group.me?.role === "INITIATOR" &&
            group.has_pending_operations &&
            !group.pending_deletion && (
              <div className="delete-group-pending">
                ⚠️ Opérations en attente - Suppression impossible
              </div>
            )}
        </aside>

        {/* Colonne de droite : Liste des membres */}
        <main className="members-section">
          <div className="section-header">
            <h3>
              Membres du groupe{" "}
              <span className="member-count">({group.members.length})</span>
            </h3>
            {group.me?.role === "INITIATOR" &&
              group.members?.filter((m) => m.role === "VALIDATOR").length <
                5 && (
                <button
                  className="btn-add-mini"
                  onClick={() => setShowValidator(true)}
                >
                  + Ajouter
                </button>
              )}
          </div>

          <div className="members-stack">
            {group.members.map((member) => (
              <div key={member.phone_number} className="member-item">
                <div className="member-avatar-mini">
                  {member.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="member-body">
                  <span className="member-fullname">{member.full_name}</span>
                  {member.username && (
                    <span className="member-username">@{member.username}</span>
                  )}
                  <span className="member-sub">{member.phone_number}</span>
                </div>
                <div className="member-tag-wrapper">
                  <span className={`role-tag ${member.role.toLowerCase()}`}>
                    {member.role}
                  </span>
                  {member.role === "VALIDATOR" &&
                    group.me?.role === "INITIATOR" && (
                      <button
                        className="btn-remove-member"
                        onClick={() =>
                          handleRemoveValidator(member.phone_number)
                        }
                      >
                        ✕
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>

          {/* Modal ajout de validateur */}
          {showValidator && (
            <div className="validator-overlay">
              <div className="validator-modal">
                <h4>Ajouter un Validateur</h4>
                <p>Sélectionnez un membre pour rejoindre votre cercle.</p>

                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">-- Choisir un utilisateur --</option>
                  {allUsers.map((user) => (
                    <option
                      key={user.id}
                      value={user.phone_number || user.id}
                    >
                      {user.full_name || "Sans nom"}{" "}
                      {user.username ? `(@${user.username})` : ""} -{" "}
                      {user.phone_number}
                    </option>
                  ))}
                </select>

                <div className="modal-actions">
                  <button
                    className="btn-confirm"
                    onClick={handleAddValidator}
                    disabled={!selectedUser}
                  >
                    Inviter
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => setShowValidator(false)}
                  >
                    Fermer
                  </button>
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
//total: 