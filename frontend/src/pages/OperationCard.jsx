import { useState } from "react";
import { substituteValidator } from "../api/admin";

const OperationCard = ({ operation, user, refresh }) => {
  const [loading, setLoading] = useState(false);

  const handleSubstitute = async (validation, decision) => {
    if (!window.confirm("Remplacer ce validator ?")) return;

    try {
      setLoading(true);

      await substituteValidator({
        operationId: operation.id,
        validatorPhone: validation.validator_phone_number,
        decision: decision,
      });

      refresh(); // 🔥 recharge les données

    } catch (err) {
      alert(err.response?.data?.detail || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-xl p-4 mb-4 shadow">

      <h3 className="font-bold">
        Operation #{operation.id}
      </h3>

      <p>Status: {operation.status}</p>

      <div className="mt-3">
        <h4 className="font-semibold">Validators</h4>

        {operation.validations.map((v, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-1"
          >
            <div>
              <span>{v.validator_phone_number}</span>

              <span className="ml-2">
                {v.status === "PENDING" && "⏳"}
                {v.status === "ACCEPTED" && "✅"}
                {v.status === "REJECTED" && "❌"}
              </span>
            </div>

            {/* 🔥 ACTION ADMIN */}
            {user.role === "SUPERADMIN" &&
              v.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubstitute(v, "ACCEPT")}
                    disabled={loading}
                    className="bg-green-500 text-white px-2 py-1 rounded"
                  >
                    Accept
                  </button>

                  <button
                    onClick={() => handleSubstitute(v, "REFUSE")}
                    disabled={loading}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Refuse
                  </button>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OperationCard;