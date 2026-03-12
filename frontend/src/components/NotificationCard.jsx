export default function NotificationCard({ notification, onRespond }) {
  return (
    <div className="notification-card">
      <div className="notification-content">
        <h3>{notification.title}</h3>
        <p>{notification.message}</p>
      </div>
      {/* Badge si statut présent */}
      {notification.status === "ACCEPTED" ? (
        <div className="notification-badge accepted">Acceptée</div>
      ) : (
        // Afficher les boutons si action disponible
        notification.action && (
          <div className="notification-actions">
            <button
              className="btn-accept"
              onClick={() => onRespond(notification, true)}
            >
              ✅ Accepter
            </button>

            <button
              className="btn-reject"
              onClick={() => onRespond(notification, false)}
            >
              ❌ Refuser
            </button>
          </div>
        )
      )}
    </div>
  );
}
