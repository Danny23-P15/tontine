
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  getPendingNotifications,
  PendingNotification,
} from '../services/notificationService';
import { Alert } from 'react-native';
import { respondToGroupCreation } from '../services/groupService';
import { respondToOperation } from '@/services/operationService';

export default function NotificationsScreen() {
  const [notifications, setNotifications] =
    useState<PendingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<PendingNotification['id'] | null>(null);
  const [notificationToReject, setNotificationToReject] =
    useState<PendingNotification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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


  const handleRespond = async (
    item: PendingNotification,
    accept: boolean,
    reason?: string,
  ) => {
    // En cas de refus, demander d'abord le motif.
    if (!accept && !reason?.trim()) {
      setNotificationToReject(item);
      setRejectionReason('');
      return;
    }

    // Identifier la demande selon son type.
    const isGroupCreation =
      item.type === 'GROUP_CREATION_REQUEST';

    const tempGroupId = item.action?.payload?.temp_group_id;
    const operationId = item.action?.payload?.operation_id;

    if (isGroupCreation && typeof tempGroupId !== 'number') {
      Alert.alert('Erreur', 'Identifiant de création de groupe introuvable.');
      return;
    }

    if (!isGroupCreation && typeof operationId !== 'number') {
      Alert.alert(
        'Erreur',
        'Identifiant de l’opération introuvable dans la notification.',
      );
      return;
    }

    if (processingId !== null) return;

    setProcessingId(item.id);

    try {
      let result;

      if (isGroupCreation) {
        // Réponse à une demande de création de groupe.
        result = await respondToGroupCreation(
          tempGroupId,
          accept,
          reason?.trim(),
        );
      } else {
        // Réponse à une opération en cours :
        // ajout, suppression de validateur, suppression de groupe,
        // ou transaction.
        result = await respondToOperation(
          operationId as number,
          accept,
          reason?.trim(),
        );
      }

      setNotificationToReject(null);
      setRejectionReason('');

      Alert.alert(
        accept ? 'Réponse envoyée' : 'Demande refusée',
        result?.message ??
          (accept
            ? 'Ton acceptation a été enregistrée.'
            : 'Ton refus a été enregistré.'),
      );

      await loadNotifications();
    } catch (responseError: any) {
      console.error(
        'Erreur lors de la réponse :',
        responseError.response?.data ?? responseError.message,
      );

      Alert.alert(
        'Erreur',
        responseError.response?.data?.detail ??
          responseError.response?.data?.message ??
          responseError.response?.data?.rejection_reason?.[0] ??
          'Impossible d’envoyer ta réponse.',
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

  const renderNotification = ({
    item,
  }: {
    item: PendingNotification;
  }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.message}>{item.message}</Text>

      {item.context?.group_name != null && (
        <Text style={styles.detail}>
          Groupe : {String(item.context.group_name)}
        </Text>
      )}

      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleString()}
      </Text>

      
      {item.action && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.acceptButton,
              processingId !== null && styles.disabledButton,
            ]}
            onPress={() => handleRespond(item, true)}
            disabled={processingId !== null}
          >
            <Text style={styles.buttonText}>
              {processingId === item.id ? 'Envoi...' : 'Accepter'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.refuseButton,
              processingId !== null && styles.disabledButton,
            ]}
            onPress={() => handleRespond(item, false)}
            disabled={processingId !== null}
          >
            <Text style={styles.buttonText}>Refuser</Text>
          </TouchableOpacity>
        </View>
      )}


      {/* Les actions seront reliées aux endpoints
          correspondant au type de demande. */}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#367BF5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Notifications</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Aucune demande en attente.
          </Text>
        }
      />

      <Modal
        visible={notificationToReject !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationToReject(null)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Refuser la demande</Text>
              <Text style={styles.modalDescription}>
                Groupe : {String(notificationToReject?.context?.group_name ?? '')}
              </Text>
              <Text style={styles.modalDescription}>
                Merci d’indiquer le motif du refus.
              </Text>

              <TextInput
                style={styles.reasonInput}
                placeholder="Motif du refus..."
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {rejectionReason.length}/500
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setNotificationToReject(null);
                    setRejectionReason('');
                  }}
                  disabled={processingId !== null}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.refuseButton,
                    (!rejectionReason.trim() || processingId !== null) &&
                      styles.disabledButton,
                  ]}
                  disabled={!rejectionReason.trim() || processingId !== null}
                  onPress={() => {
                    if (notificationToReject) {
                      handleRespond(
                        notificationToReject,
                        false,
                        rejectionReason,
                      );
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Confirmer le refus</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#172033',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
  },
  detail: {
    marginTop: 10,
    fontWeight: '600',
    color: '#367BF5',
  },
  date: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6B7280',
  },
  error: {
    color: '#DC2626',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: { 
    backgroundColor: '#10B981',
  },
  refuseButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: 20,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 12,
  },
  modalDescription: {
    color: '#4B5563',
    marginBottom: 8,
  },
  reasonInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    color: '#172033',
  },
  characterCount: {
    textAlign: 'right',
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: '600',
  },
});

