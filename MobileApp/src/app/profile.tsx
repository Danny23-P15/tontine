import { StyleSheet, Text, View } from 'react-native';
import MainNavigation from '../components/main-navigation';

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.message}>Cette page sera disponible prochainement.</Text>
      </View>
      <MainNavigation active="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f5f0' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f5f0',
    padding: 24,
  },
  title: { color: '#111827', fontSize: 24, fontWeight: '700' },
  message: { color: '#6b7280', fontSize: 15, marginTop: 8 },
});
