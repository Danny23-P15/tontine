
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';

import { getGroupDetail } from '../../services/groupDetailService';
import { requestAddValidator } from '../../services/groupService';



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

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validatorPhone, setValidatorPhone] = useState('');
  const [addingValidator, setAddingValidator] = useState(false);

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

    Alert.alert(
      'Demande envoyée',
      result.detail ?? 'La demande d’ajout a été envoyée.'
    );

    setValidatorPhone('');
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

    return parsedDate.toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Détail du groupe' }} />
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.helper}>Chargement du groupe...</Text>
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Détail du groupe' }} />
        <Text style={styles.error}>
          {error || 'Groupe introuvable.'}
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Détail du groupe' }} />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Retour aux groupes</Text>
        </Pressable>

        <View style={styles.headerCard}>
          <Text style={styles.groupName}>{group.group_name}</Text>

          <View
            style={[
              styles.badge,
              group.is_active ? styles.activeBadge : styles.inactiveBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                group.is_active ? styles.activeText : styles.inactiveText,
              ]}
            >
              {group.is_active ? 'Groupe actif' : 'Groupe inactif'}
            </Text>
          </View>

          <Text style={styles.date}>
            Créé le {formatDate(group.created_at)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Informations du groupe</Text>

        <View style={styles.infoCard}>
          <InfoRow
            label="Identifiant"
            value={String(group.id)}
          />
          <InfoRow
            label="Mon rôle"
            value={group.me.role === 'INITIATOR' ? 'Initiateur' : 'Validateur'}
          />
          <InfoRow
            label="Nombre de membres"
            value={String(group.members.length)}
          />
          <InfoRow
            label="Quorum requis"
            value={String(group.quorum)}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Membres ({group.members.length})
        </Text>

        {group.members.length === 0 ? (
          <Text style={styles.helper}>
            Aucun membre dans ce groupe.
          </Text>
        ) : (
          <FlatList
            data={group.members}
            keyExtractor={(item) => item.phone_number}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.memberCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {item.full_name}
                  </Text>
                  <Text style={styles.memberDetail}>
                    Téléphone : {item.phone_number}
                  </Text>
                  <Text style={styles.memberDetail}>
                    CIN : {item.cin || 'Non renseigné'}
                  </Text>
                  <Text style={styles.memberDetail}>
                    Rôle : {item.role === 'INITIATOR' ? 'Initiateur' : 'Validateur'}
                  </Text>
                  <Text style={styles.memberDetail}>
                    Membre depuis le {formatDate(item.joined_at)}
                  </Text>
                </View>
              </View>
            )}
          />
        )}

        {group.me.role === 'INITIATOR' && (
  <>
    <Text style={styles.sectionTitle}>
      Ajouter un validateur
    </Text>

    <View style={styles.infoCard}>
      <Text style={styles.formDescription}>
        Saisis le numéro de téléphone de la personne à ajouter.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Numéro de téléphone"
        value={validatorPhone}
        onChangeText={setValidatorPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        editable={!addingValidator}
      />

      <Pressable
        style={[
          styles.button,
          addingValidator && styles.disabledButton,
        ]}
        onPress={handleAddValidator}
        disabled={addingValidator}
      >
        {addingValidator ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Demander l'ajout
          </Text>
        )}
      </Pressable>
    </View>
  </>
)}

        <Text style={styles.sectionTitle}>État des opérations</Text>

        <View style={styles.infoCard}>
          <InfoRow
            label="Demande de suppression"
            value={group.pending_deletion ? 'En attente' : 'Aucune'}
          />
          <InfoRow
            label="Autres opérations en attente"
            value={group.has_pending_operations ? 'Oui' : 'Non'}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
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
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f3f4f6',
  },
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 14,
    marginBottom: 24,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeText: {
    color: '#166534',
  },
  inactiveText: {
    color: '#991b1b',
  },
  date: {
    color: '#6b7280',
    marginTop: 12,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  infoRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  memberCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#1d4ed8',
    fontWeight: 'bold',
    fontSize: 18,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  memberDetail: {
    color: '#4b5563',
    fontSize: 13,
    marginBottom: 4,
  },
  helper: {
    color: '#6b7280',
    marginTop: 10,
    textAlign: 'center',
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  formDescription: {
  color: '#64748B',
  fontSize: 14,
  marginBottom: 12,
},
input: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#CBD5E1',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 12,
  marginBottom: 12,
  color: '#172033',
},
button: {
  backgroundColor: '#2563EB',
  padding: 14,
  borderRadius: 8,
  alignItems: 'center',
},
buttonText: {
  color: '#FFFFFF',
  fontWeight: '700',
},
disabledButton: {
  opacity: 0.6,
},
});
