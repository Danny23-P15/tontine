import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import axios from 'axios';

const GroupBalancePage = () => {
  const { groupId } = useParams();
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`/api/groups/${groupId}/balance/`)
      .then(response => {
        setGroupData(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur:', err);
        setError('Erreur lors du chargement du solde');
        setLoading(false);
      });
  }, [groupId]);

  return (
    <Layout>
      <Sidebar />
      <div className="page-content">
        <h2>Solde du groupe</h2>
        {loading && <p>Chargement...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {groupData && !loading && !error && (
          <div>
            <p><strong>Groupe:</strong> {groupData.group_name}</p>
            <p><strong>Le solde actuel du groupe est:</strong></p>
            <h3 style={{ fontSize: '2em', color: '#007bff' }}>{groupData.balance} DZD</h3>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GroupBalancePage;
