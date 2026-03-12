import { useEffect, useState } from "react";
import {
  getPendingOperations,
  respondToOperation,
} from "../services/operations";

export default function PendingOperationsPage() {
  const [ops, setOps] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const load = async () => {
    const res = await getPendingOperations();
    setOps(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const openConfirmModal = (ref, accept) => {
    setConfirmModal({ ref, accept });
    setRejectionReason("");
  };

  const closeConfirmModal = () => {
    setConfirmModal(null);
    setRejectionReason("");
  };

  const confirmRespond = async () => {
    if (!confirmModal) return;

    const { ref, accept } = confirmModal;

    if (!accept) {
      if (!rejectionReason.trim()) {
        alert("Veuillez entrer un motif de refus");
        return;
      }

      await respondToOperation({
        validation_reference: ref,
        accept: false,
        rejection_reason: rejectionReason,
      });
    } else {
      await respondToOperation({
        validation_reference: ref,
        accept: true,
      });
    }

    closeConfirmModal();
    load();
  };

  const renderDescription = (op) => {
    switch (op.operation_type) {
      case "ADD_VALIDATOR":
        return (
          <p>
            Demande d’ajout d’un validateur au groupe
            <strong> {op.group_name}</strong>
          </p>
        );

      case "REMOVE_VALIDATOR":
        return (
          <p>
            Demande de suppression d’un validateur du groupe
            <strong> {op.group_name}</strong>
          </p>
        );

      case "DELETE_GROUP":
        return (
          <p>
            ⚠️ Demande de suppression définitive du groupe
            <strong> {op.group_name}</strong>
          </p>
        );

      case "TRANSACTION":
        return (
          <div>
            <p>
              💸 Demande de transaction depuis le groupe
              <strong> {op.group_name}</strong>
            </p>
            {op.transaction_details && (
              <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                <p><strong>Destinataire:</strong> {op.transaction_details.recipient_phone_number}</p>
                <p><strong>Montant:</strong> {op.transaction_details.amount} Ar</p>
              </div>
            )}
          </div>
        );

      default:
        return <p>Opération inconnue</p>;
    }
  };

  return (
    <div>
      <h2>Opérations en attente</h2>

      {ops.length === 0 && <p>Aucune opération en attente</p>}

      {ops.map((op) => (
        <div key={op.reference} className="card" style={{ marginBottom: 15 }}>
          <h3>{op.group_name}</h3>
          <p>Initiateur : {op.initiator.full_name}</p>

          {renderDescription(op)}

          {op.validators_required && (
            <p>
              Progression : {op.validators_accepted} /{" "}
              {op.validators_required}
            </p>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => openConfirmModal(op.reference, true)}>
              Accepter
            </button>

            <button onClick={() => openConfirmModal(op.reference, false)}>
              Refuser
            </button>
          </div>
        </div>
      ))}

      {/* Modal de confirmation */}
      {confirmModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              maxWidth: "400px",
              minWidth: "300px",
            }}
          >
            <h3>
              {confirmModal.accept
                ? "Confirmer l'acceptation"
                : "Confirmer le refus"}
            </h3>

            <p>
              Êtes-vous sûr de vouloir{" "}
              <strong>
                {confirmModal.accept ? "accepter" : "refuser"}
              </strong>{" "}
              cette opération ?
            </p>

            {!confirmModal.accept && (
              <div style={{ marginBottom: "15px" }}>
                <label>
                  <strong>Motif du refus :</strong>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Entrez le motif du refus..."
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginTop: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontFamily: "inherit",
                    minHeight: "80px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={closeConfirmModal}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Annuler
              </button>

              <button
                onClick={confirmRespond}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: confirmModal.accept ? "#28a745" : "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                {confirmModal.accept ? "Accepter" : "Refuser"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}