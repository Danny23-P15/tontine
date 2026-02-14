import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPendingNotifications,
  respondToGroupCreation,
} from "../services/notifications";
import NotificationCard from "../components/NotificationCard";
import { logout } from "../services/auth";
import "../css/notification.css";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate(); // Ajout du hook navigate

  const loadNotifications = async () => {
    try {
      setRefreshing(true);
      const data = await getPendingNotifications();
      setNotifications(data.results || []);
    } catch (e) {
      console.error(e);
      alert("Erreur lors du chargement des notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleRefresh = () => {
    loadNotifications();
  };

const handleRespond = async (notification, accept) => {
  try {
    const { endpoint, method, payload } = notification.action;

    await fetch(`http://127.0.0.1:8000${endpoint}`, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        ...payload,
        accept: accept,
      }),
    });

    alert(accept ? "Action acceptée" : "Action refusée");
    loadNotifications();
  } catch (e) {
    alert("Erreur lors de la réponse");
  }
};


  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Chargement des notifications...</p>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <h1 className="header-title">Notifications</h1>
        <div className="header-controls">
          <button 
            className="refresh-button" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "🔄" : "🔄"} 
            {refreshing ? "Actualisation..." : "Actualiser"}
          </button>
          <button className="logout-button" onClick={handleLogout}>
            <span>🚪</span>
            Déconnexion
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h2 className="empty-title">Aucune notification</h2>
          <p className="empty-subtitle">
            Vous n'avez pas de notification en attente pour le moment.
          </p>
          <button className="refresh-button" onClick={handleRefresh} style={{ marginTop: '20px' }}>
            Vérifier à nouveau
          </button>
        </div>
      ) : (
        <>
          <div className="notifications-stats">
            <div className="stats-count">
              <span className="count-badge">{notifications.length}</span>
              <span className="count-text">
                notification{notifications.length > 1 ? 's' : ''} en attente
              </span>
            </div>
            <div className="stats-actions">
              <button className="action-button" onClick={() => {/* Fonction pour tout accepter */}}>
                Tout accepter
              </button>
              <button className="action-button" onClick={() => {/* Fonction pour tout refuser */}}>
                Tout refuser
              </button>
            </div>
          </div>

          <div className="notifications-list">
            {notifications.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onRespond={handleRespond}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}