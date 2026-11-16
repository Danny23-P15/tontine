
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  getOperationDetail,
  OperationDetail,
} from '../../services/operationService';

export default function OperationDetailScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const router = useRouter();

  const [operation, setOperation] = useState<OperationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOperation = useCallback(async (refresh = false) => {
    if (!reference) return;

    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const data = await getOperationDetail(reference);
      setOperation(data);
    } catch (err: any) {
      console.error('Erreur détail opération :', err);

      setError(
        err.response?.data?.detail ||
        "Impossible de récupérer les détails de cette opération."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reference]);

  useEffect(() => {
    loadOperation();
  }, [loadOperation]);

  const formatDate = (value: string | null) => {
    if (!value) return 'Non disponible';

    const date = new Date(value);

    if (isNaN(date.getTime())) return 'Date inconnue';

    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const operationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ADD_VALIDATOR: 'Ajout de validateur',
      REMOVE_VALIDATOR: 'Suppression de validateur',
      DELETE_GROUP: 'Suppression de groupe',
      TRANSACTION: 'Transaction financière',
    };

    return labels[type] || type.replace(/_/g, ' ');
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      COMPLETED: 'Terminée',
      REJECTED: 'Refusée',
      EXPIRED: 'Expirée',
      CANCELLED: 'Annulée',
      ACCEPTED: 'Acceptée',
    };

    return labels[status] || status;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'COMPLETED':
        return '#16A34A';
      case 'REJECTED':
        return '#DC2626';
      case 'EXPIRED':
      case 'CANCELLED':
        return '#64748B';
      default:
        return '#D97706';
    }
  };

  const renderPayloadValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return 'Non renseigné';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  };

  const payloadLabel = (key: string) => {
    const labels: Record<string, string> = {
      amount: 'Montant',
      phone_number: 'Numéro du bénéficiaire',
      recipient_phone: 'Numéro du bénéficiaire',
      reason: 'Motif',
      validator_phone_number: 'Numéro du validateur',
      validator_name: 'Nom du validateur',
      group_name: 'Nom du groupe',
    };

    return labels[key] || key.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  if (error || !operation) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error || 'Opération introuvable.'}
        </Text>

        <Text
          style={styles.retryText}
          onPress={() => loadOperation()}
        >
          Réessayer
        </Text>

        <Text
          style={styles.backText}
          onPress={() => router.back()}
        >
          Retour
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadOperation(true)}
          colors={['#2563EB']}
        />
      }
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Détail de l'opération</Text>
        <Text style={styles.reference}>
          Référence : {operation.reference}
        </Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor(operation.status) + '18' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusColor(operation.status) },
            ]}
          >
            {statusLabel(operation.status)}
          </Text>
        </View>
      </View>

      {/* Informations générales */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Informations générales</Text>

        <InfoRow
          label="Type d'opération"
          value={operationTypeLabel(operation.operation_type)}
        />

        <InfoRow
          label="Groupe"
          value={operation.group.group_name}
        />

        <InfoRow
          label="Initiateur"
          value={operation.initiator_phone_number}
        />

        <InfoRow
          label="Quorum requis"
          value={`${operation.group.quorum} validation(s)`}
        />

        <InfoRow
          label="Date de création"
          value={formatDate(operation.created_at)}
        />

        <InfoRow
          label="Date d'expiration"
          value={formatDate(operation.expires_at)}
        />

        {operation.completed_at && (
          <InfoRow
            label="Date de finalisation"
            value={formatDate(operation.completed_at)}
          />
        )}
      </View>

      {/* Progression */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Progression des validations</Text>

        <View style={styles.progressNumbers}>
          <View style={styles.progressItem}>
            <Text style={[styles.progressValue, { color: '#16A34A' }]}>
              {operation.approved_count}
            </Text>
            <Text style={styles.progressLabel}>Acceptées</Text>
          </View>

          <View style={styles.progressItem}>
            <Text style={[styles.progressValue, { color: '#D97706' }]}>
              {operation.pending_count}
            </Text>
            <Text style={styles.progressLabel}>En attente</Text>
          </View>

          <View style={styles.progressItem}>
            <Text style={styles.progressValue}>
              {operation.total_validators}
            </Text>
            <Text style={styles.progressLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              {
                width:
                  operation.total_validators > 0
                    ? `${Math.min(
                        100,
                        (operation.approved_count /
                          operation.total_validators) *
                          100
                      )}%`
                    : '0%',
              },
            ]}
          />
        </View>

        <Text style={styles.progressDescription}>
          {operation.approved_count} validation(s) acceptée(s) sur{' '}
          {operation.total_validators}
        </Text>
      </View>

      {/* Contenu de l'opération */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Détails de la demande</Text>

        {Object.entries(operation.payload || {}).length === 0 ? (
          <Text style={styles.emptyText}>
            Aucun détail supplémentaire.
          </Text>
        ) : (
          Object.entries(operation.payload).map(([key, value]) => (
            <InfoRow
              key={key}
              label={payloadLabel(key)}
              value={renderPayloadValue(value)}
            />
          ))
        )}
      </View>

      {/* Liste des validateurs */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Liste des validateurs</Text>

        {operation.validations.map((validation, index) => (
          <View
            key={`${validation.validator_phone_number}-${index}`}
            style={styles.validatorRow}
          >
            <View style={styles.validatorInfo}>
              <Text style={styles.validatorPhone}>
                {validation.validator_phone_number}
              </Text>

              <Text style={styles.validatorDate}>
                {validation.validated_at
                  ? formatDate(validation.validated_at)
                  : 'En attente de réponse'}
              </Text>

              {validation.rejection_reason ? (
                <Text style={styles.rejectionReason}>
                  Motif : {validation.rejection_reason}
                </Text>
              ) : null}
            </View>

            <Text
              style={[
                styles.validatorStatus,
                { color: statusColor(validation.status) },
              ]}
            >
              {statusLabel(validation.status)}
            </Text>
          </View>
        ))}
      </View>

      {/* État de la réponse personnelle */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Votre participation</Text>

        <InfoRow
          label="Votre statut"
          value={statusLabel(operation.my_validation_status)}
        />

        <View
          style={[
            styles.responseNotice,
            {
              backgroundColor: operation.can_respond
                ? '#EFF6FF'
                : '#F1F5F9',
            },
          ]}
        >
          <Text
            style={[
              styles.responseNoticeText,
              {
                color: operation.can_respond ? '#1D4ED8' : '#64748B',
              },
            ]}
          >
            {operation.can_respond
              ? 'Vous pouvez encore répondre à cette demande depuis les notifications en attente.'
              : 'Vous ne pouvez plus répondre à cette demande.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 35,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 25,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    fontSize: 14,
  },
  retryText: {
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 15,
  },
  backText: {
    color: '#64748B',
    marginTop: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#172554',
  },
  reference: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 7,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 15,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  infoValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  progressNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 18,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#334155',
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 10,
  },
  progressDescription: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 9,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  validatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  validatorInfo: {
    flex: 1,
  },
  validatorPhone: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  validatorDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 5,
  },
  rejectionReason: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 5,
  },
  validatorStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  responseNotice: {
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  responseNoticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
