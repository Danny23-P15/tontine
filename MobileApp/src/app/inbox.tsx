import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getNotificationInbox } from '../services/notificationService';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  created_at: string;
  source_type: string;
};

type InboxResponse = {
  count: number;
  results: NotificationItem[];
};

const LIME = '#c6f45a';
const DARK = '#111827';
const BG = '#f6f5f0';

// Couleurs des icônes, alternées d'une notification à l'autre
const ICON_COLORS = [
  { bg: '#e9defa', fg: '#6d4bc4' },
  { bg: '#e3f5b8', fg: '#4d7c0f' },
  { bg: '#fde3cf', fg: '#c2570c' },
  { bg: '#dbeafe', fg: '#1d4ed8' },
];

// L'icône dépend du type de source de la notification
const getSourceIcon = (source?: string): keyof typeof Ionicons.glyphMap => {
  const type = (source ?? '').toUpperCase();

  if (type.includes('TRANSACTION')) return 'receipt-outline';
  if (type.includes('VALIDATOR')) return 'person-outline';
  if (type.includes('GROUP')) return 'people-outline';
  if (type.includes('OPERATION')) return 'swap-horizontal-outline';

  return 'notifications-outline';
};

const formatRelativeDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return 'À l’instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

export default function InboxScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const data: InboxResponse = await getNotificationInbox();

      setNotifications(data.results ?? []);
      setCount(data.count ?? 0);
    } catch (err: any) {
      console.error('Erreur Inbox :', err);

      setError(
        err.response?.data?.detail ||
          'Impossible de charger les notifications.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

useEffect(() => {
  let isMounted = true;

  const fetchNotifications = async () => {
    if (!isMounted) return;
    await loadNotifications();
  };

  void fetchNotifications();

  return () => {
    isMounted = false;
  };
}, [loadNotifications]);

  const renderNotification = ({
    item,
    index,
  }: {
    item: NotificationItem;
    index: number;
  }) => {
    const color = ICON_COLORS[index % ICON_COLORS.length];
    const isFirst = index === 0;
    const isLast = index === notifications.length - 1;

    return (
      <View
        style={[
          styles.row,
          isFirst && styles.rowFirst,
          isLast && styles.rowLast,
          !isLast && styles.rowBorder,
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: color.bg }]}>
          <Ionicons name={getSourceIcon(item.source_type)} size={22} color={color.fg} />
        </View>

        <View style={styles.rowBody}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.date}>{formatRelativeDate(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  const countLabel =
    count === 0
      ? 'Aucune notification'
      : `${count} notification${count > 1 ? 's' : ''}`;

  const Header = (
    <View>
      {/* Bandeau vert */}
      <View style={styles.hero}>
        <View style={styles.heroCircle} />
        <Text style={styles.heroEyebrow}>VOTRE ACTIVITÉ</Text>
        <Text style={styles.heroTitle}>Restez au courant.</Text>
        <Text style={styles.heroSubtitle}>
          Suivez les demandes, validations et activités de vos groupes.
        </Text>
      </View>

      {/* Compteur */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{countLabel}</Text>
        <Pressable
          onPress={() => loadNotifications(true)}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.refreshText}>Actualiser</Text>
        </Pressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={DARK} />
        <Text style={styles.loadingText}>Chargement des notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Barre du haut */}
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
        <Text style={styles.topBarTitle}>Notifications</Text>
        <View style={styles.topBarSide} />
      </View>

      <FlatList
        data={error ? [] : notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotification}
        ListHeaderComponent={Header}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotifications(true)}
            colors={[DARK]}
            tintColor={DARK}
          />
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.stateBox}>
              <Ionicons name="alert-circle-outline" size={30} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => loadNotifications()}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stateBox}>
              <Ionicons name="notifications-off-outline" size={30} color="#9ca3af" />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptyMessage}>
                Vos notifications apparaîtront ici.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 13 },
  listContent: { paddingBottom: 40, flexGrow: 1 },

  // ----- Barre du haut -----
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 18,
    backgroundColor: BG,
  },
  topBarSide: { width: 60, alignItems: 'flex-start' },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ece9df',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ----- Hero -----
  hero: {
    backgroundColor: LIME,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 34,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    right: -60,
    bottom: -60,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 22,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#3f4a1f',
    marginBottom: 10,
  },
  heroTitle: { fontSize: 32, fontWeight: '800', color: DARK, marginBottom: 10 },
  heroSubtitle: { fontSize: 15, lineHeight: 22, color: '#3f4a1f', maxWidth: 280 },

  // ----- Compteur -----
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 18,
    marginBottom: 12,
  },
  countText: { fontSize: 13, fontWeight: '700', color: DARK },
  refreshText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },

  // ----- Lignes (une seule carte visuelle) -----
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#ece9df',
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0eee6',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 4 },
  message: { fontSize: 13, lineHeight: 19, color: '#4b5563' },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 8 },

  // ----- États vide / erreur -----
  stateBox: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: DARK },
  emptyMessage: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  errorText: { color: '#dc2626', textAlign: 'center', fontSize: 14 },
  retryButton: {
    backgroundColor: DARK,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 6,
  },
  retryText: { color: '#ffffff', fontWeight: '700' },
});