import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import "../css/GroupDetailPage.css";

export default function GroupTransactionsPage() {
  const { groupId } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filtres ──────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  useEffect(() => {
    loadTransactions();
  }, [groupId]);

  const loadTransactions = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const res = await api.get(`groups/${groupId}/transactions/history/`);
      setTransactions(res.data?.results || []);
    } catch (err) {
      console.error("Erreur transactions:", err);
      alert(
        err.response?.data?.detail ||
          "Erreur lors du chargement des transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "APPROVED":
        return { color: "#16a34a", bg: "#dcfce7", label: "✅ Envoyée" };
      case "PENDING":
        return { color: "#d97706", bg: "#fef3c7", label: "🟡 En validation" };
      case "REJECTED":
        return { color: "#dc2626", bg: "#fee2e2", label: "❌ Refusée" };
      case "CANCELLED":
        return { color: "#6b7280", bg: "#f3f4f6", label: "🚫 Annulée" };
      default:
        return { color: "#6b7280", bg: "#f3f4f6", label: status };
    }
  };

  // ── Logique de filtrage côté client ──────────────────────
  const filteredTransactions = transactions.filter((tx) => {
    // Filtre statut
    if (filterStatus !== "ALL" && tx.status !== filterStatus) return false;

    // Filtre date de début
    if (filterDateFrom) {
      const txDate = new Date(tx.created_at);
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      if (txDate < from) return false;
    }

    // Filtre date de fin
    if (filterDateTo) {
      const txDate = new Date(tx.created_at);
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (txDate > to) return false;
    }

    return true;
  });

  const resetFilters = () => {
    setFilterStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const hasActiveFilters =
    filterStatus !== "ALL" || filterDateFrom !== "" || filterDateTo !== "";

  return (
    <Layout>
      <Sidebar />
      <div className="page-content">
        <h2 className="history">Historique des transactions</h2>

        {/* ── Barre de filtres ── */}
        <div className="filters-bar">
          {/* Filtre Statut */}
          <div className="filter-group">
            <label className="filter-label">Statut</label>
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Tous</option>
              <option value="PENDING">🟡 En validation</option>
              <option value="APPROVED">✅ Approuvée</option>
              <option value="REJECTED">❌ Refusée</option>
              <option value="CANCELLED">🚫 Annulée</option>
            </select>
          </div>

          {/* Filtre Date début */}
          <div className="filter-group">
            <label className="filter-label">Du</label>
            <input
              type="date"
              className="filter-input"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              max={filterDateTo || undefined}
            />
          </div>

          {/* Filtre Date fin */}
          <div className="filter-group">
            <label className="filter-label">Au</label>
            <input
              type="date"
              className="filter-input"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              min={filterDateFrom || undefined}
            />
          </div>

          {/* Bouton reset */}
          {hasActiveFilters && (
            <button className="filter-reset-btn" onClick={resetFilters}>
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {/* ── Compteur de résultats ── */}
        {!loading && (
          <p className="results-count">
            {filteredTransactions.length} transaction
            {filteredTransactions.length !== 1 ? "s" : ""}
            {hasActiveFilters && ` sur ${transactions.length}`}
          </p>
        )}

        {loading && <p>Chargement...</p>}
        {!loading && filteredTransactions.length === 0 && (
          <p className="empty-state">
            {hasActiveFilters
              ? "Aucune transaction ne correspond aux filtres."
              : "Aucune transaction"}
          </p>
        )}

        <div className="transactions-list">
          {filteredTransactions.map((tx) => {
            const status = getStatusStyle(tx.status);
            return (
              <div key={tx.reference} className="transaction-card">
                {/* Ligne principale */}
                <div className="tx-main">
                  <span className="tx-amount">{tx.amount} MGA</span>
                  <span className="tx-arrow">→</span>
                  <span className="tx-recipient">{tx.recipient}</span>
                </div>

                {/* Infos secondaires */}
                <div className="tx-details">
                  <span>Par : {tx.initiator}</span>
                  <span>{new Date(tx.created_at).toLocaleString()}</span>
                </div>

                {/* Status */}
                <div
                  className="tx-status"
                  style={{ color: status.color, backgroundColor: status.bg }}
                >
                  {status.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}