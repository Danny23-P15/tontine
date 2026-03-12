import { useEffect, useState } from "react";
import api from "../services/api";
import { Wallet, Users, Phone, Send, Info, AlertCircle, CheckCircle, X } from "lucide-react";
import "../css/transaction.css";

export default function TransactionsPage() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupId, setGroupId] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [useGroupAccount, setUseGroupAccount] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadGroups = async () => {
    // ⚠️ Endpoint qui retourne uniquement groupes INITIATOR
    const res = await api.get("groups/my-initiator-groups/");
    const groupsList = res.data.results || [];
    setGroups(groupsList);
    
    // Sélectionner automatiquement le groupe s'il n'y en a qu'un
    if (groupsList.length === 1) {
      setGroupId(groupsList[0].id);
      setSelectedGroup(groupsList[0]);
    }
  };

  const handleGroupChange = (id) => {
    setGroupId(id);
    const group = groups.find((g) => g.id === parseInt(id));
    setSelectedGroup(group || null);
  };

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!groupId) {
      showNotification("Sélectionnez un groupe", "error");
      return;
    }
    if (!phone.trim()) {
      showNotification("Numéro requis", "error");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showNotification("Montant invalide", "error");
      return;
    }

    try {
      setLoading(true);

      await api.post(
        `groups/${groupId}/transactions/request/`,
        {
          phone_number: phone.trim(),
          amount: amount,
          use_group_account: useGroupAccount,
        }
      );

      showNotification("✅ Demande envoyée pour validation", "success");

      setPhone("");
      setAmount("");

    } catch (err) {
      const errorMessage = err.response?.data?.detail || "Erreur lors de la demande";
      showNotification(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-container">
      {/* Notification */}
      {notification && (
        <div className={`notification-toast notification-${notification.type}`}>
          <div className="notification-content">
            {notification.type === "error" ? (
              <AlertCircle size={20} />
            ) : (
              <CheckCircle size={20} />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            className="notification-close"
            onClick={() => setNotification(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}

      <header className="transaction-header">
      <div className="header-icon-circle">
        <Wallet color="#FFD700" size={24} />
      </div>
      <h2 className="page-title">Nouvelle Transaction</h2>
      <p className="page-subtitle">Initiez un transfert soumis à la validation du groupe.</p>
    </header>

    {groups.length === 0 ? (
      <div className="info-box-empty">
        <Info size={20} />
        <p>Vous n’êtes initiateur d’aucun groupe actif pour le moment.</p>
      </div>
    ) : (
      <form className="transaction-form" onSubmit={handleSubmit}>
        
        {/* SECTION GROUPE - Seulement affichée s'il y a plusieurs groupes */}
        {groups.length > 1 && (
          <div className="form-group">
            <label>
              <Users size={16} className="label-icon" /> Groupe de validation
            </label>
            <select
              className="premium-input"
              value={groupId}
              onChange={(e) => handleGroupChange(e.target.value)}
            >
              <option value="">-- Sélectionner un cercle --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.group_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Affichage du groupe sélectionné automatiquement */}
        {groups.length === 1 && selectedGroup && (
          <div className="form-group">
            <label>
              <Users size={16} className="label-icon" /> Groupe de validation
            </label>
            <div className="premium-input" style={{padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "4px"}}>
              {selectedGroup.group_name}
            </div>
          </div>
        )}

        {selectedGroup && (
          <div className="group-summary-card">
            <div className="summary-item">
              <span className="summary-label">Quorum Requis</span>
              <span className="summary-value">{selectedGroup.quorum} membres</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Validateurs</span>
              <span className="summary-value">{selectedGroup.validators_count} actifs</span>
            </div>
          </div>
        )}

        {/* SECTION DESTINATAIRE */}
        <div className="form-group">
          <label>
            <Phone size={16} className="label-icon" /> Numéro destinataire
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              className="premium-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 034 00 000 00"
            />
          </div>
        </div>

        {/* SECTION MONTANT */}
        <div className="form-group">
          <label>
            <span className="label-currency">Ar</span> Montant du transfert
          </label>
          <input
            type="number"
            className="premium-input amount-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* SECTION SOURCE DU DÉBIT */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useGroupAccount}
              onChange={(e) => setUseGroupAccount(e.target.checked)}
              className="checkbox-input"
            />
            <span className="checkbox-text">
              <Wallet size={16} className="label-icon" />
              Débiter le compte du groupe
            </span>
          </label>
          <p className="checkbox-description">
            {useGroupAccount 
              ? "La somme sera débitée du compte collectif du groupe (nécessite validation)" 
              : "La somme sera débitée de votre compte personnel (transaction immédiate)"
            }
          </p>
        </div>

        <button type="submit" className="btn-submit-transaction" disabled={loading}>
          {loading ? (
            <span className="loader"></span>
          ) : (
            <>
              <Send size={18} />
              <span>Envoyer pour validation</span>
            </>
          )}
        </button>
      </form>
    )}
  </div>
);
}