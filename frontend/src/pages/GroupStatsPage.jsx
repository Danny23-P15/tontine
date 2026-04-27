import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchTransactionStats } from "../api/transaction";
import TransactionChart from "../components/TransactionChart";

const GroupStatsPage = () => {
  const { groupId } = useParams();
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    if (!groupId) {
      setError("Groupe non trouvé");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetchTransactionStats(groupId, period);
      // Transform the data to match the chart format
      const chartData = res.last_30_days?.map(item => ({
        date: item.date,
        total: parseFloat(item.total_amount) || 0,
        count: item.count
      })) || [];
      setData(chartData);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Erreur lors du chargement des statistiques");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, groupId]);

  return (
    <div className="p-4">

      <h2 className="text-xl font-bold mb-4">
        Transactions du groupe (ID: {groupId})
      </h2>

      {error && (
        <div style={{
          backgroundColor: "#fee2e2",
          border: "1px solid #fca5a5",
          color: "#991b1b",
          padding: "12px",
          borderRadius: "4px",
          marginBottom: "16px"
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* 🔥 FILTER */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setPeriod("week")}
          className={`px-3 py-1 rounded ${
            period === "week" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Semaine
        </button>

        <button
          onClick={() => setPeriod("month")}
          className={`px-3 py-1 rounded ${
            period === "month" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Mois
        </button>
      </div>

      {/* 🔥 GRAPH */}
      {loading ? (
        <p>Chargement...</p>
      ) : data && data.length > 0 ? (
        <TransactionChart data={data} />
      ) : (
        <p style={{ color: "#666" }}>Aucune données de transactions disponibles</p>
      )}
    </div>
  );
};

export default GroupStatsPage;