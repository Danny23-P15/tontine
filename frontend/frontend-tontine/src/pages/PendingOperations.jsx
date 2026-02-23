import { useEffect, useState } from "react";
import {
  getPendingOperations,
  respondToOperation,
} from "../services/operations";

export default function PendingOperationsPage() {
  const [ops, setOps] = useState([]);

  const load = async () => {
    const res = await getPendingOperations();
    setOps(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const respond = async (ref, accept) => {
    if (!accept) {
      const reason = prompt("Motif du refus");
      if (!reason) return;

      await respondToOperation({
        validation_reference: ref,
        accept: false,
        rejection_reason: reason,
      });
    } else {
      await respondToOperation({
        validation_reference: ref,
        accept: true,
      });
    }

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
            <button onClick={() => respond(op.reference, true)}>
              Accepter
            </button>

            <button onClick={() => respond(op.reference, false)}>
              Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}