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

    // Exclure les demandes de création de groupe
    filtered = filtered.filter(op => op.operation_type !== "GROUP_CREATION");

    // Filtrer par statut
    if (filter === "all") {
      filtered = filtered;
    } else {
      filtered = filtered.filter(op => {
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
    const nonGroupOps = ops.filter(op => op.operation_type !== "GROUP_CREATION");
    
    if (status === "expired") {
      return nonGroupOps.filter(op => 
        op.status === "EXPIRED" || 
        (op.status === "PENDING" && op.expires_at && new Date(op.expires_at) < new Date())
      ).length;
    }
    if (status === "cancelled") {
      return nonGroupOps.filter(op => op.status === "CANCELLED").length;
    }
    return nonGroupOps.filter(op => op.status === status.toUpperCase()).length;
  };

return (
    <div className="operations-container">
      {/* --- Section Filtres Dates --- */}
      <div className="date-filter-section">
        <div className="date-filter-group">
          <label htmlFor="start-date">Initier le:</label>
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

      {/* --- Section Boutons de Statut --- */}
      <div className="filter-buttons">
        <button 
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Tous ({getFilteredOps().length})
        </button>
        {/* ... (garder tes autres boutons identiques) ... */}
      </div>

      {/* --- Grille des Opérations --- */}
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
                    <div className="progress-circle-container">
                      <svg width="70" height="120" viewBox="0 0 120 120" className="progress-circle-svg">
                        <circle 
                          cx="60" 
                          cy="60" 
                          r="50" 
                          fill="none" 
                          stroke="#e0e0e0" 
                          strokeWidth="8"
                        />
                        <circle 
                          cx="60" 
                          cy="60" 
                          r="50" 
                          fill="none" 
                          stroke="#4CAF50" 
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * (1 - op.approved_count / op.total_validators)}`}
                          className="progress-circle-fill"
                          style={{ 
                            transform: "rotate(-90deg)", 
                            transformOrigin: "60px 60px",
                            transition: "stroke-dashoffset 0.5s ease"
                          }}
                        />
                        <text 
                          x="60" 
                          y="70" 
                          textAnchor="middle" 
                          fontSize="24" 
                          fontWeight="bold" 
                          fill="#333"
                          className="progress-circle-text"
                        >
                          {Math.round((op.approved_count / op.total_validators) * 100)}%
                        </text>
                      </svg>
                      <div className="progress-circle-info">
                        <p className="progress-circle-label">Progression des votes</p>
                        <p className="progress-circle-count">{op.approved_count} / {op.total_validators}</p>
                      </div>
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
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODALE UNIQUE (Placée en dehors du .map) --- */}
      {cancelModal.open && (
        <div className="validator-overlay" onClick={() => setCancelModal({ open: false, reference: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{fontSize: '2rem'}}>⚠️</span>
              <h4>Annuler l’opération</h4>
            </div>
            <p>Voulez-vous vraiment annuler l'opération <strong>{cancelModal.reference}</strong> ?</p>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setCancelModal({ open: false, reference: null })}
              >
                Non, garder
              </button>
              <button
                className="btn-confirm danger"
                style={{ backgroundColor: '#28a745', color: 'white' }}
                onClick={async () => {
                  try {
                    await api.post("operations/cancel/", {
                      reference: cancelModal.reference,
                    });
                    setCancelModal({ open: false, reference: null });
                    load();
                  } catch (err) {
                    alert("Erreur lors de l'annulation");
                  }
                }}
              >
                Oui, Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}