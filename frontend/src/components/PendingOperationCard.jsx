import { useState } from "react";

export default function PendingOperationCard({ operation, onRespond }) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");

  const handleReject = () => {
    onRespond(operation.operation_reference, false, reason);
    setShowModal(false);
    setReason("");
  };

  return (
    <div className="card">
      <h3>{operation.operation_type.replace("_", " ")}</h3>

      <p>
        <strong>Groupe :</strong> {operation.group.name}
      </p>

      <p>
        <strong>Progression :</strong>{" "}
        {operation.approved_count} / {operation.quorum}
      </p>

      {operation.my_validation_status === "PENDING" && (
        <div className="actions">
          <button
            onClick={() =>
              onRespond(operation.operation_reference, true)
            }
          >
            Accepter
          </button>

          <button
            className="danger"
            onClick={() => setShowModal(true)}
          >
            Refuser
          </button>
        </div>
      )}

      {/* ───────── MODAL ───────── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h4>Refuser l’opération</h4>

            <textarea
              placeholder="Motif du refus (obligatoire)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>
                Annuler
              </button>

              <button
                className="danger"
                disabled={!reason.trim()}
                onClick={handleReject}
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
