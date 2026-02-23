import { useState } from "react";
import { respondToOperation } from "./operationsApi";

export default function OperationDecision({ operation, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasResponded, setHasResponded] = useState(false);

  const handleDecision = async (decision) => {
    try {
      setLoading(true);
      setError(null);

      await respondToOperation({
        operationId: operation.id,
        decision: decision, // "ACCEPTED" ou "REJECTED"
      });

      setHasResponded(true);
    } catch (err) {
      setError("Erreur lors de la réponse.");
    } finally {
      setLoading(false);
    }
  };

  if (operation.status !== "PENDING") {
    return <p>Opération déjà traitée.</p>;
  }

  if (hasResponded) {
    return <p>Votre réponse a été envoyée ✅</p>;
  }

  return (
    <div className="operation-decision">
      {error && <p className="error">{error}</p>}

      <button
        onClick={() => handleDecision("ACCEPTED")}
        disabled={loading}
        className="btn btn-success"
      >
        {loading ? "..." : "Accepter"}
      </button>

      <button
        onClick={() => handleDecision("REJECTED")}
        disabled={loading}
        className="btn btn-danger"
      >
        {loading ? "..." : "Refuser"}
      </button>
    </div>
  );
}
