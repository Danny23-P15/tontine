// src/pages/NotificationsInboxPage.jsx
import { useEffect, useState } from "react";
import { getInboxNotifications } from "../services/notifications";
import "../css/notification.css";

function NotificationsInboxPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <h1 className="header-title">Historique des notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h2 className="empty-title">Aucune notification</h2>
          <p className="empty-subtitle">Vous n'avez pas de notifications dans l'historique.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((n) => (
            <div key={n.id} className="notification-card">
              <h4>{n.title}</h4>
              <p>{n.message}</p>
              <small>{new Date(n.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsInboxPage;
