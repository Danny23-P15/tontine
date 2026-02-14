export default function NotificationCard({ notification, onRespond }) {
  return (
    <div className="notification-card">
      <div className="notification-content">
        <h3>{notification.title}</h3>
        <p>{notification.message}</p>
      </div>

      {/* 👇 ICI les boutons */}
      {notification.action && (
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
      )}
    </div>
  );
}
