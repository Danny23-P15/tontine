import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MainNavigation from '../components/main-navigation';
import { useAuth } from '../context/AuthContext';
import { checkCanCreateGroup } from '../services/groupPermissionService';
import { getMyGroups } from '../services/groupService';

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

// Couleurs des icônes, alternées d'une carte à l'autre
const CARD_COLORS = [
  { bg: '#e3f5b8', fg: '#4d7c0f' },
  { bg: '#e9defa', fg: '#6d4bc4' },
  { bg: '#fde3cf', fg: '#c2570c' },
];

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
        setPermissionMessage('Impossible de vérifier tes droits. Réessaie plus tard.');
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
      setError('Impossible de charger les groupes. Vérifie ta connexion et réessaie.');
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
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.message}>Chargement des groupes...</Text>
        </View>
        <MainNavigation active="home" />
      </View>
    );
  }

  if (error && groups.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.retry} onPress={loadGroups}>
            Réessayer
          </Text>
        </View>
        <MainNavigation active="home" />
      </View>
    );
  }

  const Header = (
    <View>
      {/* Bandeau vert */}
      <View style={styles.hero}>
        <View style={styles.heroCircle} />

        <View style={styles.heroTopRow}>
          <Text style={styles.greeting}>BONJOUR</Text>
          <View style={styles.heroActions}>
            <Pressable
              onPress={() => router.push('/inbox')}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir la boîte de réception"
              hitSlop={8}
            >
              <Ionicons name="mail-unread-outline" size={22} color="#3f4a1f" />
            </Pressable>
            <Pressable
              onPress={async () => {
                await logout();
                router.replace('/login');
              }}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.logoutText}>Déconnexion</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.heroTitle}>Validez ensemble,{'\n'}en toute confiance.</Text>
        <Text style={styles.heroSubtitle}>
          Gérez vos groupes de validation, on s’occupe du reste.
        </Text>

        {checkingPermission ? (
          <View style={styles.permissionRow}>
            <ActivityIndicator size="small" color="#111827" />
            <Text style={styles.permissionText}>Vérification des droits...</Text>
          </View>
        ) : (
          <>
            <Pressable
              style={[styles.createButton, !canCreateGroup && styles.disabledButton]}
              onPress={() => router.push('/groupCreation')}
              disabled={!canCreateGroup}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.createButtonText}>
                {canCreateGroup ? 'Créer un groupe' : 'Création indisponible'}
              </Text>
            </Pressable>
            {!canCreateGroup && !!permissionMessage && (
              <Text style={styles.permissionError}>{permissionMessage}</Text>
            )}
          </>
        )}
      </View>

      {/* Raccourcis */}
      <View style={styles.shortcuts}>
        <Pressable
          style={styles.shortcut}
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={18} color="#111827" />
          <Text style={styles.shortcutText}>Notifications</Text>
        </Pressable>
        <Pressable
          style={styles.shortcut}
          onPress={() => router.push('/operations/initiated')}
          accessibilityRole="button"
        >
          <Ionicons name="swap-horizontal-outline" size={18} color="#111827" />
          <Text style={styles.shortcutText}>Mes opérations</Text>
        </Pressable>
      </View>

      {/* Titre de section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>ENSEMBLE</Text>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Vos groupes</Text>
          <Text style={styles.seeAll}>{groups.length} groupe(s)</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={Header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshGroups} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.message}>Tu ne fais partie d’aucun groupe pour le moment.</Text>
        }
        renderItem={({ item, index }) => {
          const color = CARD_COLORS[index % CARD_COLORS.length];
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/groupe/${item.id}`)}>
              <View style={[styles.iconBox, { backgroundColor: color.bg }]}>
                <Ionicons name="people-outline" size={26} color={color.fg} />
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.groupName} numberOfLines={1}>
                  {item.group_name}
                </Text>
                <Text style={styles.info}>
                  {item.validators_count} validateur(s) ·{' '}
                  {item.role === 'INITIATOR' ? 'Initiateur' : 'Validateur'}
                </Text>
              </View>

              <View style={styles.cardRight}>
                <Text style={[styles.status, item.is_active ? styles.active : styles.inactive]}>
                  {item.is_active ? 'Actif' : 'Inactif'}
                </Text>
                <Text style={styles.statusHint}>Voir détails</Text>
              </View>
            </Pressable>
          );
        }}
      />
      <MainNavigation active="home" />
    </View>
  );
}

const LIME = '#c6f45a';
const DARK = '#111827';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f5f0' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f6f5f0',
  },
  list: { paddingBottom: 30 },

  // Hero
  hero: {
    backgroundColor: LIME,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    right: -50,
    bottom: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 22,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  greeting: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#3f4a1f' },
  logoutText: { fontSize: 13, fontWeight: '600', color: '#3f4a1f' },
  heroTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    color: DARK,
    marginBottom: 12,
  },
  heroSubtitle: { fontSize: 15, color: '#3f4a1f', marginBottom: 22 },
  createButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DARK,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  disabledButton: { backgroundColor: '#6b7280' },
  createButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  permissionText: { color: '#3f4a1f' },
  permissionError: { color: '#991b1b', fontSize: 13, marginTop: 10 },

  // Raccourcis
  shortcuts: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e6dc',
  },
  shortcutText: { fontSize: 14, fontWeight: '600', color: DARK },

  // Section
  sectionHeader: { paddingHorizontal: 20, marginTop: 24, marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#6b7280' },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: DARK },
  seeAll: { fontSize: 14, color: '#4b5563', fontWeight: '500' },

  // Cartes
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ece9df',
    gap: 14,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  groupName: { fontSize: 17, fontWeight: '700', color: DARK, marginBottom: 4 },
  info: { fontSize: 13, color: '#6b7280' },
  cardRight: { alignItems: 'flex-end' },
  status: { fontSize: 15, fontWeight: '700' },
  active: { color: '#166534' },
  inactive: { color: '#b91c1c' },
  statusHint: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  // États
  message: { color: '#6b7280', textAlign: 'center', marginTop: 12 },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  retry: { color: DARK, fontWeight: 'bold', padding: 10 },
});