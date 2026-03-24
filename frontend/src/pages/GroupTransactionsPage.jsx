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
        return { color: "green", label: "✅ Envoyée" };
      case "PENDING":
        return { color: "orange", label: "🟡 En validation" };
      case "REJECTED":
        return { color: "red", label: "❌ Refusée" };
      default:
        return { color: "gray", label: status };
    }
  };

  return (
    <Layout>
      <Sidebar />

      <div className="page-content">
        <h2 className="history">Historique des transactions</h2>

        {loading && <p>Chargement...</p>}

        {!loading && transactions.length === 0 && (
          <p>Aucune transaction</p>
        )}

        <div className="transactions-list">
          {transactions.map((tx) => {
            const status = getStatusStyle(tx.status);

            return (
              <div key={tx.reference} className="transaction-card">
                
                {/* Ligne principale */}
                <div className="tx-main">
                  <span className="tx-amount">
                    {tx.amount} MGA
                  </span>

                  <span className="tx-arrow">→</span>

                  <span className="tx-recipient">
                    {tx.recipient}
                  </span>
                </div>

                {/* Infos secondaires */}
                <div className="tx-details">
                  <span>Par : {tx.initiator}</span>
                  <span>
                    {new Date(tx.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Status */}
                <div 
                  className="tx-status"
                  style={{ color: status.color }}
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