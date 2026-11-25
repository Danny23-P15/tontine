import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import { router, Stack } from 'expo-router';
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

import { createGroupRequest } from '../services/groupCreationService';
import {
  searchValidators,
  type ValidatorSuggestion,
} from '../services/validatorService';

const LIME = '#c6f45a';
const DARK = '#111827';
const MAX_VALIDATORS = 5;

type AddedValidator = { phone_number: string; label: string };

export default function CreerGroupeScreen() {
  const [groupName, setGroupName] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [quorum, setQuorum] = useState(1);
  const [validators, setValidators] = useState<AddedValidator[]>([]);
  const [validatorInput, setValidatorInput] = useState('');
  const [suggestions, setSuggestions] = useState<ValidatorSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [loading, setLoading] = useState(false);

  // Recherche de validateurs (debounce 300 ms)
  useEffect(() => {
    const query = validatorInput.trim();
    const isInvalid = query.length < 3 || loading;
    let isActive = true;

    const timer = setTimeout(async () => {
      if (isInvalid) {
        setSuggestions([]);
        setSearchError('');
        setSearching(false);
        return;
      }

      setSearching(true);
      setSearchError('');

      try {
        const results = await searchValidators(query);
        if (isActive) {
          setSuggestions(results);
        }
      } catch (error) {
        console.error('Erreur de recherche des validateurs :', error);
        if (isActive) {
          setSuggestions([]);
          setSearchError('Impossible de rechercher des utilisateurs. Réessaie.');
        }
      } finally {
        if (isActive) {
          setSearching(false);
        }
      }
    }, isInvalid ? 0 : 300);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [validatorInput, loading]);

  const close = () => router.back();

  const addValidator = (phone: string, label?: string) => {
    const cleaned = phone.trim();
    if (!cleaned) return;

    if (validators.length >= MAX_VALIDATORS) {
      Alert.alert('Limite atteinte', 'Tu peux ajouter au maximum 5 validateurs.');
      return;
    }
    if (validators.some((v) => v.phone_number === cleaned)) {
      Alert.alert('Déjà ajouté', 'Cette personne figure déjà dans la liste.');
      return;
    }

    setValidators((current) => [
      ...current,
      { phone_number: cleaned, label: label || cleaned },
    ]);
    setValidatorInput('');
    setSuggestions([]);
  };

  const removeValidator = (phone: string) => {
    const remaining = validators.filter((v) => v.phone_number !== phone);
    setValidators(remaining);
    setQuorum((current) => Math.min(current, Math.max(1, remaining.length)));
  };

  const canSubmit = groupName.trim().length > 0 && validators.length > 0 && !loading;
  const maxQuorum = Math.max(1, validators.length);
  const effectiveQuorum = Math.min(quorum, maxQuorum);

  const handleSubmit = async () => {
    const trimmedName = groupName.trim();

    if (!trimmedName) {
      Alert.alert('Champ obligatoire', 'Entre le nom du groupe.');
      return;
    }
    if (trimmedName.length > 100) {
      Alert.alert('Nom trop long', 'Le nom du groupe ne doit pas dépasser 100 caractères.');
      return;
    }
    if (validators.length === 0) {
      Alert.alert('Validateurs manquants', 'Ajoute au moins un validateur.');
      return;
    }
    if (effectiveQuorum > validators.length) {
      Alert.alert('Quorum invalide', 'Le quorum ne peut pas dépasser le nombre de validateurs.');
      return;
    }

    setLoading(true);
    try {
      const result = await createGroupRequest({
        group_name: trimmedName,
        quorum: effectiveQuorum,
        validators: validators.map(({ phone_number }) => ({ phone_number })),
      });

      Alert.alert(
        'Demande envoyée',
        `Ta demande de création a été enregistrée.\nRéférence : ${result.temp_group_id}`,
        [{ text: 'OK', onPress: () => router.back() }]
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
    <View style={styles.root}>
      <Stack.Screen
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />

      {/* Arrière-plan flouté : toucher pour fermer */}
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </BlurView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* En-tête */}
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>NOUVEAU DÉPART</Text>
                <Text style={styles.title}>Créer un groupe</Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={20} color={DARK} />
              </Pressable>
            </View>

            <Text style={styles.subtitle}>
              Configurez le groupe et choisissez les personnes qui valideront
              les demandes.
            </Text>

            {/* Nom du groupe */}
            <Text style={styles.label}>Nom du groupe</Text>
            <TextInput
              style={[styles.input, nameFocused && styles.inputFocused]}
              placeholder="Ex. Groupe familial"
              placeholderTextColor="#9ca3af"
              value={groupName}
              onChangeText={setGroupName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              maxLength={100}
              editable={!loading}
            />

            {/* Quorum */}
            <View style={styles.quorumHeader}>
              <Text style={styles.label}>Quorum</Text>
              <Text style={styles.quorumValue}>
                {effectiveQuorum} validation{effectiveQuorum > 1 ? 's' : ''} requise{effectiveQuorum > 1 ? 's' : ''}
              </Text>
            </View>
            <Slider
              minimumValue={1}
              maximumValue={maxQuorum}
              step={1}
              value={effectiveQuorum}
              onValueChange={setQuorum}
              disabled={validators.length <= 1 || loading}
              minimumTrackTintColor={LIME}
              maximumTrackTintColor="#e5e7eb"
              thumbTintColor={LIME}
              style={styles.slider}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1</Text>
              <Text style={styles.sliderLabel}>{maxQuorum}</Text>
            </View>

            {/* Validateurs */}
            <Text style={[styles.label, { marginTop: 22 }]}>Validateurs à ajouter</Text>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, styles.addInput]}
                placeholder="Numéro de téléphone"
                placeholderTextColor="#9ca3af"
                value={validatorInput}
                onChangeText={setValidatorInput}
                keyboardType="phone-pad"
                editable={!loading}
              />
              <Pressable
                style={[
                  styles.addButton,
                  validatorInput.trim().length > 0 && styles.addButtonActive,
                ]}
                onPress={() => addValidator(validatorInput)}
                disabled={validatorInput.trim().length === 0 || loading}
              >
                <Text style={styles.addButtonText}>Ajouter</Text>
              </Pressable>
            </View>

            {/* Suggestions */}
            {validatorInput.trim().length >= 3 && (
              <View style={styles.suggestions}>
                {searching ? (
                  <View style={styles.suggestionMessage}>
                    <ActivityIndicator size="small" color={DARK} />
                    <Text style={styles.suggestionMessageText}>
                      Recherche des utilisateurs...
                    </Text>
                  </View>
                ) : suggestions.length > 0 ? (
                  suggestions.map((user) => (
                    <Pressable
                      key={user.id}
                      style={styles.suggestionItem}
                      onPress={() => addValidator(user.phone_number, user.full_name)}
                    >
                      <Text style={styles.suggestionName}>{user.full_name}</Text>
                      <Text style={styles.suggestionPhone}>{user.phone_number}</Text>
                    </Pressable>
                  ))
                ) : searchError ? (
                  <Text style={styles.noSuggestions}>{searchError}</Text>
                ) : (
                  <Text style={styles.noSuggestions}>Aucun utilisateur trouvé.</Text>
                )}
              </View>
            )}

            {/* Validateurs ajoutés */}
            {validators.length > 0 && (
              <View style={styles.chips}>
                {validators.map((v) => (
                  <View key={v.phone_number} style={styles.chip}>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {v.label}
                    </Text>
                    <Pressable
                      onPress={() => removeValidator(v.phone_number)}
                      hitSlop={8}
                      disabled={loading}
                    >
                      <Ionicons name="close-circle" size={18} color="#6b7280" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {validators.length === 0 && (
              <Text style={styles.hint}>
                Ajoutez au moins un validateur pour continuer.
              </Text>
            )}

            {/* Bouton principal */}
            <Pressable
              style={[styles.submitButton, canSubmit && styles.submitButtonActive]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Demander</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
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
  content: { paddingHorizontal: 22, paddingBottom: 34 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: '#6b7280' },
  title: { fontSize: 28, fontWeight: '800', color: DARK, marginTop: 6 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 22,
  },

  label: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 8 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: DARK,
  },
  inputFocused: { borderColor: LIME },

  quorumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
  },
  quorumValue: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  slider: { width: '100%', height: 32 },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  sliderLabel: { fontSize: 12, color: '#6b7280' },

  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addInput: { flex: 1 },
  addButton: {
    backgroundColor: '#eef7d6',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
  },
  addButtonActive: { backgroundColor: LIME },
  addButtonText: { fontSize: 14, fontWeight: '700', color: '#4d6b12' },

  suggestions: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    marginTop: 10,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionName: { fontSize: 15, fontWeight: '600', color: DARK },
  suggestionPhone: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  suggestionMessage: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  suggestionMessageText: { color: '#6b7280', fontSize: 13 },
  noSuggestions: { color: '#6b7280', padding: 14, fontSize: 13 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 20,
    maxWidth: '100%',
  },
  chipText: { fontSize: 14, color: DARK, fontWeight: '500', flexShrink: 1 },

  hint: { fontSize: 12, color: '#6b7280', marginTop: 10 },

  submitButton: {
    backgroundColor: '#d1d5db',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 22,
  },
  submitButtonActive: { backgroundColor: DARK },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});