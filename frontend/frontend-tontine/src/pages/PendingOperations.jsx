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

  const accept = async (ref) => {
    await respondToOperation({
      validation_reference: ref,
      accept: true,
    });
    load();
  };

  const reject = async (ref) => {
    const reason = prompt("Motif du refus");
    if (!reason) return;

    await respondToOperation({
      validation_reference: ref,
      accept: false,
      rejection_reason: reason,
    });
    load();
  };

  return (
    <div>
      <h2>Opérations en attente</h2>

      {ops.length === 0 && <p>Aucune opération en attente</p>}

      {ops.map(op => (
        <div key={op.reference} className="card">
          <h3>{op.group_name}</h3>
          <p>Initiateur : {op.initiator.full_name}</p>

          <button onClick={() => accept(op.reference)}>
            Accepter
          </button>
          <button onClick={() => reject(op.reference)}>
            Refuser
          </button>
        </div>
      ))}
    </div>
  );
}
