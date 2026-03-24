import React from 'react';
import { Check, X, Bell, UserPlus, Info, Clock } from "lucide-react";

export default function NotificationCard({ notification, onRespond, disabled }) {
  
  // Fonction pour choisir l'icône selon le type (si disponible dans ton objet notification)
  const getIcon = () => {
    switch (notification.type?.toLowerCase()) {
      case 'invitation': return <UserPlus size={18} />;
      case 'system': return <Info size={18} />;
      default: return <Bell size={18} />;
    }
  };

  return (
    <div className={`notification-card ${notification.status === "ACCEPTED" ? 'is-accepted' : ''}`}>
      <div className="card-left">
        <div className={`icon-wrapper ${notification.type?.toLowerCase() || 'default'}`}>
          {getIcon()}
        </div>
      </div>

      <div className="card-main">
        <div className="card-header">
          <h3 className="notif-title">{notification.title || "Notification"}</h3>
          <span className="notif-time">
            <Clock size={12} /> Juste maintenant
          </span>
        </div>
        <p className="notif-message">{notification.message}</p>

        {/* Pied de carte : Actions ou Badge */}
        <div className="card-footer">
          {notification.status === "ACCEPTED" ? (
            <div className="status-badge-premium">
              <Check size={14} /> Action confirmée
            </div>
          ) : (
            notification.action && (
              <div className="action-buttons-group">
                <button
                  className="btn-action btn-confirm"
                  onClick={() => onRespond(notification, true)}
                  disabled={disabled}
                >
                  {disabled ? <div className="spinner-mini"></div> : <><Check size={16} /> Accepter</>}
                </button>

                <button
                  className="btn-action btn-decline"
                  onClick={() => onRespond(notification, false)}
                  disabled={disabled}
                >
                  <X size={16} /> Refuser
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}