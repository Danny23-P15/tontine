import { useEffect, useState } from "react";
import api from "../services/api";
import "../css/initiatedOperation.css";

export default function InitiatedOperationsPage() {
  const [ops, setOps] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("operations/initiated/");
      setOps(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Rafraîchir automatiquement toutes les 5 secondes
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const cancelOperation = async (reference) => {
  const confirmed = window.confirm(
    "Voulez-vous vraiment annuler cette opération ?"
  );
  if (!confirmed) return;

  await api.post("operations/cancel/", {
    reference,
  });

  load();
};

  const getFilteredOps = () => {
    if (filter === "all") return ops;
    if (filter === "approved") {
      return ops.filter(op => op.status === "APPROVED" || op.status === "COMPLETED");
    }
    return ops.filter(op => op.status === filter.toUpperCase());
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "orange";
      case "APPROVED":
        return "green";
      case "REJECTED":
        return "red";
      default:
        return "gray";
    }
  };

  return (
  <div className="operations-container">
    <header className="page-header">
      <h2>Mes demandes initiées</h2>
      <div className="header-line"></div>
      <button 
        className="refresh-btn"
        onClick={load}
        disabled={loading}
        title="Rafraîchir"
      >
        {/* {loading ? "⏳" : "🔄"} */}
      </button>
    </header>

    <div className="filter-buttons">
      <button 
        className={`filter-btn ${filter === "all" ? "active" : ""}`}
        onClick={() => setFilter("all")}
      >
        Tous ({ops.length})
      </button>
      <button 
        className={`filter-btn ${filter === "pending" ? "active" : ""}`}
        onClick={() => setFilter("pending")}
      >
        En attente ({ops.filter(op => op.status === "PENDING").length})
      </button>
      <button 
        className={`filter-btn ${filter === "approved" ? "active" : ""}`}
        onClick={() => setFilter("approved")}
      >
        Approuvé ({ops.filter(op => op.status === "APPROVED" || op.status === "COMPLETED").length})
      </button>
      <button 
        className={`filter-btn ${filter === "rejected" ? "active" : ""}`}
        onClick={() => setFilter("rejected")}
      >
        Rejeté ({ops.filter(op => op.status === "REJECTED").length})
      </button>
    </div>

    {getFilteredOps().length === 0 ? (
      <div className="empty-state">
        <p>Aucune opération à afficher</p>
      </div>
    ) : (
      <div className="operations-grid">
        {getFilteredOps().map((op) => (
          <div key={op.reference} className="operation-card">
            <div className="card-top">
              <h3>{op.group_name}</h3>
              <span className={`status-badge ${op.status.toLowerCase()}`}>
                {op.status}
              </span>
            </div>

            <div className="card-body">
              <div className="info-row">
                <span className="label">Type d'opération</span>
                <span className="value">{op.operation_type}</span>
              </div>

              <div className="progress-section">
                <div className="progress-labels">
                  <span>Progression des votes</span>
                  <span>{op.approved_count} / {op.total_validators}</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${(op.approved_count / op.total_validators) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="meta-info">
                <p>📅 Créé : {new Date(op.created_at).toLocaleDateString()}</p>
                {op.expires_at && (
                   <p className="expiry">⏳ Expire : {new Date(op.expires_at).toLocaleDateString()}</p>
                )}
              </div>

              {op.status === "PENDING" && (
                <button 
                  className="cancel-btn"
                  onClick={() => cancelOperation(op.reference)}
                  title="Annuler l'opération"
                >
                  ✕ Annuler
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
}