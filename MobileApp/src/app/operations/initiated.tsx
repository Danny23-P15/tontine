import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import MainNavigation from '../../components/main-navigation';
import { getMyInitiatedOperations } from '../../services/groupService';
import { cancelOperation } from '../../services/operationService';

type Operation = {
  reference: string;
  group_name: string;
  operation_type: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  approved_count: number;
  total_validators: number;
};

type Tab = 'all' | 'pending' | 'finished';

const LIME = '#c6f45a';
const DARK = '#111827';
const BG = '#f6f5f0';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'finished', label: 'Terminées' },
];

// Couleurs par statut : fond de l'icône, couleur de l'icône, fond/texte de la pastille, barre
type StatusStyle = {
  label: string;
  iconBg: string;
  iconFg: string;
  pillBg: string;
  pillFg: string;
  bar: string;
};

const STATUS_STYLES: Record<string, StatusStyle> = {
  PENDING: {
    label: 'En attente',
    iconBg: '#fbefc2',
    iconFg: '#a16207',
    pillBg: '#fbefc2',
    pillFg: '#a16207',
    bar: '#d4b73a',
  },
  COMPLETED: {
    label: 'Validée',
    iconBg: '#dcf2e0',
    iconFg: '#2f7d4a',
    pillBg: '#dcf2e0',
    pillFg: '#2f7d4a',
    bar: '#4f9d69',
  },
  APPROVED: {
    label: 'Approuvée',
    iconBg: '#dcf2e0',
    iconFg: '#2f7d4a',
    pillBg: '#dcf2e0',
    pillFg: '#2f7d4a',
    bar: '#4f9d69',
  },
  REJECTED: {
    label: 'Refusée',
    iconBg: '#fde0da',
    iconFg: '#c2412b',
    pillBg: '#fde0da',
    pillFg: '#c2412b',
    bar: '#e8664f',
  },
  CANCELLED: {
    label: 'Annulée',
    iconBg: '#f3f4f6',
    iconFg: '#6b7280',
    pillBg: '#f3f4f6',
    pillFg: '#6b7280',
    bar: '#9ca3af',
  },
  EXPIRED: {
    label: 'Expirée',
    iconBg: '#fde3cf',
    iconFg: '#c2570c',
    pillBg: '#fde3cf',
    pillFg: '#c2570c',
    bar: '#e08a3c',
  },
};

const DEFAULT_STATUS: StatusStyle = {
  label: '',
  iconBg: '#f3f4f6',
  iconFg: '#6b7280',
  pillBg: '#f3f4f6',
  pillFg: '#6b7280',
  bar: '#9ca3af',
};

const OPERATION_LABELS: Record<string, string> = {
  ADD_VALIDATOR: 'Ajout de validateur',
  REMOVE_VALIDATOR: 'Suppression de validateur',
  DELETE_GROUP: 'Suppression de groupe',
  TRANSACTION: 'Transaction',
  GROUP_CREATION: 'Création de groupe',
};

const OPERATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  ADD_VALIDATOR: 'person-add-outline',
  REMOVE_VALIDATOR: 'person-remove-outline',
  DELETE_GROUP: 'trash-outline',
  TRANSACTION: 'receipt-outline',
  GROUP_CREATION: 'people-outline',
};

export default function InitiatedOperationsScreen() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [cancellingReference, setCancellingReference] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');

  const loadOperations = async () => {
    try {
      setError('');

      const data = await getMyInitiatedOperations();
      setOperations(data);
    } catch (err: any) {
      console.error(
        'Erreur de chargement des opérations :',
        err.response?.data ?? err.message
      );

      setError('Impossible de charger tes opérations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOperations();
    }, [])
  );

  const formatDate = (date: string | null, withTime = false) => {
    if (!date) return 'Non disponible';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Non disponible';
    }

    return parsedDate.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
  };

  const handleCancelOperation = (item: Operation) => {
    Alert.alert(
      'Annuler la demande',
      `Voulez-vous vraiment annuler cette opération (${item.reference}) ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            if (cancellingReference !== null) return;

            try {
              setCancellingReference(item.reference);

              const result = await cancelOperation(item.reference);

              Alert.alert(
                'Demande annulée',
                result?.detail ?? 'La demande a été annulée avec succès.'
              );

              await loadOperations();
            } catch (error: any) {
              console.error(
                'Erreur d’annulation :',
                error.response?.data ?? error.message
              );

              Alert.alert(
                'Erreur',
                error.response?.data?.detail ??
                  'Impossible d’annuler cette opération.'
              );
            } finally {
              setCancellingReference(null);
            }
          },
        },
      ]
    );
  };

  const filteredOperations = operations.filter((op) => {
    if (tab === 'pending') return op.status === 'PENDING';
    if (tab === 'finished') return op.status !== 'PENDING';
    return true;
  });

  const renderOperation = ({ item }: { item: Operation }) => {
    const statusStyle = STATUS_STYLES[item.status] ?? {
      ...DEFAULT_STATUS,
      label: item.status,
    };

    const progress =
      item.total_validators > 0
        ? Math.min((item.approved_count / item.total_validators) * 100, 100)
        : 0;

    const iconName = OPERATION_ICONS[item.operation_type] ?? 'document-text-outline';
    const label = OPERATION_LABELS[item.operation_type] ?? item.operation_type;
    const cancelling = cancellingReference === item.reference;

    return (
      <View style={styles.card}>
        {/* En-tête : icône, type, statut */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: statusStyle.iconBg }]}>
            <Ionicons name={iconName} size={22} color={statusStyle.iconFg} />
          </View>

          <View style={styles.cardTitleBox}>
            <Text style={styles.cardEyebrow} numberOfLines={1}>
              Réf. {item.reference}
            </Text>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {label}
            </Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: statusStyle.pillBg }]}>
            <Text style={[styles.statusPillText, { color: statusStyle.pillFg }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        {/* Ligne grise : groupe */}
        <View style={styles.groupBox}>
          <Text style={styles.groupBoxText} numberOfLines={1}>
            {item.group_name}
          </Text>
        </View>

        {/* Progression */}
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progression</Text>
          <Text style={styles.progressCount}>
            {item.approved_count}/{item.total_validators} validations
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: statusStyle.bar },
            ]}
          />
        </View>

        <View style={styles.footerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerText}>
              Envoyée le {formatDate(item.created_at)}
            </Text>
            {item.expires_at && item.status === 'PENDING' && (
              <Text style={styles.expirationText}>
                Expire le {formatDate(item.expires_at, true)}
              </Text>
            )}
          </View>
          <Text style={styles.footerPercent}>{Math.round(progress)}%</Text>
        </View>

        {/* Annulation */}
        {item.status === 'PENDING' && (
          <Pressable
            style={[
              styles.cancelButton,
              cancellingReference !== null && styles.disabled,
            ]}
            onPress={() => handleCancelOperation(item)}
            disabled={cancellingReference !== null}
            accessibilityRole="button"
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#b91c1c" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color="#b91c1c" />
                <Text style={styles.cancelButtonText}>Annuler l’opération</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    );
  };

  const Header = (
    <View>
      {/* Bandeau sombre */}
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>SUIVI DES VALIDATIONS</Text>
        <Text style={styles.heroTitle}>Vos demandes envoyées.</Text>
        <Text style={styles.heroSubtitle}>
          Consultez leur progression et la décision des validateurs.
        </Text>
      </View>

      {/* Onglets */}
      <View style={styles.tabsCard}>
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={DARK} />
          <Text style={styles.helper}>Chargement des opérations...</Text>
        </View>
        <MainNavigation active="requests" />
      </View>
    );
  }

  const emptyMessage =
    tab === 'pending'
      ? 'Aucune demande en attente.'
      : tab === 'finished'
        ? 'Aucune demande terminée.'
        : 'Tu n’as encore initié aucune opération.';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Barre du haut */}
      <View style={styles.topBar}>
        <View style={styles.topBarSide}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={22} color={DARK} />
          </Pressable>
        </View>

        <Text style={styles.topBarTitle}>Mes demandes</Text>

        <View style={[styles.topBarSide, styles.topBarSideRight]}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{operations.length}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredOperations}
        keyExtractor={(item) => item.reference}
        renderItem={renderOperation}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadOperations();
            }}
          />
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyBox}>
              <Ionicons name="paper-plane-outline" size={28} color="#9ca3af" />
              <Text style={styles.empty}>{emptyMessage}</Text>
            </View>
          ) : null
        }
      />
      <MainNavigation active="requests" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  helper: { marginTop: 12, color: '#6b7280' },
  listContent: { paddingBottom: 40, flexGrow: 1 },

  // ----- Barre du haut -----
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 18,
    backgroundColor: BG,
  },
  topBarSide: { width: 60, alignItems: 'flex-start' },
  topBarSideRight: { alignItems: 'flex-end' },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ece9df',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: LIME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { fontSize: 14, fontWeight: '800', color: DARK },

  // ----- Hero -----
  hero: {
    backgroundColor: DARK,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 56,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#9ca3af',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  heroSubtitle: { fontSize: 15, lineHeight: 22, color: '#d1d5db', maxWidth: 300 },

  // ----- Onglets -----
  tabsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: -30,
    marginBottom: 18,
    padding: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ece9df',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: BG },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: DARK, fontWeight: '800' },

  error: { color: '#dc2626', marginHorizontal: 22, marginBottom: 12 },

  // ----- Cartes -----
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ece9df',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBox: { flex: 1 },
  cardEyebrow: { fontSize: 11, color: '#6b7280', marginBottom: 3 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: DARK },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  groupBox: {
    backgroundColor: '#f5f4ef',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 14,
    marginBottom: 16,
  },
  groupBoxText: { fontSize: 13, color: '#6b7280' },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: { fontSize: 12, color: '#6b7280' },
  progressCount: { fontSize: 12, fontWeight: '700', color: DARK },
  progressTrack: {
    height: 7,
    backgroundColor: '#ece9df',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 10 },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  footerText: { fontSize: 11, color: '#6b7280' },
  expirationText: { fontSize: 11, color: '#c2570c', marginTop: 3 },
  footerPercent: { fontSize: 11, fontWeight: '700', color: '#6b7280' },

  // ----- Annulation -----
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 16,
  },
  cancelButtonText: { color: '#b91c1c', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },

  // ----- Vide -----
  emptyBox: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  empty: { textAlign: 'center', color: '#6b7280' },
});