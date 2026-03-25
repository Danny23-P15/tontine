import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGroupDetail, requestRemoveValidator, requestDeleteGroup } from "../services/groups";
import "../css/GroupDetailPage.css";
import axios from "axios";

function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  // États de base
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  // États des Modaux & Feedback
  const [showValidator, setShowValidator] = useState(false);
  const [statusModal, setStatusModal] = useState({ open: false, message: "", isError: false });
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, data: null });
  const [isProcessing, setIsProcessing] = useState(false);

  // États pour le solde
  const [showBalance, setShowBalance] = useState(false);
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const getToken = () => localStorage.getItem("access_token");

  // Charger le groupe au montage
  const loadGroup = async () => {
    try {
      const data = await getGroupDetail(groupId);
      setGroup(data);
    } catch (err) {
      setError("Impossible de charger le groupe");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  // Charger les utilisateurs pour le select
  useEffect(() => {
    const fetchUsers = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const response = await fetch("http://127.0.0.1:8000/api/users/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setAllUsers(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error("Erreur users:", err);
      }
    };
    fetchUsers();
  }, []);

  // --- LOGIQUE SOLDE ---
  const handleToggleBalance = async () => {
    if (showBalance) { setShowBalance(false); return; }
    setLoadingBalance(true);
    setBalanceError("");
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/groups/${group.id}/balance/`, {
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Pas de solde disponible pour ce groupe pour le moment");
      const data = await response.json();
      setBalance(data);
      setShowBalance(true);
    } catch (err) {
      setBalanceError(err.message);
      setShowBalance(true);
    } finally {
      setLoadingBalance(false);
    }
  };

  // --- ACTIONS (AJOUT / SUPPRESSION / RETRAIT) ---
  const handleAddValidator = async () => {
    setIsProcessing(true);
    try {
      const user = allUsers.find(u => (u.phone_number || u.phone || u.id?.toString()) === selectedUser);
      if (!user) throw new Error("Utilisateur non trouvé");

      const payload = {
        validator_phone_number: user.phone_number || user.phone || user.telephone,
        validator_cin: user.cin || "",
      };

      await axios.post(`http://127.0.0.1:8000/api/groups/${group.id}/validator/add/`, payload, {
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });

      setShowValidator(false);
      setSelectedUser("");
      setStatusModal({ open: true, message: "Demande envoyée avec succès", isError: false });
      loadGroup();
    } catch (err) {
      setStatusModal({ open: true, message: "Erreur lors de l'envoi", isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const processRemoveValidator = async (phone) => {
    setIsProcessing(true);
    try {
      await requestRemoveValidator(group.id, phone);
      setConfirmModal({ open: false });
      setStatusModal({ open: true, message: "✅ Demande de retrait envoyée", isError: false });
      loadGroup();
    } catch (e) {
      setStatusModal({ open: true, message: "❌ Erreur lors de la demande", isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const processDeleteGroup = async () => {
    setIsProcessing(true);
    try {
      const resp = await requestDeleteGroup(group.id);
      setConfirmModal({ open: false });
      setStatusModal({ open: true, message: resp.message || "Demande de suppression envoyée", isError: false });
      loadGroup();
    } catch (err) {
      setStatusModal({ open: true, message: "Erreur lors de la suppression", isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="page-msg">Chargement du groupe...</div>;
  if (error) return <div className="page-msg error">{error}</div>;

  return (
    <div className="group-detail-container">
      <header className="group-detail-header">
        <div>
          <h2 className="group-name">{group.group_name}</h2>
          <p className="creation-date">
            Créé le {group.created_at ? new Date(group.created_at).toLocaleDateString("fr-FR") : "N/A"}
          </p>
        </div>
        <div className={`status-pill ${group.is_active ? "active" : "pending"}`}>
          {group.is_active ? "🟢 Groupe Actif" : "🟡 En cours de validation"}
        </div>
      </header>

      <div className="group-content-grid">
        <aside className="group-stats">
          <div className="stat-card">
            <span className="stat-label">Seuil de validation (Quorum)</span>
            <span className="stat-value">{group.quorum}</span>
          </div>
          <div className="stat-card gold-border">
            <span className="stat-label">Votre Rôle</span>
            <span className="stat-value highlight">{group.me?.role}</span>
          </div>

          <button className="btn-view-balance" onClick={handleToggleBalance} disabled={loadingBalance}>
            {loadingBalance ? "⏳ Chargement..." : showBalance ? "Masquer le solde" : "Voir le solde du groupe"}
          </button>

          <button className="btn-view-balance" onClick={() => navigate(`/groups/${group.id}/transactions`)}>
            📊 Voir les transactions
          </button>

          {group.me?.role === "INITIATOR" && !group.pending_deletion && !group.has_pending_operations && (
            <button className="delete-group-link" onClick={() => setConfirmModal({ open: true, type: 'DELETE_GROUP' })}>
              Supprimer le groupe définitivement
            </button>
          )}
          
          {group.me?.role === "INITIATOR" && group.pending_deletion && (
            <div className="delete-group-pending">⚠️ Demande de suppression en cours</div>
          )}
        </aside>

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
                  {member.username && (
                    <span className="member-username">@{member.username}</span>
                  )}
                  <span className="member-sub">{member.phone_number}</span>
                </div>
                <div className="member-tag-wrapper">
                  <span className={`role-tag ${member.role.toLowerCase()}`}>{member.role}</span>
                  {member.role === "VALIDATOR" && group.me?.role === "INITIATOR" && (
                    <button className="btn-remove-member" onClick={() => setConfirmModal({ open: true, type: 'REMOVE_VALIDATOR', data: member.phone_number })}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* --- MODAL SOLDE (Respecte ton affichage détaillé) --- */}
      {showBalance && (
        <div className="modal-overlay" onClick={() => setShowBalance(false)}>
          <div className="modal balance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">💰</span>
              <h4>État du compte</h4>
            </div>
            <div className="balance-content">
              {balanceError ? (
                <div className="balance-error-state"><p>❌ {balanceError}</p></div>
              ) : balance ? (
                <div className="balance-details">
                  <div className="balance-main">
                    <span className="label">Solde Total</span>
                    <div className="amount-wrapper">
                      <span className="amount">{Number(balance.total_balance ?? balance.balance ?? 0).toLocaleString("fr-FR")}</span>
                      <span className="currency">{balance.currency || "Ar"}</span>
                    </div>
                  </div>
                  <div className="balance-split">
                    <div className="split-item">
                      <span className="label">Disponible</span>
                      <span className="value available">{Number(balance.available_balance || 0).toLocaleString("fr-FR")} {balance.currency || "Ar"}</span>
                    </div>
                    <div className="split-item">
                      <span className="label">En attente</span>
                      <span className="value pending">{Number(balance.pending_balance || 0).toLocaleString("fr-FR")} {balance.currency || "Ar"}</span>
                    </div>
                  </div>
                </div>
              ) : <p className="balance-empty">Chargement...</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-close-modal" onClick={() => setShowBalance(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL AJOUT VALIDATEUR (Avec Spin) --- */}
      {showValidator && (
        <div className="validator-overlay">
          <div className="validator-modal">
            <h4>Ajouter un Validateur</h4>
            <p>Sélectionnez un membre pour rejoindre votre cercle.</p>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} disabled={isProcessing}>
              <option value="">-- Choisir un utilisateur --</option>
              {allUsers.map(user => (
                <option key={user.id} value={user.phone_number || user.id}>
                  {user.full_name} - {user.phone_number}
                </option>
              ))}
            </select>
            <div className="modal-actions">
              <button className="btn-confirm" onClick={handleAddValidator} disabled={!selectedUser || isProcessing}>
                {isProcessing ? <span className="spinner-mini"></span> : "Inviter"}
              </button>
              <button className="btn-cancel" onClick={() => setShowValidator(false)} disabled={isProcessing}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMATION --- */}
      {confirmModal.open && (
        <div className="validator-overlay">
          <div className="validator-modal">
            <h4>Confirmation</h4>
            <p>{confirmModal.type === 'DELETE_GROUP' ? "Voulez-vous vraiment supprimer ce groupe ?" : "Confirmer le retrait de ce validateur ?"}</p>
            <div className="modal-actions">
              <button className="btn-confirm danger" disabled={isProcessing} onClick={() => confirmModal.type === 'DELETE_GROUP' ? processDeleteGroup() : processRemoveValidator(confirmModal.data)}>
                {isProcessing ? <span className="spinner-mini"></span> : "Confirmer"}
              </button>
              <button className="btn-cancel" onClick={() => setConfirmModal({ open: false })} disabled={isProcessing}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL STATUS (Succès / Erreur) --- */}
      {statusModal.open && (
        <div className="validator-overlay" onClick={() => setStatusModal({ ...statusModal, open: false })}>
          <div className="validator-modal" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{statusModal.isError ? "❌" : "✅"}</div>
            <p>{statusModal.message}</p>
            <button className="btn-confirm" onClick={() => setStatusModal({ ...statusModal, open: false })}>Ok</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupDetailPage;