import { useEffect, useState, useCallback } from "react";
import { getPendingNotifications } from "../services/notifications";
import NotificationCard from "../components/NotificationCard";
import { RefreshCcw, BellOff, CheckCircle, XCircle, Filter } from "lucide-react";
import "../css/notification.css";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState("all"); // 'all', 'invitation', 'system'
  const [statusModal, setStatusModal] = useState({ open: false, message: "", isError: false });

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPendingNotifications();
      setNotifications(data.results || []);
    } catch (e) {
      setStatusModal({ open: true, message: "Impossible de charger les notifications.", isError: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRespond = async (notification, accept) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const { endpoint, method, payload } = notification.action;
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: method || "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access")}`,
        },
        body: JSON.stringify({ ...payload, accept: accept }),
      });

      if (!response.ok) throw new Error("Le serveur a refusé la requête.");

      // Animation de sortie : On retire de la liste avec un petit délai si nécessaire
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      setStatusModal({ 
        open: true, 
        message: accept ? "Invitation acceptée !" : "Notification ignorée", 
        isError: false 
      });
    } catch (e) {
      setStatusModal({ open: true, message: "Action échouée. Vérifiez votre connexion.", isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (filter === "all") return true;
    return n.type?.toLowerCase() === filter;
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-gold"></div>
        <p>Synchronisation...</p>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <div className="title-section">
          <h1 className="header-title">Centre d'actions</h1>
          <p className="header-subtitle">Gérez vos invitations et alertes système</p>
        </div>
        <button className={`refresh-btn-circle ${loading ? 'spinning' : ''}`} onClick={loadNotifications}>
          <RefreshCcw size={20} />
        </button>
      </div>

      <div className="notif-toolbar">
        <div className="filter-group">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Toutes</button>
          <button className={`filter-btn ${filter === 'invitation' ? 'active' : ''}`} onClick={() => setFilter('invitation')}>Invitations</button>
        </div>
        <div className="stats-pill">
          <span className="dot"></span>
          {notifications.length} en attente
        </div>
      </div>

      <div className="notifications-list-wrapper">
        {filteredNotifs.length === 0 ? (
          <div className="empty-card">
            <div className="icon-circle"><BellOff size={32} /></div>
            <h3>Aucune notification</h3>
            <p>Vous êtes à jour ! Revenez plus tard pour de nouvelles activités.</p>
          </div>
        ) : (
          <div className="notifications-grid">
            {filteredNotifs.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onRespond={handleRespond}
                disabled={isProcessing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Feedback */}
      {statusModal.open && (
        <div className="modal-overlay-blur">
          <div className="modal-status-card">
            <div className={`status-ring ${statusModal.isError ? 'error' : 'success'}`}>
              {statusModal.isError ? <XCircle size={40} /> : <CheckCircle size={40} />}
            </div>
            <h3>{statusModal.isError ? "Erreur" : "Confirmé"}</h3>
            <p>{statusModal.message}</p>
            <button className="modal-close-btn" onClick={() => setStatusModal({ ...statusModal, open: false })}>
              Continuer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}