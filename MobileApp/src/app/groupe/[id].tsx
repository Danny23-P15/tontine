import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getGroupDetail } from '../../services/groupDetailService';
import {
  getGroupBalance,
  requestAddValidator,
  requestDeleteGroup,
  requestRemoveValidator,
} from '../../services/groupService';

type Member = {
  full_name: string;
  phone_number: string;
  cin: string;
  role: string;
  joined_at: string;
};

type GroupDetail = {
  id: number;
  group_name: string;
  quorum: number;
  is_active: boolean;
  created_at: string;
  me: {
    role: string;
  };
  members: Member[];
  pending_deletion: boolean;
  has_pending_operations: boolean;
};

type ManageTab = 'add' | 'remove';

const LIME = '#c6f45a';
const DARK = '#111827';
const BG = '#f6f5f0';

// Couleurs des avatars, alternées d'un membre à l'autre
const AVATAR_COLORS = [
  { bg: '#e3f5b8', fg: '#4d7c0f' },
  { bg: '#e9defa', fg: '#6d4bc4' },
  { bg: '#fde3cf', fg: '#c2570c' },
  { bg: '#dbeafe', fg: '#1d4ed8' },
];

const getInitials = (fullName?: string) => {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Solde
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [groupBalance, setGroupBalance] = useState<unknown>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');

  // Suppression du groupe
  const [deletingGroup, setDeletingGroup] = useState(false);

  // Feuille "Gérer le groupe"
  const [manageVisible, setManageVisible] = useState(false);
  const [manageTab, setManageTab] = useState<ManageTab>('add');
  const [validatorPhone, setValidatorPhone] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [addingValidator, setAddingValidator] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [removingPhone, setRemovingPhone] = useState<string | null>(null);

  const loadGroupBalance = async () => {
    if (!id) {
      setBalanceError('Identifiant du groupe introuvable.');
      return;
    }

    try {
      setBalanceLoading(true);
      setBalanceError('');
      setGroupBalance(await getGroupBalance(Number(id)));
    } catch (err) {
      console.error('Erreur de chargement du solde du groupe :', err);
      setBalanceError('Impossible de charger le solde. Vérifie ta connexion.');
    } finally {
      setBalanceLoading(false);
    }
  };

  const openBalanceModal = () => {
    setBalanceModalVisible(true);
    loadGroupBalance();
  };

  const openManage = () => {
    setManageTab('add');
    setValidatorPhone('');
    setMemberToRemove(null);
    setDropdownOpen(false);
    setManageVisible(true);
  };

  const closeManage = () => {
    if (addingValidator || removingPhone) return;
    setManageVisible(false);
    setDropdownOpen(false);
  };

  const switchTab = (tab: ManageTab) => {
    setManageTab(tab);
    setDropdownOpen(false);
  };

  const handleAddValidator = async () => {
    const phone = validatorPhone.trim();

    if (!phone) {
      Alert.alert('Champ obligatoire', 'Saisis le numéro du validateur.');
      return;
    }

    if (!id || !group) {
      Alert.alert('Erreur', 'Le groupe est introuvable.');
      return;
    }

    try {
      setAddingValidator(true);

      const result = await requestAddValidator(Number(id), phone);

      setValidatorPhone('');
      Alert.alert(
        'Demande envoyée',
        result.detail ?? 'La demande d’ajout a été envoyée.',
        [{ text: 'OK', onPress: () => setManageVisible(false) }]
      );
    } catch (err: any) {
      console.error(
        'Erreur lors de la demande d’ajout :',
        err.response?.data ?? err.message
      );

      const data = err.response?.data;
      const message =
        data?.detail ??
        data?.validator_phone_number?.[0] ??
        'Impossible d’envoyer la demande.';

      Alert.alert('Erreur', message);
    } finally {
      setAddingValidator(false);
    }
  };

  const handleRemoveValidator = async () => {
    if (!memberToRemove) {
      Alert.alert('Champ obligatoire', 'Sélectionne un membre à supprimer.');
      return;
    }

    try {
      setRemovingPhone(memberToRemove.phone_number);

      const result = await requestRemoveValidator(
        Number(id),
        memberToRemove.phone_number
      );

      setMemberToRemove(null);
      Alert.alert(
        'Demande envoyée',
        result.detail ?? 'La demande de suppression a été envoyée.',
        [{ text: 'OK', onPress: () => setManageVisible(false) }]
      );
    } catch (err: any) {
      console.error(
        'Erreur de demande de suppression :',
        err.response?.data ?? err.message
      );

      Alert.alert(
        'Erreur',
        err.response?.data?.detail ??
          'Impossible d’envoyer la demande de suppression.'
      );
    } finally {
      setRemovingPhone(null);
    }
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Demander la suppression',
      `Voulez-vous vraiment demander la suppression du groupe "${group?.group_name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            if (!group || deletingGroup) return;

            try {
              setDeletingGroup(true);

              const result = await requestDeleteGroup(group.id);

              Alert.alert(
                'Demande envoyée',
                result?.message ??
                  'La demande de suppression a été envoyée aux validateurs.'
              );

              const updatedGroup = await getGroupDetail(group.id);
              setGroup(updatedGroup);
            } catch (error: any) {
              console.error(
                'Erreur de demande de suppression :',
                error.response?.data ?? error.message
              );

              Alert.alert(
                'Erreur',
                error.response?.data?.message ??
                  'Impossible d’envoyer la demande de suppression.'
              );
            } finally {
              setDeletingGroup(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const loadGroup = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getGroupDetail(Number(id));
        setGroup(data);
      } catch (err) {
        console.error('Erreur de chargement du groupe :', err);
        setError(
          'Impossible de charger les détails du groupe. Vérifie ta connexion.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadGroup();
    } else {
      setError('Identifiant du groupe introuvable.');
      setLoading(false);
    }
  }, [id]);

  const formatDate = (date: string) => {
    if (!date) return 'Non disponible';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Non disponible';
    }

    return parsedDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={DARK} />
        <Text style={styles.helper}>Chargement du groupe...</Text>
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.error}>{error || 'Groupe introuvable.'}</Text>

        <Pressable style={styles.darkButton} onPress={() => router.back()}>
          <Text style={styles.darkButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const isInitiator = group.me.role === 'INITIATOR';
  const removableMembers = group.members.filter((m) => m.role !== 'INITIATOR');
  const canSubmitAdd = validatorPhone.trim().length > 0 && !addingValidator;
  const canSubmitRemove = !!memberToRemove && !removingPhone;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Bandeau vert ===== */}
        <View style={styles.hero}>
          <View style={styles.heroCircle} />

          {/* Barre du haut : retour / titre / Gérer */}
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

            <Text style={styles.topBarTitle}>Détails du groupe</Text>

            <View style={[styles.topBarSide, styles.topBarSideRight]}>
              {isInitiator && (
                <Pressable
                  onPress={openManage}
                  style={styles.manageButton}
                  accessibilityRole="button"
                  accessibilityLabel="Gérer le groupe"
                >
                  <Text style={styles.manageButtonText}>Gérer</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.heroIcon}>
            <Ionicons name="people-outline" size={34} color="#ffffff" />
          </View>

          <Text style={styles.heroEyebrow}>
            {group.is_active ? 'GROUPE ACTIF' : 'GROUPE INACTIF'}
          </Text>
          <Text style={styles.heroTitle}>{group.group_name}</Text>
          <Text style={styles.heroDate}>
            Créé le {formatDate(group.created_at)}
          </Text>
        </View>

        {/* ===== Statistiques ===== */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{group.members.length}</Text>
            <Text style={styles.statLabel}>Membres</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{group.quorum}</Text>
            <Text style={styles.statLabel}>Quorum</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValueSmall}>
              {group.has_pending_operations ? 'En cours' : 'Aucune'}
            </Text>
            <Text style={styles.statLabel}>Opérations</Text>
          </View>
        </View>

        {/* ===== Nouvelle transaction ===== */}
{isInitiator && group.is_active && (
  <View style={styles.transactionCard}>
    <View style={styles.transactionIcon}>
      <Ionicons name="receipt-outline" size={20} color={LIME} />
    </View>

    <View style={styles.transactionInfo}>
      <Text style={styles.transactionTitle}>Nouvelle transaction</Text>
      <Text style={styles.transactionSubtitle}>
        Soumettre une demande au quorum
      </Text>
    </View>

    <Pressable
      style={styles.transactionButton}
      onPress={() => router.push(`/groupe/transaction/${group.id}`)}
      accessibilityRole="button"
    >
      <Text style={styles.transactionButtonText}>Demander</Text>
    </Pressable>
  </View>
)}

        {/* ===== Membres ===== */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionLabel}>PARTICIPANTS</Text>
            <Text style={styles.sectionTitle}>Les membres</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{group.members.length}</Text>
          </View>
        </View>

        {group.members.length === 0 ? (
          <Text style={styles.helper}>Aucun membre dans ce groupe.</Text>
        ) : (
          <View style={styles.membersCard}>
            {group.members.map((item, index) => {
              const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
              const isLast = index === group.members.length - 1;

              return (
                <View
                  key={item.phone_number}
                  style={[styles.memberRow, !isLast && styles.memberRowBorder]}
                >
                  <View style={[styles.avatar, { backgroundColor: color.bg }]}>
                    <Text style={[styles.avatarText, { color: color.fg }]}>
                      {getInitials(item.full_name)}
                    </Text>
                  </View>

                  <View style={styles.memberInfo}>
  <View style={styles.nameRow}>
    <Text style={styles.memberName} numberOfLines={1}>
      {item.full_name}
    </Text>
    {isInitiator && item.role === 'INITIATOR' && (
      <View style={styles.youTag}>
        <Text style={styles.youTagText}>Vous</Text>
      </View>
    )}
  </View>
  <Text style={styles.memberRole}>
    {item.role === 'INITIATOR' ? 'Administrateur' : 'Validateur'}
  </Text>
</View>
                </View>
              );
            })}
          </View>
        )}

        {/* ===== Solde ===== */}
<View style={styles.sectionHeader}>
  <View>
    <Text style={styles.sectionLabel}>FINANCES</Text>
    <Text style={styles.sectionTitle}>Solde du groupe</Text>
  </View>
  <Pressable onPress={openBalanceModal} style={styles.seeAllRow} hitSlop={8}>
    <Text style={styles.seeAllText}>Consulter</Text>
    <Ionicons name="chevron-forward" size={14} color={DARK} />
  </Pressable>
</View>

<Pressable
  style={[styles.membersCard, styles.memberRow]}
  onPress={openBalanceModal}
  accessibilityRole="button"
>
  <View style={[styles.avatar, { backgroundColor: '#fde3cf' }]}>
    <Ionicons name="wallet-outline" size={22} color="#c2570c" />
  </View>
  <View style={styles.memberInfo}>
    <Text style={styles.memberName}>Solde du groupe</Text>
    <Text style={styles.memberRole}>Appuyez pour voir le détail</Text>
  </View>
  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
</Pressable>

        {/* ===== État des opérations ===== */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionLabel}>SUIVI</Text>
            <Text style={styles.sectionTitle}>État des opérations</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <InfoRow
            label="Demande de suppression"
            value={group.pending_deletion ? 'En attente' : 'Aucune'}
          />
          <InfoRow
            label="Autres opérations en attente"
            value={group.has_pending_operations ? 'Oui' : 'Non'}
            last
          />
        </View>

        {/* ===== Suppression du groupe ===== */}
        {isInitiator && group.is_active && (
          <Pressable
            style={[styles.deleteGroupButton, deletingGroup && styles.disabled]}
            onPress={handleDeleteGroup}
            disabled={deletingGroup}
          >
            {deletingGroup ? (
              <ActivityIndicator color="#b91c1c" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                <Text style={styles.deleteGroupButtonText}>
                  Demander la suppression du groupe
                </Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>

      {/* ===== Feuille "Gérer le groupe" ===== */}
      <Modal
        visible={manageVisible}
        transparent
        animationType="slide"
        onRequestClose={closeManage}
      >
        <View style={styles.sheetRoot}>
          {/* Arrière-plan flouté : toucher pour fermer */}
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeManage} />
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
                {/* En-tête */}
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetEyebrow}>ADMINISTRATION</Text>
                    <Text style={styles.sheetTitle}>Gérer le groupe</Text>
                  </View>
                  <Pressable
                    style={styles.sheetClose}
                    onPress={closeManage}
                    accessibilityRole="button"
                    accessibilityLabel="Fermer"
                  >
                    <Ionicons name="close" size={20} color={DARK} />
                  </Pressable>
                </View>

                <Text style={styles.sheetSubtitle}>
                  Ajoutez ou retirez un membre de{' '}
                  <Text style={styles.sheetSubtitleBold}>{group.group_name}</Text>.
                </Text>

                {/* Onglets Ajouter / Supprimer */}
                <View style={styles.segmented}>
                  <Pressable
                    style={[
                      styles.segment,
                      manageTab === 'add' && styles.segmentActive,
                    ]}
                    onPress={() => switchTab('add')}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={manageTab === 'add' ? DARK : '#6b7280'}
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        manageTab === 'add' && styles.segmentTextActive,
                      ]}
                    >
                      Ajouter
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.segment,
                      manageTab === 'remove' && styles.segmentActive,
                    ]}
                    onPress={() => switchTab('remove')}
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color={manageTab === 'remove' ? '#dc2626' : '#6b7280'}
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        manageTab === 'remove' && styles.segmentTextDanger,
                      ]}
                    >
                      Supprimer
                    </Text>
                  </Pressable>
                </View>

                {manageTab === 'add' ? (
                  <>
                    <Text style={styles.fieldLabel}>Nouveau membre</Text>
                    <TextInput
                      style={[styles.sheetInput, phoneFocused && styles.sheetInputFocused]}
                      placeholder="Numéro de téléphone"
                      placeholderTextColor="#9ca3af"
                      value={validatorPhone}
                      onChangeText={setValidatorPhone}
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      editable={!addingValidator}
                    />
                    <Text style={styles.fieldHint}>
                      Une demande sera envoyée aux {group.quorum} validateur
                      {group.quorum > 1 ? 's' : ''} requis.
                    </Text>

                    <Pressable
                      style={[styles.submitButton, canSubmitAdd && styles.submitButtonActive]}
                      onPress={handleAddValidator}
                      disabled={!canSubmitAdd}
                    >
                      {addingValidator ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Demander</Text>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Membre à supprimer</Text>

                    <Pressable
                      style={[styles.dropdown, dropdownOpen && styles.sheetInputFocused]}
                      onPress={() => setDropdownOpen((open) => !open)}
                      disabled={!!removingPhone}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          !memberToRemove && styles.dropdownPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {memberToRemove
                          ? memberToRemove.full_name
                          : 'Sélectionner un membre'}
                      </Text>
                      <Ionicons
                        name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#6b7280"
                      />
                    </Pressable>

                    {dropdownOpen && (
                      <View style={styles.dropdownList}>
                        {removableMembers.length === 0 ? (
                          <Text style={styles.dropdownEmpty}>
                            Aucun membre à supprimer.
                          </Text>
                        ) : (
                          removableMembers.map((member, index) => (
                            <Pressable
                              key={member.phone_number}
                              style={[
                                styles.dropdownItem,
                                index < removableMembers.length - 1 &&
                                  styles.dropdownItemBorder,
                              ]}
                              onPress={() => {
                                setMemberToRemove(member);
                                setDropdownOpen(false);
                              }}
                            >
                              <Text style={styles.dropdownItemName}>
                                {member.full_name}
                              </Text>
                              <Text style={styles.dropdownItemPhone}>
                                {member.phone_number}
                              </Text>
                            </Pressable>
                          ))
                        )}
                      </View>
                    )}

                    <Text style={styles.fieldHint}>
                      Le membre restera dans le groupe jusqu’à validation de la
                      demande.
                    </Text>

                    <Pressable
                      style={[
                        styles.submitButton,
                        styles.submitButtonDangerOff,
                        canSubmitRemove && styles.submitButtonDanger,
                      ]}
                      onPress={handleRemoveValidator}
                      disabled={!canSubmitRemove}
                    >
                      {removingPhone ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Demander</Text>
                      )}
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ===== Modal du solde ===== */}
      <Modal
        visible={balanceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBalanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.balanceModal}>
            <Text style={styles.modalEyebrow}>SOLDE</Text>
            <Text style={styles.modalTitle}>{group.group_name}</Text>

            {balanceLoading ? (
              <View style={styles.balanceStatus}>
                <ActivityIndicator size="large" color={DARK} />
                <Text style={styles.helper}>Chargement du solde...</Text>
              </View>
            ) : balanceError ? (
              <View style={styles.balanceStatus}>
                <Text style={styles.error}>{balanceError}</Text>
                <Pressable style={styles.darkButton} onPress={loadGroupBalance}>
                  <Text style={styles.darkButtonText}>Réessayer</Text>
                </Pressable>
              </View>
            ) : (
              <BalanceDetails balance={groupBalance} />
            )}

            <Pressable
              style={styles.closeButton}
              onPress={() => setBalanceModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BalanceDetails({ balance }: { balance: unknown }) {
  if (balance === null || balance === undefined) {
    return <Text style={styles.helper}>Aucune donnée de solde disponible.</Text>;
  }

  if (typeof balance !== 'object') {
    return (
      <View style={styles.balanceAmountCard}>
        <Text style={styles.balanceLabel}>Solde</Text>
        <Text style={styles.balanceAmount}>{formatBalanceValue(balance)}</Text>
      </View>
    );
  }

  const entries = Array.isArray(balance)
    ? balance.map((value, index) => [String(index + 1), value] as const)
    : Object.entries(balance);

  if (entries.length === 0) {
    return <Text style={styles.helper}>Aucune donnée de solde disponible.</Text>;
  }

  const primaryEntry = entries.find(([key]) => /balance|solde/i.test(key));
  const detailEntries = entries.filter(([key]) => key !== primaryEntry?.[0]);

  return (
    <ScrollView
      style={styles.balanceDetails}
      contentContainerStyle={styles.balanceDetailsContent}
      showsVerticalScrollIndicator={false}
    >
      {primaryEntry ? (
        <View style={styles.balanceAmountCard}>
          <Text style={styles.balanceLabel}>
            {formatBalanceLabel(primaryEntry[0])}
          </Text>
          <Text style={styles.balanceAmount}>
            {formatBalanceValue(primaryEntry[1])}
          </Text>
        </View>
      ) : null}
      {detailEntries.map(([key, value], index) => (
        <InfoRow
          key={key}
          label={formatBalanceLabel(key)}
          value={formatBalanceValue(value)}
          last={index === detailEntries.length - 1}
        />
      ))}
    </ScrollView>
  );
}

function formatBalanceLabel(label: string) {
  return label
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function formatBalanceValue(value: unknown): string {
  if (value === null || value === undefined) return 'Non disponible';
  if (typeof value === 'number') return value.toLocaleString('fr-FR');
  if (typeof value === 'string' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value) ?? String(value);
}

function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: BG,
  },

  // ----- Hero -----
  hero: {
    backgroundColor: LIME,
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 56,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    right: -60,
    bottom: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 24,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 22,
  },
  topBarSide: { width: 84, alignItems: 'flex-start' },
  topBarSideRight: { alignItems: 'flex-end' },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageButton: {
    backgroundColor: DARK,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  manageButtonText: { color: LIME, fontSize: 14, fontWeight: '700' },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#3f4a1f',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: DARK,
    textAlign: 'center',
  },
  heroDate: { fontSize: 13, color: '#3f4a1f', marginTop: 8 },

  // ----- Stats -----
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: -32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ece9df',
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#ece9df' },
  statValue: { fontSize: 22, fontWeight: '800', color: DARK },
  statValueSmall: { fontSize: 15, fontWeight: '800', color: DARK, marginVertical: 4 },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  // ----- Raccourcis -----
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
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e6dc',
  },
  shortcutText: { fontSize: 14, fontWeight: '700', color: DARK },
  shortcutPrimary: { backgroundColor: DARK, borderColor: DARK },
  shortcutPrimaryText: { color: '#ffffff' },

  // ----- Sections -----
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#6b7280',
  },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: DARK, marginTop: 4 },
  countBadge: {
    minWidth: 30,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#e3f5b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { fontSize: 13, fontWeight: '700', color: '#4d7c0f' },

  // ----- Membres -----
  membersCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ece9df',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0eee6' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '700', color: DARK },
  memberRole: { fontSize: 12, color: '#6b7280', marginTop: 3 },

  // ----- Cartes d'informations -----
  formCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ece9df',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  infoRow: { paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0eee6' },
  infoLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  infoValue: { fontSize: 16, color: DARK, fontWeight: '700' },

  deleteGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 14,
  },
  deleteGroupButtonText: { color: '#b91c1c', fontSize: 15, fontWeight: '700' },

  // ----- Feuille "Gérer" -----
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
  sheetTitle: { fontSize: 28, fontWeight: '800', color: DARK, marginTop: 6 },
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
    lineHeight: 22,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 20,
  },
  sheetSubtitleBold: { fontWeight: '700', color: DARK },

  // Onglets
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 4,
    marginBottom: 22,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  segmentTextActive: { color: DARK },
  segmentTextDanger: { color: '#dc2626' },

  // Champs
  fieldLabel: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 8 },
  sheetInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: DARK,
  },
  sheetInputFocused: { borderColor: LIME },
  fieldHint: { fontSize: 12, color: '#6b7280', marginTop: 10 },

  // Liste déroulante
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownText: { flex: 1, fontSize: 16, color: DARK, marginRight: 8 },
  dropdownPlaceholder: { color: '#6b7280' },
  dropdownList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownItemName: { fontSize: 15, fontWeight: '600', color: DARK },
  dropdownItemPhone: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  dropdownEmpty: { padding: 14, fontSize: 13, color: '#6b7280' },

  // Boutons "Demander"
  submitButton: {
    backgroundColor: '#d1d5db',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 22,
  },
  submitButtonActive: { backgroundColor: DARK },
  submitButtonDangerOff: { backgroundColor: '#f1c4c4' },
  submitButtonDanger: { backgroundColor: '#dc2626' },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  // ----- États -----
  helper: { color: '#6b7280', marginTop: 10, textAlign: 'center' },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  disabled: { opacity: 0.6 },
  darkButton: {
    backgroundColor: DARK,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  darkButtonText: { color: '#ffffff', fontWeight: '700' },

  // ----- Modal solde -----
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
  },
  balanceModal: {
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#6b7280',
  },
  modalTitle: {
    color: DARK,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 18,
  },
  balanceStatus: { paddingVertical: 20, alignItems: 'center' },
  balanceDetails: { flexGrow: 0, marginBottom: 12 },
  balanceDetailsContent: { paddingBottom: 4 },
  balanceAmountCard: {
    backgroundColor: '#eef7d6',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  balanceLabel: { color: '#4d6b12', fontSize: 13, marginBottom: 6 },
  balanceAmount: { color: DARK, fontSize: 28, fontWeight: '800' },
  closeButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: { color: DARK, fontWeight: '700' },
    // ----- Carte "Nouvelle transaction" -----
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#eef7d6',
    borderWidth: 1,
    borderColor: '#d9eda6',
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: { flex: 1 },
  transactionTitle: { fontSize: 14, fontWeight: '800', color: DARK },
  transactionSubtitle: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  transactionButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionButtonText: { fontSize: 13, fontWeight: '700', color: DARK },

  // ----- Pastille "Vous" -----
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  youTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  youTagText: { fontSize: 10, fontWeight: '700', color: '#6b7280' },

  // ----- "Consulter" -----
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: DARK },
});