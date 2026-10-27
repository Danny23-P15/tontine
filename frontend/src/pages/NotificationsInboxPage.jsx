// src/pages/NotificationsInboxPage.jsx
import { useEffect, useState } from "react";
import { getInboxNotifications, deleteNotification } from "../services/notifications";
import "../css/notification.css";

function NotificationsInboxPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    try {
      const data = await getInboxNotifications();
      setNotifications(data.results || []);
    } catch (err) {
      console.error("Erreur inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    setDeleting(notificationId);
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Erreur suppression notification:", err);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="validator-modaln">
      <div className="notifications-header">
        <h1 className="header-title">Historique des notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-title">Aucune notification</h2>
          <p className="empty-subtitle">Vous n'avez pas de notifications dans l'historique.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((n) => (
            <div key={n.id} className="notification-card">
              <div className="notification-content">
                <h4>{n.title}</h4>
                <p>{n.message}</p>
                <small>{new Date(n.created_at).toLocaleString()}</small>
              </div>
              <button
                className="notification-delete-btn"
                onClick={() => handleDeleteNotification(n.id)}
                disabled={deleting === n.id}
                title="Supprimer cette notification"
              >
                {deleting === n.id ? (
                  <span className="spinner-mini"></span>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 17 6"></polyline>
                    <path d="M19 6v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="6" y1="11" x2="6" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsInboxPage;
