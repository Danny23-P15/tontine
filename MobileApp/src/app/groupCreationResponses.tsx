
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getPendingGroupCreations,
  PendingGroupCreation,
  respondToGroupCreation,
} from '../services/groupCreationResponseService';

export default function GroupCreationResponsesScreen() {
  const [requests, setRequests] = useState<PendingGroupCreation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [refusalModalVisible, setRefusalModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<PendingGroupCreation | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadRequests = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await getPendingGroupCreations();
      setRequests(data);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        'Impossible de charger les demandes. Vérifie ta connexion.';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const isExpired = (request: PendingGroupCreation) =>
    new Date(request.expires_at).getTime() <= Date.now();

  const formatDate = (date: string) =>
    new Date(date).toLocaleString();

  const handleAccept = (request: PendingGroupCreation) => {
    if (isExpired(request)) {
      Alert.alert('Demande expirée', 'Cette demande a dépassé sa date limite.');
      return;
    }

    Alert.alert(
      'Confirmer l’acceptation',
      `Acceptes-tu de rejoindre le groupe « ${request.group_name} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: () => submitResponse(request, true),
        },
      ],
    );
  };

  const openRefusalModal = (request: PendingGroupCreation) => {
    if (isExpired(request)) {
      Alert.alert('Demande expirée', 'Cette demande a dépassé sa date limite.');
      return;
    }

    setSelectedRequest(request);
    setRejectionReason('');
    setRefusalModalVisible(true);
  };

  const submitResponse = async (
    request: PendingGroupCreation,
    accept: boolean,
    reason?: string,
  ) => {
    if (!accept && !reason?.trim()) {
      Alert.alert('Motif obligatoire', 'Explique pourquoi tu refuses cette demande.');
      return;
    }

    setProcessingId(request.id);

    try {
      const result = await respondToGroupCreation(
        request.id,
        accept,
        reason?.trim(),
      );

      setRefusalModalVisible(false);
      setSelectedRequest(null);
      setRejectionReason('');

      Alert.alert(
        accept ? 'Réponse enregistrée' : 'Demande refusée',
        result?.message ??
          (accept
            ? 'Ton acceptation a été enregistrée.'
            : 'Ton refus a été enregistré.'),
      );

      await loadRequests(true);
    } catch (error: any) {
      const data = error?.response?.data;
      const message =
        data?.message ??
        data?.rejection_reason?.[0] ??
        (typeof data === 'string' ? data : null) ??
        'Une erreur est survenue lors de l’envoi de ta réponse.';

      Alert.alert('Erreur', message);
    } finally {
      setProcessingId(null);
    }
  };

  const renderRequest = ({ item }: { item: PendingGroupCreation }) => {
    const expired = isExpired(item);
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.groupName}>{item.group_name}</Text>
            <Text style={styles.subtitle}>
              Demande de création de groupe
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              expired ? styles.expiredBadge : styles.pendingBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                expired ? styles.expiredText : styles.pendingText,
              ]}
            >
              {expired ? 'Expirée' : 'En attente'}
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        <Text style={styles.info}>
          Initiateur : {item.initiator_phone_number}
        </Text>
        <Text style={styles.info}>
          Validations reçues : {item.approved_count} / {item.total_validators}
        </Text>
        <Text style={styles.info}>
          Quorum du groupe : {item.quorum}
        </Text>
        <Text style={styles.info}>
          Créée le : {formatDate(item.created_at)}
        </Text>
        <Text style={styles.info}>
          Expire le : {formatDate(item.expires_at)}
        </Text>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  item.total_validators > 0
                    ? Math.min(
                        100,
                        (item.approved_count / item.total_validators) * 100,
                      )
                    : 0
                }%`,
              },
            ]}
          />
        </View>

        {expired ? (
          <Text style={styles.expiredMessage}>
            Cette demande a expiré. Tu ne peux plus y répondre.
          </Text>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.acceptButton,
                isProcessing && styles.disabledButton,
              ]}
              disabled={isProcessing}
              onPress={() => handleAccept(item)}
            >
              <Text style={styles.buttonText}>
                {isProcessing ? 'Envoi...' : 'Accepter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rejectButton,
                isProcessing && styles.disabledButton,
              ]}
              disabled={isProcessing}
              onPress={() => openRefusalModal(item)}
            >
              <Text style={styles.buttonText}>Refuser</Text>
            </TouchableOpacity>
          </View>
        )}

        {isProcessing && (
          <ActivityIndicator style={styles.spinner} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Demandes de création',
          headerShown: true,
        }}
      />

      <View style={styles.header}>
        <Text style={styles.heading}>Demandes reçues</Text>
        <Text style={styles.description}>
          Accepte ou refuse les demandes de création de groupe qui te sont
          adressées.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Chargement des demandes...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRequest}
          contentContainerStyle={
            requests.length === 0 ? styles.emptyList : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRequests(true)}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>Aucune demande en attente</Text>
              <Text style={styles.emptyDescription}>
                Les nouvelles demandes apparaîtront ici.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={refusalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRefusalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Refuser la demande</Text>

              <Text style={styles.modalDescription}>
                Groupe : {selectedRequest?.group_name}
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
                  onPress={() => setRefusalModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rejectButton,
                    (!rejectionReason.trim() ||
                      processingId !== null) &&
                      styles.disabledButton,
                  ]}
                  disabled={
                    !rejectionReason.trim() || processingId !== null
                  }
                  onPress={() => {
                    if (selectedRequest) {
                      submitResponse(
                        selectedRequest,
                        false,
                        rejectionReason,
                      );
                    }
                  }}
                >
                  <Text style={styles.buttonText}>
                    Confirmer le refus
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#172033',
  },
  description: {
    marginTop: 8,
    color: '#667085',
    fontSize: 14,
    lineHeight: 21,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E6EAF0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleContainer: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172033',
  },
  subtitle: {
    fontSize: 13,
    color: '#667085',
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingBadge: {
    backgroundColor: '#FFF3D6',
  },
  expiredBadge: {
    backgroundColor: '#FDE8E7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingText: {
    color: '#8A5A00',
  },
  expiredText: {
    color: '#B42318',
  },
  separator: {
    height: 1,
    backgroundColor: '#EDF0F4',
    marginVertical: 14,
  },
  info: {
    fontSize: 13,
    color: '#475467',
    marginBottom: 8,
    lineHeight: 19,
  },
  progressBackground: {
    height: 7,
    backgroundColor: '#E9EDF3',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#367BF5',
    borderRadius: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#16834A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#C93636',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  expiredMessage: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 19,
  },
  spinner: {
    marginTop: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#667085',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#172033',
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 21,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#475467',
    lineHeight: 20,
    marginBottom: 8,
  },
  reasonInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    color: '#172033',
  },
  characterCount: {
    textAlign: 'right',
    color: '#667085',
    fontSize: 12,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '600',
  },
});
