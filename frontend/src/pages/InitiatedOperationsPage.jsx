import { useEffect, useState } from "react";
import api from "../services/api";
import "../css/initiatedOperation.css";

export default function InitiatedOperationsPage() {
  const [ops, setOps] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState({ open: false, reference: null });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
    setCancelModal({ open: true, reference });
  };

  const getFilteredOps = () => {
    let filtered = ops;

    // Filtrer par statut
    if (filter === "all") {
      filtered = ops;
    } else {
      filtered = ops.filter(op => {
        if (filter === "expired") {
          return op.status === "EXPIRED" || 
                 (op.status === "PENDING" && op.expires_at && new Date(op.expires_at) < new Date());
        }
        if (filter === "cancelled") {
          return op.status === "CANCELLED";
        }
        return op.status === filter.toUpperCase();
      });
    }

    // Filtrer par dates
    if (startDate || endDate) {
      filtered = filtered.filter(op => {
        const createdDate = new Date(op.created_at);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (createdDate < start) return false;
        }
        
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (createdDate > end) return false;
        }
        
        return true;
      });
    }

    return filtered;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "orange";
      case "APPROVED":
        return "green";
      case "REJECTED":
        return "red";
      case "EXPIRED":
        return "gray";
      case "CANCELLED":
        return "darkgray";
      default:
        return "gray";
    }
  };

  const getStatusLabel = (op) => {
    // Si l'opération est PENDING mais expirée, on affiche "EXPIRED"
    if (op.status === "PENDING" && op.expires_at && new Date(op.expires_at) < new Date()) {
      return "EXPIRED";
    }
    return op.status;
  };

  const getCountByStatus = (status) => {
    if (status === "expired") {
      return ops.filter(op => 
        op.status === "EXPIRED" || 
        (op.status === "PENDING" && op.expires_at && new Date(op.expires_at) < new Date())
      ).length;
    }
    if (status === "cancelled") {
      return ops.filter(op => op.status === "CANCELLED").length;
    }
    return ops.filter(op => op.status === status.toUpperCase()).length;
  };

  return (
    <div className="operations-container">

      <div className="date-filter-section">
        <div className="date-filter-group">
          <label htmlFor="start-date">Date de début</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="date-filter-group">
          <label htmlFor="end-date">Date de fin</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="date-input"
          />
        </div>
        {(startDate || endDate) && (
          <button
            className="reset-filter-btn"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Réinitialiser les dates
          </button>
        )}
      </div>

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
          En attente ({getCountByStatus("pending")})
        </button>
        <button 
          className={`filter-btn ${filter === "approved" ? "active" : ""}`}
          onClick={() => setFilter("approved")}
        >
          Approuvé ({getCountByStatus("approved")})
        </button>
        <button 
          className={`filter-btn ${filter === "rejected" ? "active" : ""}`}
          onClick={() => setFilter("rejected")}
        >
          Rejeté ({getCountByStatus("rejected")})
        </button>
        <button 
          className={`filter-btn ${filter === "expired" ? "active" : ""}`}
          onClick={() => setFilter("expired")}
        >
          Expiré ({getCountByStatus("expired")})
        </button>
        <button 
          className={`filter-btn ${filter === "cancelled" ? "active" : ""}`}
          onClick={() => setFilter("cancelled")}
        >
          Annulé ({getCountByStatus("cancelled")})
        </button>
      </div>

      {getFilteredOps().length === 0 ? (
        <div className="empty-state">
          <p>Aucune opération à afficher</p>
        </div>
      ) : (
        <div className="operations-grid">
          {getFilteredOps().map((op) => {
            const displayStatus = getStatusLabel(op);
            return (
              <div key={op.reference} className="operation-card">
                <div className="card-top">
                  <h3>{op.group_name}</h3>
                  <span className={`status-badge ${displayStatus.toLowerCase()}`}>
                    {displayStatus}
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
                      <p className={`expiry ${displayStatus === "EXPIRED" ? "expired-text" : ""}`}>
                        ⏳ Expire : {new Date(op.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {op.status === "PENDING" && displayStatus !== "EXPIRED" && (
                    <button 
                      className="cancel-btn"
                      onClick={() => cancelOperation(op.reference)}
                      title="Annuler l'opération"
                    >
                      ✕ Annuler
                    </button>
                  )}
                </div>

                {/* MODALE D'ANNULATION SPÉCIFIQUE */}
                {cancelModal.open && cancelModal.reference === op.reference && (
                  <div className="validator-overlay">
                    <div className="modal">
                      <h4>Annuler l’opération</h4>
                      <p>Voulez-vous vraiment annuler cette opération ?</p>
                      <div className="modal-actions">
                        <button onClick={() => setCancelModal({ open: false, reference: null })}>
                          Non
                        </button>
                        <button
                          className="danger"
                          onClick={async () => {
                            await api.post("operations/cancel/", {
                              reference: cancelModal.reference,
                            });
                            setCancelModal({ open: false, reference: null });
                            load();
                          }}
                        >
                          Oui
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}