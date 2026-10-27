import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';

import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login(phoneNumber, password);

      console.log('Connexion réussie');
    } catch (error) {
      if (isAxiosError(error)) {
        console.log('Erreur de connexion :', {
          status: error.response?.status,
          message: error.message,
        });
      } else {
        console.log('Erreur de connexion :', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Écran de connexion</Text>

      <TextInput
        style={styles.input}
        placeholder="Numéro"
        keyboardType="number-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={styles.button}
        onPress={handleLogin}
      >
        <Text style={styles.buttonText}>
          Se connecter
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 24,
  },

  title: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
  },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    padding: 10,
    marginTop: 15,
    color: 'black',
  },

  button: {
    marginTop: 20,
    backgroundColor: 'blue',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 5,
  },

  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});