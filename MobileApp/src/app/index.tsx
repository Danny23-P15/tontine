import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {

  const { user, logout } = useAuth();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accueil de Valideo</Text>

      <Pressable style={styles.button} onPress={() => router.push('/login')}>
        <Text style={styles.buttonText}>Se connecter</Text>
      </Pressable>

      <Pressable onPress={logout}>
        <Text>Déconnexion</Text>
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 24,
  },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  button: {
    marginTop: 20,
    backgroundColor: 'blue',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 5,
  },
  buttonText: { color: 'white', fontWeight: '600' },
});