export default function NotificationCard({ notification, onRespond }) {
  const isGroupCreation =
    notification.type === "GROUP_CREATION_REQUEST";

  return (
    <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 10 }}>
      <h4>{notification.title}</h4>
      <p>{notification.message}</p>

      {isGroupCreation && (
        <div>
          <button
            onClick={() =>
              onRespond(notification, true)
            }
          >
            Accepter
          </button>

          <button
            style={{ marginLeft: 8 }}
            onClick={() =>
              onRespond(notification, false)
            }
          >
            Refuser
          </button>
        </div>
      )}
    </div>
  );
}
