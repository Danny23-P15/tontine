import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Clock3, UsersRound } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getPendingOperations } from "../services/operations";
import "../css/OperationDetailPage.css";

const operationLabels = {
  ADD_VALIDATOR: "Ajout d’un validateur",
  REMOVE_VALIDATOR: "Suppression d’un validateur",
  DELETE_GROUP: "Suppression du groupe",
  TRANSACTION: "Transaction",
};

function formatDate(value) {
  if (!value) return "Non renseigné";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Non renseigné"
    : date.toLocaleString("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      });
}

export default function OperationDetailPage() {
  const { reference } = useParams();
  const location = useLocation();
  const stateOperation = location.state?.operation;
  const [loadedOperation, setLoadedOperation] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const stateMatchesReference =
    stateOperation &&
    (stateOperation.operation_reference || stateOperation.reference) === reference;
  const operation = stateMatchesReference
    ? stateOperation
    : (loadedOperation?.operation_reference || loadedOperation?.reference) === reference
      ? loadedOperation
      : null;
  const error = loadError?.reference === reference ? loadError.message : "";
  const loading = !operation && !error;

  useEffect(() => {
    document.title = "Détail de la demande";
    if (stateMatchesReference) return undefined;

    let active = true;
    getPendingOperations()
      .then((response) => {
        const data = response.data;
        const operations = Array.isArray(data) ? data : data?.results;
        if (!Array.isArray(operations)) {
          throw new Error("La liste des opérations reçue est invalide.");
        }

        const match = operations.find(
          (item) =>
            (item.operation_reference || item.reference) === reference
        );
        if (!match) {
          throw new Error("Cette demande est introuvable ou n’attend plus votre réponse.");
        }
        if (active) setLoadedOperation(match);
      })
      .catch((loadError) => {
        if (active) {
          setLoadError({
            reference,
            message:
              loadError.response?.data?.detail ||
              loadError.message ||
              "Impossible de charger le détail de cette demande.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [reference, stateMatchesReference]);

  if (loading) {
    return (
      <main className="operation-detail-page">
        <p className="operation-detail-state" role="status">
          Chargement du détail…
        </p>
      </main>
    );
  }

  if (error || !operation) {
    return (
      <main className="operation-detail-page">
        <Link className="operation-detail-back" to="/operations">
          <ArrowLeft size={18} /> Retour aux demandes
        </Link>
        <p className="operation-detail-error" role="alert">
          {error || "Cette demande est introuvable."}
        </p>
      </main>
    );
  }

  const groupName = operation.group?.name || operation.group_name || "Groupe";
  const initiator =
    operation.initiator?.full_name ||
    operation.initiator_phone ||
    operation.initiator_phone_number ||
    "Non renseigné";
  const payload = {
    ...(operation.transaction_details || {}),
    ...(operation.payload || {}),
  };

  return (
    <main className="operation-detail-page">
      <Link className="operation-detail-back" to="/operations">
        <ArrowLeft size={18} /> Retour aux demandes
      </Link>

      <header className="operation-detail-header">
        <div>
          <p className="operation-detail-eyebrow">DÉTAIL DE LA DEMANDE</p>
          <h1>{operationLabels[operation.operation_type] || "Opération"}</h1>
          <p className="operation-detail-group">{groupName}</p>
        </div>
        <span className="operation-detail-badge">À valider</span>
      </header>

      <section className="operation-detail-card" aria-label="Informations de la demande">
        <h2>Informations générales</h2>
        <div className="operation-detail-grid">
          <div className="operation-detail-item">
            <UsersRound size={20} aria-hidden="true" />
            <div>
              <span>Groupe</span>
              <strong>{groupName}</strong>
            </div>
          </div>
          <div className="operation-detail-item">
            <UsersRound size={20} aria-hidden="true" />
            <div>
              <span>Initiateur</span>
              <strong>{initiator}</strong>
            </div>
          </div>
          <div className="operation-detail-item">
            <CalendarClock size={20} aria-hidden="true" />
            <div>
              <span>Envoyé le</span>
              <strong>{formatDate(operation.created_at || operation.sent_at)}</strong>
            </div>
          </div>
          <div className="operation-detail-item">
            <Clock3 size={20} aria-hidden="true" />
            <div>
              <span>Expire le</span>
              <strong>{formatDate(operation.expires_at)}</strong>
            </div>
          </div>
        </div>
      </section>

      {Object.keys(payload).length > 0 && (
        <section className="operation-detail-card">
          <h2>Détails de l’opération</h2>
          <div className="operation-detail-grid">
            {payload.validator_phone_number && (
              <div className="operation-detail-item">
                <div>
                  <span>
                    {operation.operation_type === "REMOVE_VALIDATOR"
                      ? "Validateur à supprimer"
                      : "Validateur à ajouter"}
                  </span>
                  <strong>{payload.validator_phone_number}</strong>
                </div>
              </div>
            )}
            {payload.amount != null && (
              <div className="operation-detail-item">
                <div>
                  <span>Montant</span>
                  <strong>{payload.amount} Ar</strong>
                </div>
              </div>
            )}
            {payload.recipient_phone_number && (
              <div className="operation-detail-item">
                <div>
                  <span>Destinataire</span>
                  <strong>{payload.recipient_phone_number}</strong>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
