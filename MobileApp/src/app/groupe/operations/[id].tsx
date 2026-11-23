import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getGroupOperations, GroupOperation } from '../../../services/groupService';

const DARK = '#111827';
const BG = '#f6f5f0';

const OPERATION_LABELS: Record<string, string> = {
  ADD_VALIDATOR: 'Ajout de validateur',
  REMOVE_VALIDATOR: 'Suppression de validateur',
  DELETE_GROUP: 'Suppression du groupe',
  TRANSACTION: 'Transaction',
  GROUP_CREATION: 'Création du groupe',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  COMPLETED: 'Terminée',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
  EXPIRED: 'Expirée',
};

export default function GroupOperationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [operations, setOperations] = useState<GroupOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState("");
  const loadOperations = useCallback(async () => {
    if (!id) {
      setError('Identifiant du groupe introuvable.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError('');
      const response = await getGroupOperations(Number(id), search);
      setOperations(response.results);
    } catch (err: any) {
      console.error(
        'Erreur de chargement de l’historique du groupe :',
        err.response?.data ?? err.message
      );
      setError('Impossible de charger l’historique des opérations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, search]);

  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  const formatDate = (value: string | null) => {
    if (!value) return 'Non disponible';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Non disponible';

    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOperation = ({ item }: { item: GroupOperation }) => {
    const status = item.status.toUpperCase();
    const statusColor =
      status === 'COMPLETED' || status === 'APPROVED'
        ? '#2f7d4a'
        : status === 'REJECTED'
          ? '#c2412b'
          : status === 'PENDING'
            ? '#a16207'
            : '#6b7280';

    return (
      
      <Pressable
        style={styles.operationCard}
        onPress={() =>
          router.push(
            `/groupe/operations/history/${encodeURIComponent(item.reference)}`
          )
        }
        accessibilityRole="button"
        accessibilityLabel={`Voir le détail de l’opération ${item.reference}`}
      >
        <View style={styles.operationHeader}>
          <View style={styles.operationIcon}>
            <Ionicons name="receipt-outline" size={21} color={DARK} />
          </View>
          <View style={styles.operationTitleBox}>
            <Text style={styles.operationTitle}>
              {OPERATION_LABELS[item.operation_type] ?? item.operation_type}
            </Text>
            <Text style={styles.reference}>Réf. {item.reference}</Text>
          </View>
          <Text style={[styles.status, { color: statusColor }]}>
            {STATUS_LABELS[status] ?? item.status}
          </Text>
        </View>

        <View style={styles.details}>
          <DetailRow label="Initiée par" value={item.initiator_phone_number} />
          <DetailRow label="Date" value={formatDate(item.created_at)} />
          {item.completed_at ? (
            <DetailRow label="Terminée le" value={formatDate(item.completed_at)} />
          ) : null}
          {item.expires_at && status === 'PENDING' ? (
            <DetailRow label="Expire le" value={formatDate(item.expires_at)} last />
          ) : null}
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={DARK} />
        <Text style={styles.helper}>Chargement de l’historique...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <Text style={styles.topBarTitle}>Historique des opérations</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <TextInput
        placeholder="Rechercher une référence..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={operations}
        keyExtractor={(item) => item.reference}
        renderItem={renderOperation}
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
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={32} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {error || 'Aucune opération enregistrée pour ce groupe.'}
            </Text>
            {error ? (
              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  setLoading(true);
                  loadOperations();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 18,
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
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
  },
  topBarSpacer: { width: 40 },
  listContent: { flexGrow: 1, paddingTop: 12, paddingBottom: 36 },
  operationCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ece9df',
  },
  operationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  operationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eef7d6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationTitleBox: { flex: 1 },
  operationTitle: { fontSize: 15, fontWeight: '800', color: DARK },
  reference: { fontSize: 11, color: '#6b7280', marginTop: 3 },
  status: { fontSize: 12, fontWeight: '700' },
  details: {
    marginTop: 14,
    backgroundColor: '#f8f7f3',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  detailRow: { paddingVertical: 10 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: '#ece9df' },
  detailLabel: { fontSize: 11, color: '#6b7280', marginBottom: 3 },
  detailValue: { fontSize: 13, color: DARK, fontWeight: '600' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: { color: '#6b7280', textAlign: 'center' },
  retryButton: {
    backgroundColor: DARK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  retryButtonText: { color: '#ffffff', fontWeight: '700' },
});
