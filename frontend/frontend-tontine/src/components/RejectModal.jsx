import { useState } from "react";

export default function RejectModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onConfirm(reason);
    setReason("");
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3>Motif du refus</h3>

        <textarea
          placeholder="Expliquez brièvement le refus..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose}>Annuler</button>
          <button onClick={handleSubmit} style={{ background: "#F44336", color: "white" }}>
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "white",
  padding: 20,
  borderRadius: 8,
  width: 400,
};
