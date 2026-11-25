
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import {
  getGroupStatistics,
  StatisticsData,
  StatisticsPeriod,
} from '../../services/statisticsService';

const LIME = '#c6f45a';
const DARK = '#111827';
const BG = '#f6f5f0';
const MUTED = '#737373';

const PERIODS: { label: string; value: StatisticsPeriod }[] = [
  { label: 'Jour', value: 'day' },
  { label: 'Semaine', value: 'week' },
  { label: 'Mois', value: 'month' },
];

const formatAr = (amount: number) => {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(amount)} Ar`;
};

export default function GroupStatisticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: screenWidth } = useWindowDimensions();

  const [period, setPeriod] = useState<StatisticsPeriod>('day');
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Récupération des statistiques à chaque changement de période
  useEffect(() => {
    let active = true;

    const loadStatistics = async () => {
      if (!id || Number.isNaN(Number(id))) {
        setError('Identifiant du groupe invalide.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const data = await getGroupStatistics(Number(id), period);

        if (active) {
          setStatistics(data);
        }
      } catch (err: any) {
        console.error(
          'Erreur de chargement des statistiques :',
          err.response?.data ?? err.message
        );

        if (active) {
          setError(
            err.response?.data?.detail ??
              'Impossible de charger les statistiques. Vérifie ta connexion.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadStatistics();

    return () => {
      active = false;
    };
  }, [id, period]);

  // Conversion des montants reçus sous forme de chaînes en nombres
  const chartData = useMemo(() => {
    if (!statistics) return [];

    return statistics.chart.data.map((item, index) => {
      let label = item.label;

      // Pour éviter de surcharger l'axe horizontal
      if (period === 'day' && index % 6 !== 0) {
        label = '';
      }

      if (period === 'month' && index % 5 !== 0 && index !== statistics.chart.data.length - 1) {
        label = '';
      }

      return {
        value: Number(item.total) || 0,
        label,
        frontColor: LIME,
      };
    });
  }, [statistics, period]);

  // Somme des montants de tous les intervalles affichés
  const totalAmount = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  const maxChartValue = Math.max(
    1,
    ...chartData.map((item) => item.value)
  );

  const chartWidth = Math.max(
    screenWidth - 64,
    chartData.length * 38
  );

  const retry = () => {
    // Le changement temporaire de période n'est pas nécessaire :
    // le bouton relance simplement le chargement en remontant l'écran.
    setPeriod((current) => current);
    setLoading(true);
    setError('');
    getGroupStatistics(Number(id), period)
      .then(setStatistics)
      .catch((err) => {
        console.error('Erreur de rechargement :', err);
        setError('Impossible de recharger les statistiques.');
      })
      .finally(() => setLoading(false));
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* En-tête */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Statistiques</Text>
          <Text style={styles.headerSubtitle}>
            Vue financière du groupe
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="stats-chart"
            size={22}
            color={DARK}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={DARK} />
          <Text style={styles.loadingText}>
            Chargement des statistiques...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color="#dc2626"
          />

          <Text style={styles.errorTitle}>
            Une erreur est survenue
          </Text>

          <Text style={styles.errorText}>{error}</Text>

          <Pressable style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryButtonText}>
              Réessayer
            </Text>
          </Pressable>
        </View>
      ) : statistics ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Nom du groupe */}
          <View style={styles.groupHeader}>
            <Text style={styles.groupLabel}>GROUPE</Text>
            <Text style={styles.groupName}>
              {statistics.group_name}
            </Text>
          </View>

          {/* Cartes statistiques */}
          <View style={styles.cardsGrid}>
            <View style={styles.statCard}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={21}
                  color="#4d7c0f"
                />
              </View>

              <Text style={styles.statValue}>
                {statistics.successful_transactions}
              </Text>

              <Text style={styles.statLabel}>
                Transactions réussies
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.cardIcon, styles.failedIcon]}>
                <Ionicons
                  name="close-circle"
                  size={21}
                  color="#dc2626"
                />
              </View>

              <Text style={styles.statValue}>
                {statistics.failed_transactions}
              </Text>

              <Text style={styles.statLabel}>
                Transactions refusées
              </Text>
            </View>
          </View>

          {/* Taux de réussite */}
          <View style={styles.successCard}>
            <View style={styles.successTop}>
              <View>
                <Text style={styles.successLabel}>
                  Taux de réussite
                </Text>
                <Text style={styles.successValue}>
                  {statistics.success_rate.toLocaleString('fr-FR')} %
                </Text>
              </View>

              <View style={styles.successIcon}>
                <Ionicons
                  name="trending-up"
                  size={25}
                  color={DARK}
                />
              </View>
            </View>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressValue,
                  {
                    width: `${Math.min(
                      100,
                      Math.max(0, statistics.success_rate)
                    )}%`,
                  },
                ]}
              />
            </View>

            <Text style={styles.successDescription}>
              {statistics.successful_transactions} transaction(s) réussie(s)
              sur {statistics.total_transactions}
            </Text>
          </View>

          {/* Graphique */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>
                  Évolution des montants
                </Text>
                <Text style={styles.chartSubtitle}>
                  Montants des transactions exécutées
                </Text>
              </View>

              <View style={styles.chartIcon}>
                <Ionicons
                  name="bar-chart"
                  size={20}
                  color={DARK}
                />
              </View>
            </View>

            {/* Sélection de la période */}
            <View style={styles.periodSelector}>
              {PERIODS.map((item) => {
                const selected = period === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setPeriod(item.value)}
                    style={[
                      styles.periodButton,
                      selected && styles.periodButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        selected && styles.periodTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Montant total */}
            <View style={styles.totalAmountContainer}>
              <Text style={styles.totalAmountLabel}>
                Montant total sur la période
              </Text>

              <Text style={styles.totalAmountValue}>
                {formatAr(totalAmount)}
              </Text>
            </View>

            {/* BarChart */}
            {chartData.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chartScroll}
              >
                <BarChart
                  data={chartData}
                  width={chartWidth}
                  height={210}
                  barWidth={18}
                  spacing={20}
                  initialSpacing={12}
                  endSpacing={12}
                  maxValue={maxChartValue * 1.15}
                  noOfSections={4}
                  roundedTop
                  hideRules
                  hideYAxisText
                  xAxisColor="#e5e7eb"
                  yAxisColor="transparent"
                  xAxisLabelTextStyle={styles.axisLabel}
                  isAnimated
                />
              </ScrollView>
            ) : (
              <View style={styles.emptyChart}>
                <Ionicons
                  name="bar-chart-outline"
                  size={38}
                  color="#9ca3af"
                />
                <Text style={styles.emptyChartText}>
                  Aucune donnée disponible pour cette période.
                </Text>
              </View>
            )}

            <View style={styles.chartLegend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>
                Montant des transactions (Ar)
              </Text>
            </View>
          </View>

          {/* Nombre total */}
          <View style={styles.totalTransactionsCard}>
            <View style={styles.totalTransactionsIcon}>
              <Ionicons
                name="receipt-outline"
                size={23}
                color={DARK}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.totalTransactionsLabel}>
                Total des transactions réussies
              </Text>
              <Text style={styles.totalTransactionsValue}>
                {statistics.total_transactions}
              </Text>
            </View>
          </View>

          <Text style={styles.footerText}>
            Les montants affichés correspondent aux transactions
            effectivement exécutées.
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK,
  },
  headerSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: LIME,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 35,
  },
  groupHeader: {
    marginTop: 8,
    marginBottom: 20,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: MUTED,
    letterSpacing: 1.2,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK,
    marginTop: 5,
  },

  cardsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    minHeight: 142,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eaf5d6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  failedIcon: {
    backgroundColor: '#fee2e2',
  },
  statValue: {
    fontSize: 27,
    fontWeight: '800',
    color: DARK,
  },
  statLabel: {
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
    lineHeight: 17,
  },

  successCard: {
    backgroundColor: DARK,
    borderRadius: 20,
    padding: 19,
    marginBottom: 16,
  },
  successTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successLabel: {
    color: '#d1d5db',
    fontSize: 13,
  },
  successValue: {
    color: '#ffffff',
    fontSize: 31,
    fontWeight: '800',
    marginTop: 5,
  },
  successIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: LIME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBackground: {
    height: 8,
    borderRadius: 10,
    backgroundColor: '#374151',
    overflow: 'hidden',
    marginTop: 18,
  },
  progressValue: {
    height: '100%',
    backgroundColor: LIME,
    borderRadius: 10,
  },
  successDescription: {
    fontSize: 11,
    color: '#d1d5db',
    marginTop: 10,
  },

  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 17,
    marginBottom: 15,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK,
  },
  chartSubtitle: {
    fontSize: 11,
    color: MUTED,
    marginTop: 5,
  },
  chartIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#eef5df',
    alignItems: 'center',
    justifyContent: 'center',
  },

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: BG,
    borderRadius: 13,
    padding: 4,
    marginTop: 20,
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  periodButtonActive: {
    backgroundColor: LIME,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  periodTextActive: {
    color: DARK,
    fontWeight: '800',
  },

  totalAmountContainer: {
    marginTop: 20,
    marginBottom: 12,
  },
  totalAmountLabel: {
    color: MUTED,
    fontSize: 11,
  },
  totalAmountValue: {
    color: DARK,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 5,
  },
  chartScroll: {
    paddingTop: 10,
    paddingBottom: 5,
  },
  axisLabel: {
    color: MUTED,
    fontSize: 9,
  },
  emptyChart: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyChartText: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: LIME,
  },
  legendText: {
    fontSize: 10,
    color: MUTED,
  },

  totalTransactionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  totalTransactionsIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#eef5df',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalTransactionsLabel: {
    fontSize: 11,
    color: MUTED,
  },
  totalTransactionsValue: {
    fontSize: 21,
    fontWeight: '800',
    color: DARK,
    marginTop: 4,
  },
  footerText: {
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 18,
  },

  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    color: MUTED,
    fontSize: 13,
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DARK,
    marginTop: 14,
  },
  errorText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  retryButton: {
    backgroundColor: LIME,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK,
  },
});
