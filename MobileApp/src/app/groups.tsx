
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { checkCanCreateGroup } from '../services/groupPermissionService';

import { getMyGroups } from '../services/groupService';

// DEMANDES DE CRÉATION DE GROUPE

type Group = {
  id: number;
  group_name: string;
  role: 'INITIATOR' | 'VALIDATOR';
  validators_count: number;
  is_active: boolean;
  created_at: string;
};

type GroupsResponse = {
  count: number;
  results: Group[];
};

export default function GroupesScreen() {
  const { logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [canCreateGroup, setCanCreateGroup] = useState<boolean | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [permissionMessage, setPermissionMessage] = useState('');

  useEffect(() => {
  const checkPermission = async () => {
    try {
      const result = await checkCanCreateGroup();

      setCanCreateGroup(result.can_create);
      setPermissionMessage(result.reason ?? '');
    } catch (err) {
      console.error('Erreur de vérification des droits :', err);
      setCanCreateGroup(false);
      setPermissionMessage(
        'Impossible de vérifier tes droits. Réessaie plus tard.'
      );
    } finally {
      setCheckingPermission(false);
    }
  };

  checkPermission();
}, []);

  const loadGroups = async () => {
    try {
      setError('');

      const data: GroupsResponse = await getMyGroups();

      setGroups(data.results);
    } catch (err) {
      console.error('Erreur lors du chargement des groupes :', err);
      setError(
        'Impossible de charger les groupes. Vérifie ta connexion et réessaie.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const refreshGroups = () => {
    setRefreshing(true);
    loadGroups();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.message}>Chargement des groupes...</Text>
      </View>
    );
  }

  if (error && groups.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.retry} onPress={loadGroups}>
          Réessayer
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Mes groupes de validation</Text>
          <Text style={styles.subtitle}>
            {groups.length} groupe(s) trouvé(s)
          </Text>
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}
          accessibilityRole="button"
        >
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </Pressable>
      </View>


    {checkingPermission ? (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.permissionText}>
          Vérification des droits...
        </Text>
      </View>
    ) : (
  <>
    <Pressable
      style={[
        styles.createButton,
        !canCreateGroup && styles.disabledButton,
      ]}
      onPress={() => router.push('/groupCreation')}
      disabled={!canCreateGroup}
      accessibilityRole="button"
    >
      <Text style={styles.createButtonText}>
        {canCreateGroup ? '+ Créer un groupe' : 'Création indisponible'}
      </Text>
    </Pressable>

    {!canCreateGroup && (
      <Text style={styles.permissionError}>
        {permissionMessage}
      </Text>
    )}
  </>
)}

      <TouchableOpacity
        onPress={() => router.push('/notifications')}
        style={{
          backgroundColor: '#367BF5',
          padding: 14,
          borderRadius: 10,
          margin: 12,
        }}
        accessibilityRole="button"
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', textAlign: 'center' }}>
          Voir les notifications
        </Text>
      </TouchableOpacity>

      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshGroups}
          />
        }
        contentContainerStyle={
          groups.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <Text style={styles.message}>
            Tu ne fais partie d’aucun groupe pour le moment.
          </Text>
        }
        renderItem={({ item }) => (
        <Pressable
            style={styles.card}
            onPress={() => router.push(`/groupe/${item.id}`)}
        >
            <Text style={styles.groupName}>{item.group_name}</Text>

            <Text style={styles.info}>
            Ton rôle : {item.role === 'INITIATOR' ? 'Initiateur' : 'Validateur'}
            </Text>

            <Text style={styles.info}>
            Nombre de validateurs : {item.validators_count}
            </Text>

            <Text style={[styles.status, item.is_active ? styles.active : styles.inactive]}>
            {item.is_active ? 'Groupe actif' : 'Groupe inactif'}
            </Text>

            <Text style={styles.openDetail}>Voir les détails →</Text>
        </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 20,
    paddingTop: 55,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 20,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  groupName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  info: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 8,
  },
  status: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    fontWeight: '600',
  },
  active: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  inactive: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  message: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retry: {
    color: '#2563eb',
    fontWeight: 'bold',
    padding: 10,
  },
  OpenDetail: {
    marginTop: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  disabledButton: {
  backgroundColor: '#9ca3af',
},
permissionContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 8,
  marginBottom: 20,
},
permissionText: {
  color: '#6b7280',
},
permissionError: {
  color: '#dc2626',
  fontSize: 14,
  marginTop: -10,
  marginBottom: 20,
},
});
