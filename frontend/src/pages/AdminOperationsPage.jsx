import { useEffect, useState } from "react";
import { fetchAdminOperations } from "../api/operations";
import "../css/AdminOperationsPage.css";

function AdminOperationsPage() {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Admin - Opérations";
    loadOperations();
  }, []);

  const loadOperations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminOperations();
      setOperations(data);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des opérations");
      console.error("Error fetching admin operations:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-operations-container"><div className="loading">Chargement des opérations...</div></div>;
  }

  if (error) {
    return (
      <div className="admin-operations-container">
        <div className="error-message">
          <p>Erreur: {error}</p>
          <button onClick={loadOperations} className="retry-button">Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-operations-container">
      <h1>Opérations - Panneau d'Administration</h1>
      
      {operations.length === 0 ? (
        <p className="no-operations">Aucune opération trouvée</p>
      ) : (
        <div className="operations-table-wrapper">
          <table className="operations-table">
            <thead>
              <tr>
                <th>Type d'Opération</th>
                <th>Groupe</th>
                <th>Numéro du Téléphone Initiateur</th>
                <th>Date de Création</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((operation, index) => (
                <tr key={index}>
                  <td>{operation.operation_type}</td>
                  <td>{operation.group_name}</td>
                  <td>{operation.initiator_phone_number}</td>
                  <td>{new Date(operation.created_at).toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminOperationsPage;
