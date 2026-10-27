
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';

import { createGroupRequest } from '../services/groupCreationService';
import {
  searchValidators,
  type ValidatorSuggestion,
} from '../services/validatorService';



export default function CreerGroupeScreen() {
  const [groupName, setGroupName] = useState('');
  const [quorum, setQuorum] = useState('1');
  const [validators, setValidators] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [activeValidatorIndex, setActiveValidatorIndex] =
    useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<ValidatorSuggestion[]>([]);
  const [searchingValidators, setSearchingValidators] = useState(false);

  const addValidator = () => {
    if (validators.length >= 5) {
      Alert.alert('Limite atteinte', 'Tu peux ajouter au maximum 5 validateurs.');
      return;
    }

    setValidators((currentValidators) => [...currentValidators, '']);
  };

  const removeValidator = (index: number) => {
    if (validators.length === 1) {
      Alert.alert('Information', 'Au moins un validateur est requis.');
      return;
    }

    setValidators((currentValidators) =>
      currentValidators.filter((_, i) => i !== index)
    );
  };

  const updateValidator = (index: number, phone: string) => {
    setValidators((currentValidators) =>
      currentValidators.map((value, i) => (i === index ? phone : value))
    );
  };

  useEffect(() => {
    if (activeValidatorIndex === null || loading) {
      setSuggestions([]);
      setSearchingValidators(false);
      return;
    }

    const phone = validators[activeValidatorIndex]?.trim() ?? '';

    if (phone.length < 3) {
      setSuggestions([]);
      setSearchingValidators(false);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      setSearchingValidators(true);

      try {
        const results = await searchValidators(phone);

        if (!cancelled) {
          const otherPhones = validators
            .filter((_, index) => index !== activeValidatorIndex)
            .map((value) => value.trim());

          setSuggestions(
            results.filter((user) => !otherPhones.includes(user.phone_number))
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Erreur de recherche des validateurs :', error);
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSearchingValidators(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeValidatorIndex, validators, loading]);

  const selectValidator = (user: ValidatorSuggestion) => {
    if (activeValidatorIndex === null) {
      return;
    }

    if (
      validators.some(
        (phone, index) =>
          index !== activeValidatorIndex && phone.trim() === user.phone_number
      )
    ) {
      Alert.alert(
        'Validateur déjà sélectionné',
        'Cette personne figure déjà dans la liste.'
      );
      return;
    }

    updateValidator(activeValidatorIndex, user.phone_number);
    setSuggestions([]);
    setActiveValidatorIndex(null);
  };

  const handleSubmit = async () => {
    const trimmedName = groupName.trim();
    const quorumNumber = Number(quorum);
    const cleanedPhones = validators.map((phone) => phone.trim());

    if (!trimmedName) {
      Alert.alert('Champ obligatoire', 'Entre le nom du groupe.');
      return;
    }

    if (trimmedName.length > 100) {
      Alert.alert('Nom trop long', 'Le nom du groupe ne doit pas dépasser 100 caractères.');
      return;
    }

    if (!quorum.trim() || !Number.isInteger(quorumNumber) || quorumNumber < 1) {
      Alert.alert('Quorum invalide', 'Le quorum doit être un entier supérieur ou égal à 1.');
      return;
    }

    if (cleanedPhones.some((phone) => !phone)) {
      Alert.alert('Numéro manquant', 'Remplis le numéro de chaque validateur.');
      return;
    }

    if (new Set(cleanedPhones).size !== cleanedPhones.length) {
      Alert.alert('Doublon détecté', 'Chaque validateur doit avoir un numéro différent.');
      return;
    }

    if (quorumNumber > cleanedPhones.length) {
      Alert.alert(
        'Quorum invalide',
        'Le quorum ne peut pas dépasser le nombre de validateurs saisis.'
      );
      return;
    }

    setLoading(true);

    try {
      const result = await createGroupRequest({
        group_name: trimmedName,
        quorum: quorumNumber,
        validators: cleanedPhones.map((phone_number) => ({ phone_number })),
      });

      Alert.alert(
        'Demande envoyée',
        `Ta demande de création a été enregistrée.\nRéférence : ${result.temp_group_id}`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Erreur de création du groupe :', error);

      const data = error?.response?.data;
      const message =
        data?.message ||
        (typeof data === 'string' ? data : null) ||
        'Impossible d’envoyer la demande. Vérifie les informations et réessaie.';

      Alert.alert('Création impossible', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Créer un groupe' }} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Créer un groupe de validation</Text>
        <Text style={styles.subtitle}>
          Renseigne les informations et choisis les personnes qui devront
          valider la création du groupe.
        </Text>

        <Text style={styles.label}>Nom du groupe</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex. Groupe familial"
          value={groupName}
          onChangeText={setGroupName}
          maxLength={100}
          editable={!loading}
        />

        <Text style={styles.label}>Quorum requis</Text>
        <Text style={styles.hint}>
          Nombre de validateurs qui doivent accepter la demande.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ex. 2"
          value={quorum}
          onChangeText={setQuorum}
          keyboardType="number-pad"
          editable={!loading}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Validateurs</Text>
          <Text style={styles.counter}>{validators.length}/5</Text>
        </View>

        {validators.map((phone, index) => (
          <View key={index} style={styles.validatorInputContainer}>
  <Text style={styles.validatorLabel}>
    Validateur {index + 1}
  </Text>

  <TextInput
    style={styles.input}
    placeholder="Saisis un numéro de téléphone"
    value={phone}
    onChangeText={(value) => {
      updateValidator(index, value);
      setActiveValidatorIndex(index);
      setSuggestions([]);
    }}
    onFocus={() => setActiveValidatorIndex(index)}
    onBlur={() => {
      // On ne ferme pas immédiatement la liste :
      // l'utilisateur doit pouvoir toucher une suggestion.
    }}
    keyboardType="phone-pad"
    editable={!loading}
  />

  {activeValidatorIndex === index && phone.trim().length >= 3 && (
    <View style={styles.suggestionsContainer}>
      {searchingValidators ? (
        <View style={styles.suggestionMessage}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.suggestionMessageText}>
            Recherche des utilisateurs...
          </Text>
        </View>
      ) : suggestions.length > 0 ? (
        suggestions.map((user) => (
          <Pressable
            key={user.id}
            style={styles.suggestionItem}
            onPress={() => selectValidator(user)}
          >
            <Text style={styles.suggestionName}>
              {user.full_name}
            </Text>

            <Text style={styles.suggestionPhone}>
              {user.phone_number}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.noSuggestions}>
          Aucun utilisateur trouvé.
        </Text>
      )}
    </View>
  )}
</View>
        ))}

        {validators.length < 5 && (
          <Pressable
            style={styles.addButton}
            onPress={addValidator}
            disabled={loading}
          >
            <Text style={styles.addButtonText}>+ Ajouter un validateur</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Envoyer la demande</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6b7280',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  hint: {
    color: '#6b7280',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 18,
    color: '#111827',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    color: '#6b7280',
    marginBottom: 8,
  },
  validatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  validatorInputContainer: {
    flex: 1,
  },
  validatorLabel: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 6,
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 18,
  },
  removeButtonText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  addButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addButtonText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  suggestionsContainer: {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 10,
  marginTop: -14,
  marginBottom: 18,
  overflow: 'hidden',
},

suggestionItem: {
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
},

suggestionName: {
  color: '#111827',
  fontSize: 15,
  fontWeight: '600',
},

suggestionPhone: {
  color: '#6b7280',
  fontSize: 13,
  marginTop: 3,
},

suggestionMessage: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  padding: 14,
},

suggestionMessageText: {
  color: '#6b7280',
  fontSize: 13,
},

noSuggestions: {
  color: '#6b7280',
  padding: 14,
  fontSize: 13,
},
});
