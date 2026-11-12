import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type MainNavigationProps = {
  active: 'home' | 'requests' | 'profile';
};

const ITEMS = [
  { key: 'home', label: 'Accueil', icon: 'home-outline', route: '/groups' },
  {
    key: 'requests',
    label: 'Demandes',
    icon: 'paper-plane-outline',
    route: '/operations/initiated',
  },
  { key: 'profile', label: 'Profil', icon: 'person-outline', route: '/profile' },
  { key: 'transactions', label: 'Transactions', icon: 'card-outline', route: undefined },
] as const;

export default function MainNavigation({ active }: MainNavigationProps) {
  return (
    <View style={styles.container}>
      {ITEMS.map((item) => {
        const selected = item.key === active;
        const disabled = item.key === 'transactions';

        return (
          <Pressable
            key={item.key}
            style={styles.item}
            onPress={() => {
              if (item.route) router.push(item.route);
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected, disabled }}
          >
            <Ionicons
              name={item.icon}
              size={21}
              color={disabled ? '#a8a8a0' : selected ? '#111827' : '#6b7280'}
            />
            <Text
              style={[
                styles.label,
                selected && styles.selectedLabel,
                disabled && styles.disabledLabel,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e8e6dc',
    backgroundColor: '#ffffff',
    paddingTop: 10,
    paddingBottom: 14,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: { color: '#6b7280', fontSize: 11, fontWeight: '500' },
  selectedLabel: { color: '#111827', fontWeight: '700' },
  disabledLabel: { color: '#a8a8a0' },
});
