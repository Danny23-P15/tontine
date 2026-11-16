import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPendingOperations, respondToOperation } from "../services/operations";
import "../css/OperationsList.css";

const operationLabels = {
  ADD_VALIDATOR: "Ajout d’un validateur",
  REMOVE_VALIDATOR: "Suppression d’un validateur",
  DELETE_GROUP: "Suppression du groupe",
  TRANSACTION: "Transaction",
};

function getErrorMessage(error) {
  return (
    error.response?.data?.detail ||
    error.response?.data?.error ||
    error.message ||
    "Une erreur est survenue. Veuillez réessayer."
  );
}

function OperationsList() {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getPendingOperations();
      const data = response.data;
      const pendingOperations = Array.isArray(data) ? data : data?.results;

      if (!Array.isArray(pendingOperations)) {
        throw new Error("La liste des opérations reçue est invalide.");
      }

      setOperations(pendingOperations);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Opérations à répondre";
    loadOperations();
  }, [loadOperations]);

  const closeDecision = () => {
    if (submitting) return;
    setDecision(null);
    setRejectionReason("");
  };

  const submitDecision = async () => {
    if (!decision) return;

    const reason = rejectionReason.trim();
    if (!decision.accept && !reason) return;

    setSubmitting(true);
    setError("");

    try {
      await respondToOperation({
        validation_reference:
          decision.operation.validation_reference ||
          decision.operation.operation_reference ||
          decision.operation.reference,
        accept: decision.accept,
        ...(decision.accept ? {} : { rejection_reason: reason }),
      });

      setOperations((current) =>
        current.filter(
          (operation) =>
            operation.reference !== decision.operation.reference
        )
      );
      setDecision(null);
      setRejectionReason("");
    } catch (responseError) {
      setError(getErrorMessage(responseError));
    } finally {
      setSubmitting(false);
    }
  };

  const describeOperation = (operation) => {
    switch (operation.operation_type) {
      case "ADD_VALIDATOR":
        return "Demande d’ajout d’un validateur au groupe.";
      case "REMOVE_VALIDATOR":
        return "Demande de suppression d’un validateur du groupe.";
      case "DELETE_GROUP":
        return "Demande de suppression définitive du groupe.";
      case "TRANSACTION":
        return "Demande de transaction depuis ce groupe.";
      default:
        return "Cette opération attend votre réponse.";
    }
  };

  return (
    <main className="pending-operations-page">
      <header className="pending-operations-header">
        <div>
          <p className="pending-operations-eyebrow">VALIDATION</p>
          <h1>Opérations à répondre</h1>
          <p className="pending-operations-intro">
            Consultez les demandes qui nécessitent votre décision.
          </p>
        </div>
        <button
          className="pending-refresh-button"
          type="button"
          onClick={loadOperations}
          disabled={loading}
        >
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
      </header>

      {error && (
        <div className="pending-operations-error" role="alert">
          <p>{error}</p>
          {!loading && (
            <button type="button" onClick={loadOperations}>
              Réessayer
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="pending-operations-state" role="status">
          Chargement des opérations…
        </p>
      ) : operations.length === 0 ? (
        <section className="pending-operations-empty">
          <span className="pending-empty-check" aria-hidden="true">✓</span>
          <h2>Vous êtes à jour</h2>
          <p>Aucune opération n’attend votre réponse pour le moment.</p>
        </section>
      ) : (
        <>
          <p className="pending-operations-count">
            {operations.length} opération{operations.length > 1 ? "s" : ""} en attente
          </p>
          <section className="pending-operations-grid" aria-label="Opérations en attente">
            {operations.map((operation) => {
              const reference =
                operation.operation_reference ||
                operation.reference ||
                operation.validation_reference;
              const accepted = Number(operation.validators_accepted) || 0;
              const required = Number(operation.validators_required) || 0;
              const progress = required
                ? Math.min((accepted / required) * 100, 100)
                : 0;

              return (
                <article
                  className="pending-operation-card"
                  key={reference || operation.id}
                >
                  <Link
                    className="pending-operation-link"
                    to={`/operations/${encodeURIComponent(reference)}`}
                    state={{ operation }}
                  >
                    <div className="pending-operation-card-header">
                      <div>
                        <span className="pending-operation-type">
                          {operationLabels[operation.operation_type] ||
                            operation.operation_type?.replaceAll("_", " ") ||
                            "Opération"}
                        </span>
                        <h2>{operation.group?.name || operation.group_name || "Groupe"}</h2>
                      </div>
                      <span className="pending-badge">À valider</span>
                    </div>

                    <div className="pending-operation-card-body">
                      <p className="pending-operation-description">
                        {describeOperation(operation)}
                      </p>

                      {(operation.initiator?.full_name || operation.initiator_phone) && (
                        <p className="pending-operation-meta">
                          <strong>Initiateur :</strong>{" "}
                          {operation.initiator?.full_name || operation.initiator_phone}
                        </p>
                      )}

                      {(operation.transaction_details || operation.payload) && (
                        <div className="pending-transaction-details">
                          {(operation.transaction_details?.recipient_phone_number ||
                            operation.payload?.recipient_phone_number) && (
                          <p>
                            <strong>Destinataire :</strong>{" "}
                            {operation.transaction_details?.recipient_phone_number ||
                              operation.payload?.recipient_phone_number}
                          </p>
                          )}
                          {(operation.transaction_details?.amount ??
                            operation.payload?.amount) != null && (
                          <p>
                            <strong>Montant :</strong>{" "}
                            {operation.transaction_details?.amount ??
                              operation.payload?.amount} Ar
                          </p>
                          )}
                        </div>
                      )}

                      {required > 0 && (
                        <div className="pending-progress">
                          <div className="pending-progress-label">
                            <span>Validations reçues</span>
                            <strong>{accepted} / {required}</strong>
                          </div>
                          <div
                            className="pending-progress-track"
                            role="progressbar"
                            aria-label="Progression des validations"
                            aria-valuemin={0}
                            aria-valuemax={required}
                            aria-valuenow={Math.min(accepted, required)}
                          >
                            <span style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}
                      <span className="pending-operation-details-link">
                        Voir le détail →
                      </span>
                    </div>
                  </Link>

                  <div className="pending-operation-footer">
                    {(operation.created_at || operation.sent_at) && (
                      <span>
                        Reçue le{" "}
                        {new Date(operation.created_at || operation.sent_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    <div className="pending-operation-actions">
                      <button
                        type="button"
                        className="pending-reject-button"
                        onClick={() => setDecision({ operation, accept: false })}
                        disabled={submitting}
                      >
                        Refuser
                      </button>
                      <button
                        type="button"
                        className="pending-accept-button"
                        onClick={() => setDecision({ operation, accept: true })}
                        disabled={submitting}
                      >
                        Accepter
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}

      {decision && (
        <div className="pending-decision-overlay" onMouseDown={closeDecision}>
          <section
            className="pending-decision-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pending-decision-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="pending-decision-title">
              {decision.accept ? "Confirmer l’acceptation" : "Refuser l’opération"}
            </h2>
            <p>
              {decision.accept
                ? "Confirmez-vous votre accord pour cette opération ?"
                : "Indiquez le motif de votre refus."}
            </p>
            {!decision.accept && (
              <label className="pending-rejection-label">
                Motif du refus
                <textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  rows={4}
                  placeholder="Expliquez brièvement votre décision…"
                  disabled={submitting}
                />
              </label>
            )}
            <div className="pending-decision-actions">
              <button
                type="button"
                className="pending-cancel-button"
                onClick={closeDecision}
                disabled={submitting}
              >
                Annuler
              </button>
              <button
                type="button"
                className={decision.accept ? "pending-accept-button" : "pending-reject-button"}
                onClick={submitDecision}
                disabled={
                  submitting || (!decision.accept && !rejectionReason.trim())
                }
              >
                {submitting
                  ? "Envoi…"
                  : decision.accept
                    ? "Confirmer"
                    : "Confirmer le refus"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default OperationsList;
