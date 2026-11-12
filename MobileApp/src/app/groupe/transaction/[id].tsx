import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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

import { requestTransaction } from '../../../services/groupService';

const LIME = '#c6f45a';
const DARK = '#111827';

type Field = 'amount' | 'phone' | 'reason' | null;

export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<Field>(null);

  const parsedAmount = Number(amount.replace(',', '.'));
  const amountValid = amount.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const canSubmit =
    amountValid && phoneNumber.trim().length > 0 && reason.trim().length > 0 && !loading;

  const close = () => {
    if (loading) return;
    router.back();
  };

  const handleSubmit = async () => {
    if (!amountValid) {
      Alert.alert('Erreur', 'Saisis un montant valide.');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Erreur', 'Saisis le numéro du bénéficiaire.');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Erreur', 'Indique le motif de la transaction.');
      return;
    }

    if (!id || !Number.isInteger(Number(id))) {
      Alert.alert('Erreur', 'Identifiant du groupe invalide.');
      return;
    }

    try {
      setLoading(true);

      const result = await requestTransaction(
        Number(id),
        phoneNumber.trim(),
        parsedAmount,
        reason.trim()
      );

      Alert.alert(
        'Demande envoyée',
        `Ta demande a été enregistrée.\nRéférence : ${result.reference}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error(
        'Erreur de transaction :',
        error.response?.data ?? error.message
      );

      Alert.alert(
        'Erreur',
        error.response?.data?.detail ??
          error.response?.data?.message ??
          'Impossible d’envoyer la demande de transaction.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
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
                <Text style={styles.eyebrow}>NOUVELLE TRANSACTION</Text>
                <Text style={styles.title}>Demander une transaction</Text>
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
              Renseignez le montant et le bénéficiaire. La demande sera soumise
              aux validateurs du groupe.
            </Text>

            {/* Montant */}
            <Text style={styles.label}>Montant</Text>
            <TextInput
              style={[styles.input, styles.amountInput, focused === 'amount' && styles.inputFocused]}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              value={amount}
              onChangeText={setAmount}
              onFocus={() => setFocused('amount')}
              onBlur={() => setFocused(null)}
              keyboardType="decimal-pad"
              editable={!loading}
            />

            {/* Bénéficiaire */}
            <Text style={styles.label}>Téléphone du bénéficiaire</Text>
            <TextInput
              style={[styles.input, focused === 'phone' && styles.inputFocused]}
              placeholder="Numéro de téléphone"
              placeholderTextColor="#9ca3af"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
              keyboardType="phone-pad"
              editable={!loading}
            />

            {/* Motif */}
            <Text style={styles.label}>Motif de la transaction</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                focused === 'reason' && styles.inputFocused,
              ]}
              placeholder="Explique le motif de la transaction..."
              placeholderTextColor="#9ca3af"
              value={reason}
              onChangeText={setReason}
              onFocus={() => setFocused('reason')}
              onBlur={() => setFocused(null)}
              multiline
              textAlignVertical="top"
              maxLength={500}
              editable={!loading}
            />
            <Text style={styles.counter}>{reason.length}/500</Text>

            {!canSubmit && !loading && (
              <Text style={styles.hint}>
                Remplissez tous les champs pour continuer.
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
    maxHeight: '90%',
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
  headerText: { flex: 1, paddingRight: 12 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: '#6b7280' },
  title: { fontSize: 26, fontWeight: '800', color: DARK, marginTop: 6 },
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
    marginBottom: 12,
  },

  label: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: DARK,
  },
  inputFocused: { borderColor: LIME },
  amountInput: { fontSize: 22, fontWeight: '800' },
  textArea: { minHeight: 110 },
  counter: { textAlign: 'right', fontSize: 12, color: '#9ca3af', marginTop: 6 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 10 },

  submitButton: {
    backgroundColor: '#d1d5db',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonActive: { backgroundColor: DARK },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});