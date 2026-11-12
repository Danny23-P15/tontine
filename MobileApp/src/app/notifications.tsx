import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { respondToOperation } from '@/services/operationService';
import { respondToGroupCreation } from '../services/groupService';
import {
  getPendingNotifications,
  PendingNotification,
} from '../services/notificationService';

const LIME = '#c6f45a';
const DARK = '#111827';
const BG = '#f6f5f0';

// Couleurs des avatars, alternées d'une notification à l'autre
const AVATAR_COLORS = [
  { bg: '#e9defa', fg: '#6d4bc4' },
  { bg: '#e3f5b8', fg: '#4d7c0f' },
  { bg: '#fde3cf', fg: '#c2570c' },
  { bg: '#dbeafe', fg: '#1d4ed8' },
];

const getInitials = (text?: string) => {
  const parts = (text ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const formatRelativeDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return 'À l’instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<PendingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] =
    useState<PendingNotification['id'] | null>(null);
  const [notificationToReject, setNotificationToReject] =
    useState<PendingNotification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonFocused, setReasonFocused] = useState(false);

  const loadNotifications = async () => {
    try {
      setError('');
      const data = await getPendingNotifications();
      setNotifications(data.results ?? []);
    } catch (e) {
      setError('Impossible de charger les demandes.');
      console.error('Erreur notifications :', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const closeRejectSheet = () => {
    if (processingId !== null) return;
    setNotificationToReject(null);
    setRejectionReason('');
  };

  const handleRespond = async (
    item: PendingNotification,
    accept: boolean,
    reason?: string
  ) => {
    // En cas de refus, demander d'abord le motif.
    if (!accept && !reason?.trim()) {
      setNotificationToReject(item);
      setRejectionReason('');
      return;
    }

    // Identifier la demande selon son type.
    const isGroupCreation = item.type === 'GROUP_CREATION_REQUEST';

    const tempGroupId = item.action?.payload?.temp_group_id;
    const operationId = item.action?.payload?.operation_id;

    if (isGroupCreation && typeof tempGroupId !== 'number') {
      Alert.alert('Erreur', 'Identifiant de création de groupe introuvable.');
      return;
    }

    if (!isGroupCreation && typeof operationId !== 'number') {
      Alert.alert(
        'Erreur',
        'Identifiant de l’opération introuvable dans la notification.'
      );
      return;
    }

    if (processingId !== null) return;

    setProcessingId(item.id);

    try {
      let result;

      if (isGroupCreation) {
        result = await respondToGroupCreation(
          tempGroupId,
          accept,
          reason?.trim()
        );
      } else {
        // Ajout / suppression de validateur, suppression de groupe, transaction.
        result = await respondToOperation(
          operationId as number,
          accept,
          reason?.trim()
        );
      }

      setNotificationToReject(null);
      setRejectionReason('');

      Alert.alert(
        accept ? 'Réponse envoyée' : 'Demande refusée',
        result?.message ??
          (accept
            ? 'Ton acceptation a été enregistrée.'
            : 'Ton refus a été enregistré.')
      );

      await loadNotifications();
    } catch (responseError: any) {
      console.error(
        'Erreur lors de la réponse :',
        responseError.response?.data ?? responseError.message
      );

      Alert.alert(
        'Erreur',
        responseError.response?.data?.detail ??
          responseError.response?.data?.message ??
          responseError.response?.data?.rejection_reason?.[0] ??
          'Impossible d’envoyer ta réponse.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const pendingCount = notifications.filter((n) => n.action).length;

  const countLabel =
    pendingCount === 0
      ? 'Aucune demande en attente'
      : `${pendingCount} demande${pendingCount > 1 ? 's' : ''} en attente`;

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={DARK} />
      </View>
    );
  }

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
        <Text style={styles.topBarTitle}>Notifications</Text>
        <View style={styles.topBarSide} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
          />
        }
      >
        {/* Bandeau vert */}
        <View style={styles.hero}>
          <View style={styles.heroCircle} />
          <Text style={styles.heroEyebrow}>VOTRE ACTIVITÉ</Text>
          <Text style={styles.heroTitle}>Restez au courant.</Text>
          <Text style={styles.heroSubtitle}>
            Suivez les demandes, validations et activités de vos groupes.
          </Text>
        </View>

        {/* Compteur */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>{countLabel}</Text>
          <Pressable
            onPress={() => {
              setRefreshing(true);
              loadNotifications();
            }}
            hitSlop={8}
          >
            <Text style={styles.refreshText}>Actualiser</Text>
          </Pressable>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {/* Liste */}
        <View style={styles.listCard}>
          {notifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={28} color="#9ca3af" />
              <Text style={styles.empty}>Aucune demande en attente.</Text>
            </View>
          ) : (
            notifications.map((item, index) => {
              const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
              const isLast = index === notifications.length - 1;
              const groupName =
                item.context?.group_name != null
                  ? String(item.context.group_name)
                  : '';
              const initials = getInitials(groupName);
              const processing = processingId === item.id;

              return (
                <View
                  key={String(item.id)}
                  style={[styles.row, !isLast && styles.rowBorder]}
                >
                  <View style={[styles.avatar, { backgroundColor: color.bg }]}>
                    {initials ? (
                      <Text style={[styles.avatarText, { color: color.fg }]}>
                        {initials}
                      </Text>
                    ) : (
                      <Ionicons name="notifications-outline" size={20} color={color.fg} />
                    )}
                  </View>

                  <View style={styles.rowBody}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.message}>{item.message}</Text>

                    {!!groupName && (
                      <Text style={styles.detail}>Groupe : {groupName}</Text>
                    )}

                    <Text style={styles.date}>
                      {formatRelativeDate(item.created_at)}
                    </Text>

                    {item.action && (
                      <View style={styles.actions}>
                        <Pressable
                          style={[
                            styles.actionButton,
                            styles.acceptButton,
                            processingId !== null && styles.disabled,
                          ]}
                          onPress={() => handleRespond(item, true)}
                          disabled={processingId !== null}
                        >
                          {processing ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.acceptText}>Accepter</Text>
                          )}
                        </Pressable>

                        <Pressable
                          style={[
                            styles.actionButton,
                            styles.refuseButton,
                            processingId !== null && styles.disabled,
                          ]}
                          onPress={() => handleRespond(item, false)}
                          disabled={processingId !== null}
                        >
                          <Text style={styles.refuseText}>Refuser</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {item.action && <View style={styles.unreadDot} />}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Feuille de refus */}
      <Modal
        visible={notificationToReject !== null}
        transparent
        animationType="slide"
        onRequestClose={closeRejectSheet}
      >
        <View style={styles.sheetRoot}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeRejectSheet} />
          </BlurView>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetWrapper}
            pointerEvents="box-none"
          >
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <ScrollView
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetEyebrow}>REFUS</Text>
                    <Text style={styles.sheetTitle}>Refuser la demande</Text>
                  </View>
                  <Pressable
                    style={styles.sheetClose}
                    onPress={closeRejectSheet}
                    accessibilityRole="button"
                    accessibilityLabel="Fermer"
                  >
                    <Ionicons name="close" size={20} color={DARK} />
                  </Pressable>
                </View>

                {notificationToReject?.context?.group_name != null && (
                  <Text style={styles.sheetSubtitle}>
                    Groupe :{' '}
                    <Text style={styles.sheetSubtitleBold}>
                      {String(notificationToReject.context.group_name)}
                    </Text>
                  </Text>
                )}

                <Text style={styles.fieldLabel}>Motif du refus</Text>
                <TextInput
                  style={[styles.reasonInput, reasonFocused && styles.reasonInputFocused]}
                  placeholder="Explique brièvement ton refus..."
                  placeholderTextColor="#9ca3af"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  onFocus={() => setReasonFocused(true)}
                  onBlur={() => setReasonFocused(false)}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  editable={processingId === null}
                />
                <Text style={styles.characterCount}>{rejectionReason.length}/500</Text>

                <View style={styles.sheetActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={closeRejectSheet}
                    disabled={processingId !== null}
                  >
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.confirmButton,
                      (!rejectionReason.trim() || processingId !== null) &&
                        styles.confirmButtonOff,
                    ]}
                    disabled={!rejectionReason.trim() || processingId !== null}
                    onPress={() => {
                      if (notificationToReject) {
                        handleRespond(notificationToReject, false, rejectionReason);
                      }
                    }}
                  >
                    {processingId !== null ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Confirmer le refus</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  content: { paddingBottom: 40 },

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

  // ----- Hero -----
  hero: {
    backgroundColor: LIME,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 34,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    right: -60,
    bottom: -60,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 22,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#3f4a1f',
    marginBottom: 10,
  },
  heroTitle: { fontSize: 32, fontWeight: '800', color: DARK, marginBottom: 10 },
  heroSubtitle: { fontSize: 15, lineHeight: 22, color: '#3f4a1f', maxWidth: 280 },

  // ----- Compteur -----
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 18,
    marginBottom: 12,
  },
  countText: { fontSize: 13, fontWeight: '700', color: DARK },
  refreshText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  error: { color: '#dc2626', marginHorizontal: 22, marginBottom: 12 },

  // ----- Liste -----
  listCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ece9df',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0eee6' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800' },
  rowBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 4 },
  message: { fontSize: 13, lineHeight: 19, color: '#4b5563' },
  detail: { fontSize: 13, fontWeight: '600', color: '#4d7c0f', marginTop: 8 },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 8 },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#65a30d',
    marginTop: 6,
  },

  // ----- Actions -----
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: { backgroundColor: DARK },
  acceptText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  refuseButton: { backgroundColor: '#fee2e2' },
  refuseText: { color: '#b91c1c', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },

  // ----- Vide -----
  emptyBox: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  empty: { color: '#6b7280', textAlign: 'center' },

  // ----- Feuille de refus -----
  sheetRoot: { flex: 1, backgroundColor: 'transparent' },
  sheetWrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginBottom: 8,
  },
  sheetContent: { paddingHorizontal: 22, paddingBottom: 34 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  sheetEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#6b7280',
  },
  sheetTitle: { fontSize: 26, fontWeight: '800', color: DARK, marginTop: 6 },
  sheetClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 20,
  },
  sheetSubtitleBold: { fontWeight: '700', color: DARK },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 8, marginTop: 12 },
  reasonInput: {
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: DARK,
  },
  reasonInputFocused: { borderColor: LIME },
  characterCount: {
    textAlign: 'right',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 6,
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { color: DARK, fontWeight: '700', fontSize: 15 },
  confirmButton: {
    flex: 1.4,
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonOff: { backgroundColor: '#f1c4c4' },
  confirmButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});