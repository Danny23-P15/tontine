import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { downloadReceipt, openReceipt } from '../../services/receiptService';

import {
  getOperationDetail,
  OperationDetail,
} from '../../services/operationService';

/* ---------- Palette ---------- */
const COLORS = {
  hero: '#D4F26B',
  ink: '#111827',
  text: '#334155',
  muted: '#94A3B8',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  green: '#16A34A',
  greenBg: '#DCFCE7',
  red: '#DC2626',
  redBg: '#FEE2E2',
  amber: '#B45309',
  amberBg: '#FEF3C7',
  blue: '#1D4ED8',
  blueBg: '#DBEAFE',
  slate: '#64748B',
  slateBg: '#E2E8F0',
};

const AVATAR_COLORS = [
  { bg: '#DCFCE7', fg: '#15803D' },
  { bg: '#E0E7FF', fg: '#4338CA' },
  { bg: '#FFEDD5', fg: '#C2410C' },
  { bg: '#FCE7F3', fg: '#BE185D' },
  { bg: '#CFFAFE', fg: '#0E7490' },
];

export default function OperationDetailScreen() {
  const [downloading, setDownloading] = useState(false);
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const router = useRouter();

  const [operation, setOperation] = useState<OperationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOperation = useCallback(
    async (refresh = false) => {
      if (!reference) return;

      try {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        setError('');
        const data = await getOperationDetail(reference);
        setOperation(data);
      } catch (err: any) {
        console.error('Erreur détail opération :', err);
        setError(
          err.response?.data?.detail ||
            'Impossible de récupérer les détails de cette opération.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [reference]
  );

useEffect(() => {
  let isMounted = true;

  const fetchOperation = async () => {
    if (!isMounted) return;
    await loadOperation();
  };

  void fetchOperation();

  return () => {
    isMounted = false;
  };
}, [loadOperation]);
  /* ---------- Helpers ---------- */
  const formatDate = (value: string | null) => {
    if (!value) return 'Non disponible';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Date inconnue';

    const day = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const time = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${day} à ${time.replace(':', ':')}`;
  };

  const operationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ADD_VALIDATOR: 'Ajout de validateur',
      REMOVE_VALIDATOR: 'Suppression de validateur',
      DELETE_GROUP: 'Suppression de groupe',
      TRANSACTION: 'Transaction',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  const operationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'ADD_VALIDATOR':
        return 'person-add-outline';
      case 'REMOVE_VALIDATOR':
        return 'person-remove-outline';
      case 'DELETE_GROUP':
        return 'trash-outline';
      case 'TRANSACTION':
        return 'receipt-outline';
      default:
        return 'document-text-outline';
    }
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

  // Libellé court pour les pastilles de validateurs
  const validatorStatusLabel = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'A accepté';
      case 'REJECTED':
        return 'A refusé';
      default:
        return 'En attente';
    }
  };

  const statusTone = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'COMPLETED':
        return { fg: COLORS.green, bg: COLORS.greenBg, icon: 'checkmark-circle' as const };
      case 'REJECTED':
        return { fg: COLORS.red, bg: COLORS.redBg, icon: 'close-circle' as const };
      case 'EXPIRED':
      case 'CANCELLED':
        return { fg: COLORS.slate, bg: COLORS.slateBg, icon: 'ban' as const };
      default:
        return { fg: COLORS.amber, bg: COLORS.amberBg, icon: 'time' as const };
    }
  };

  const formatAmount = (amount: any) => {
    const n = Number(amount);
    if (isNaN(n)) return null;
    return `${n.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Ar`;
  };

  const getInitials = (name?: string, fallback?: string) => {
    const source = (name || '').trim();
    if (source) {
      const parts = source.split(/\s+/);
      return (
        (parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')
      ).toUpperCase();
    }
    return (fallback || '??').replace(/\D/g, '').slice(-2) || '??';
  };

  const validityDelay = (created: string | null, expires: string | null) => {
    if (!created || !expires) return null;
    const diff = new Date(expires).getTime() - new Date(created).getTime();
    if (isNaN(diff) || diff <= 0) return null;
    return Math.round(diff / (1000 * 60 * 60));
  };

  /* ---------- États de chargement / erreur ---------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={COLORS.ink} />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  if (error || !operation) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>{error || 'Opération introuvable.'}</Text>
        <Text style={styles.retryText} onPress={() => loadOperation()}>
          Réessayer
        </Text>
        <Text style={styles.backText} onPress={() => router.back()}>
          Retour
        </Text>
      </View>
    );
  }

  /* ---------- Données dérivées ---------- */
  const payload: Record<string, any> = operation.payload || {};
  const amount = formatAmount(payload.amount);
  const title =
    payload.reason ||
    payload.title ||
    payload.group_name ||
    operationTypeLabel(operation.operation_type);
  const heroSubtitle = [operationTypeLabel(operation.operation_type), amount]
    .filter(Boolean)
    .join(' · ');
  const opTone = statusTone(operation.status);
  const delay = validityDelay(operation.created_at, operation.expires_at);

  const myStatus = operation.my_validation_status;
  const myNotice = (() => {
    if (myStatus === 'REJECTED') {
      return {
        icon: 'close' as const,
        fg: COLORS.red,
        bg: COLORS.redBg,
        title: 'Vous avez refusé cette demande',
        text: 'Votre réponse a bien été prise en compte.',
      };
    }
    if (myStatus === 'ACCEPTED') {
      return {
        icon: 'checkmark' as const,
        fg: COLORS.green,
        bg: COLORS.greenBg,
        title: 'Vous avez accepté cette demande',
        text: 'Votre réponse a bien été prise en compte.',
      };
    }
    if (operation.can_respond) {
      return {
        icon: 'notifications-outline' as const,
        fg: COLORS.blue,
        bg: COLORS.blueBg,
        title: 'Votre réponse est attendue',
        text: 'Répondez depuis vos notifications en attente.',
      };
    }
    return {
      icon: 'lock-closed-outline' as const,
      fg: COLORS.slate,
      bg: COLORS.slateBg,
      title: 'Demande clôturée',
      text: 'Vous ne pouvez plus répondre à cette demande.',
    };
  })();

    const handleReceipt = async () => {
    if (downloading) return;

    try {
      setDownloading(true);
      const file = await downloadReceipt(operation.reference);
      await openReceipt(file);
    } catch (err: any) {
      Alert.alert(
        'Justificatif indisponible',
        err?.message ?? 'Impossible de récupérer le justificatif.'
      );
    } finally {
      setDownloading(false);
    }
  };

  /* ---------- Rendu ---------- */
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Barre de navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Détails de la demande</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadOperation(true)}
            colors={[COLORS.ink]}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={operationIcon(operation.operation_type)}
              size={26}
              color={COLORS.white}
            />
          </View>

          <View style={styles.heroTexts}>
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {heroSubtitle}
            </Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={[styles.heroBadge, { backgroundColor: opTone.bg }]}>
              <Text style={[styles.heroBadgeText, { color: opTone.fg }]}>
                {statusLabel(operation.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Informations */}
          <Text style={styles.eyebrow}>Informations</Text>
          <Text style={styles.sectionTitle}>À propos de la demande</Text>

          <View style={styles.card}>
            <InfoRow label="Groupe" value={operation.group.group_name} />
            <InfoRow label="Initiateur" value={operation.initiator_phone_number} />
            <InfoRow label="Initiée le" value={formatDate(operation.created_at)} />
            <InfoRow
              label="Expire le"
              value={formatDate(operation.expires_at)}
              last={!operation.completed_at}
            />
            {operation.completed_at && (
              <InfoRow
                label="Finalisée le"
                value={formatDate(operation.completed_at)}
                last
              />
            )}
          </View>

          {delay !== null && (
            <Text style={styles.footnote}>
              Délai de validation : {delay} heures après initiation.
            </Text>
          )}

          {/* Validateurs */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.eyebrow}>Décisions</Text>
              <Text style={styles.sectionTitle}>Validateurs</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {operation.validations.length}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            {operation.validations.map((validation: any, index: number) => {
              const tone = statusTone(validation.status);
              const avatar = AVATAR_COLORS[index % AVATAR_COLORS.length];
              const displayName =
                validation.validator_name || validation.validator_phone_number;
              const isLast = index === operation.validations.length - 1;

              return (
                <View
                  key={`${validation.validator_phone_number}-${index}`}
                  style={[styles.validatorRow, isLast && styles.noBorder]}
                >
                  <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                    <Text style={[styles.avatarText, { color: avatar.fg }]}>
                      {getInitials(
                        validation.validator_name,
                        validation.validator_phone_number
                      )}
                    </Text>
                  </View>

                  <View style={styles.validatorInfo}>
                    <Text style={styles.validatorName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {validation.rejection_reason ? (
                      <Text style={styles.rejectionReason} numberOfLines={2}>
                        Motif : {validation.rejection_reason}
                      </Text>
                    ) : validation.validated_at ? (
                      <Text style={styles.validatorDate}>
                        {formatDate(validation.validated_at)}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.pill, { backgroundColor: tone.bg }]}>
                    <Ionicons name={tone.icon} size={13} color={tone.fg} />
                    <Text style={[styles.pillText, { color: tone.fg }]}>
                      {validatorStatusLabel(validation.status)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Participation personnelle */}
          <View style={[styles.card, styles.noticeCard]}>
            <View style={[styles.noticeIcon, { backgroundColor: myNotice.fg }]}>
              <Ionicons name={myNotice.icon} size={18} color={COLORS.white} />
            </View>
            <View style={styles.noticeTexts}>
              <Text style={styles.noticeTitle}>{myNotice.title}</Text>
              <Text style={styles.noticeText}>{myNotice.text}</Text>

                        {operation.receipt_available && (
            <TouchableOpacity
              style={[styles.receiptButton, downloading && styles.receiptButtonDisabled]}
              onPress={handleReceipt}
              disabled={downloading}
              accessibilityRole="button"
              accessibilityLabel="Télécharger le justificatif"
            >
              {downloading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color={COLORS.white} />
                  <Text style={styles.receiptButtonText}>
                    Télécharger le justificatif (PDF)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && styles.noBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: 25,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.slate,
  },
  errorText: {
    color: COLORS.red,
    textAlign: 'center',
    fontSize: 14,
  },
  retryText: {
    color: COLORS.blue,
    fontWeight: '700',
    marginTop: 15,
  },
  backText: {
    color: COLORS.slate,
    marginTop: 20,
  },

  /* Nav */
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },

  /* Hero */
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.hero,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTexts: {
    flex: 1,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#3F4A1A',
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.ink,
    marginTop: 2,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Body */
  body: {
    padding: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.slate,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
    marginTop: 4,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  countBadge: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: COLORS.hero,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },

  /* Cartes */
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  footnote: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 10,
    marginLeft: 4,
  },

  /* Validateurs */
  validatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  validatorInfo: {
    flex: 1,
  },
  validatorName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  validatorDate: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },
  rejectionReason: {
    fontSize: 11,
    color: COLORS.red,
    marginTop: 3,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Notice personnelle */
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    marginTop: 18,
  },
  noticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTexts: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  noticeText: {
    fontSize: 12,
    color: COLORS.slate,
    marginTop: 2,
  },

    /* Justificatif */
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.ink,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 18,
  },
  receiptButtonDisabled: { opacity: 0.6 },
  receiptButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});
// router