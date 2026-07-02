import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { getColors } from '@/constants/Colors';
import { useStore } from '@/store/useStore';
import { PieChart } from 'react-native-gifted-charts';
import { formatCurrency, formatDate } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, Layout, ZoomIn } from 'react-native-reanimated';

type StatType = 'expense' | 'income';

export default function StatsScreen() {
  const { theme, primaryColor, jars, transactions } = useStore();
  const colors = getColors(theme, primaryColor);
  const isDark = theme === 'dark';
  const [statType, setStatType] = useState<StatType>('expense');
  const [selectedJar, setSelectedJar] = useState<string | null>(null);

  const amountsByJar = useMemo(() => {
    const amounts: Record<string, number> = {};
    jars.forEach(j => amounts[j.id] = 0);
    amounts['unallocated'] = 0;

    transactions.forEach(tx => {
      if (tx.type === statType && tx.jarId) {
        if (!amounts[tx.jarId]) amounts[tx.jarId] = 0;
        amounts[tx.jarId] += tx.amount;
      }
    });
    return amounts;
  }, [transactions, statType, jars]);

  const totalAmount = useMemo(() => {
    return Object.values(amountsByJar).reduce((a, b) => a + b, 0);
  }, [amountsByJar]);

  const chartData = useMemo(() => {
    const list = jars.map(jar => {
      const amount = amountsByJar[jar.id] || 0;
      const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0';
      return {
        value: amount,
        color: jar.color,
        text: amount > 0 ? `${percentage}%` : '',
        shiftTextX: -10,
        shiftTextY: -10,
        jarId: jar.id,
        focused: selectedJar === jar.id,
        name: jar.name
      };
    });

    if (amountsByJar['unallocated'] > 0) {
      const amount = amountsByJar['unallocated'];
      const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0';
      list.push({
        value: amount,
        color: colors.textSecondary,
        text: `${percentage}%`,
        shiftTextX: -10,
        shiftTextY: -10,
        jarId: 'unallocated',
        focused: selectedJar === 'unallocated',
        name: 'Chưa phân bổ'
      });
    }

    return list.filter(d => d.value > 0);
  }, [jars, amountsByJar, totalAmount, selectedJar, colors]);

  const selectedJarData = useMemo(() => {
    if (!selectedJar) return null;
    const jarInfo = chartData.find(d => d.jarId === selectedJar);
    if (!jarInfo) return null;
    const amount = amountsByJar[selectedJar] || 0;
    const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0';
    return { name: jarInfo.name, color: jarInfo.color, amount, percentage };
  }, [selectedJar, chartData, amountsByJar, totalAmount]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.type !== statType) return false;
      if (selectedJar && tx.jarId !== selectedJar) return false;
      return true;
    });
  }, [transactions, statType, selectedJar]);

  const totalIncome = useMemo(() => transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0), [transactions]);

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const header = "ID,Type,Amount,Date,Note,JarID,Category\n";
    const rows = transactions.map(tx => {
      const typeStr = tx.type === 'income' ? 'Thu nhap' : tx.type === 'expense' ? 'Chi tieu' : 'Chuyen tien';
      const jarName = jars.find(j => j.id === tx.jarId)?.name || (tx.jarId === 'unallocated' ? 'Chua phan bo' : '');
      const dateStr = formatDate(tx.date).replace(',', '');
      const noteStr = (tx.note || '').replace(/,/g, ' ');
      const catStr = tx.category || '';
      return `${tx.id},${typeStr},${tx.amount},${dateStr},${noteStr},${jarName},${catStr}`;
    }).join('\n');
    
    const csvContent = header + rows;
    
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'MoneyJars_Export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const fileUri = documentDirectory + "MoneyJars_Export.csv";
    await writeAsStringAsync(fileUri, csvContent, { encoding: EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }
  };

  const headerGradient = isDark ? ['#0A3D22', '#09090B'] as const : ['#E8F9EE', '#F8F9FA'] as const;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={headerGradient} style={styles.headerGradient}>
        <Animated.View entering={FadeInUp.springify()} style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Thống kê</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Tổng quan tài chính</Text>
          </View>
          <TouchableOpacity style={[styles.exportBtnPremium, { shadowColor: colors.primary }]} onPress={handleExport} activeOpacity={0.8}>
            <LinearGradient colors={[colors.primary, colors.primary + 'DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exportBtnInner}>
              <Ionicons name="download-outline" size={18} color="#FFF" />
              <Text style={styles.exportBtnText}>Xuất CSV</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.summaryIconBg, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="trending-up" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tổng thu nhập</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatCurrency(totalIncome)}</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.summaryIconBg, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="trending-down" size={20} color={colors.error} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tổng chi tiêu</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>{formatCurrency(totalExpense)}</Text>
          </View>
        </Animated.View>
      </LinearGradient>

      <Animated.View entering={FadeInDown.delay(150).springify()} style={[styles.segmentedOuter, { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.segmentBtn, statType === 'expense' && styles.segmentBtnActive]}
          onPress={() => { setStatType('expense'); setSelectedJar(null); }}
        >
          {statType === 'expense' ? (
            <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.segmentGradient}>
              <Ionicons name="arrow-up-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.segmentTextActive}>Chi tiêu</Text>
            </LinearGradient>
          ) : (
            <View style={styles.segmentInactive}>
              <Text style={[styles.segmentText, { color: colors.textSecondary }]}>Chi tiêu</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.segmentBtn, statType === 'income' && styles.segmentBtnActive]}
          onPress={() => { setStatType('income'); setSelectedJar(null); }}
        >
          {statType === 'income' ? (
            <LinearGradient colors={[colors.primary, colors.primary + 'DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.segmentGradient}>
              <Ionicons name="arrow-down-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.segmentTextActive}>Thu nhập</Text>
            </LinearGradient>
          ) : (
            <View style={styles.segmentInactive}>
              <Text style={[styles.segmentText, { color: colors.textSecondary }]}>Thu nhập</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={ZoomIn.delay(200).springify()} style={[styles.chartSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.chartContainer}>
          {totalAmount === 0 ? (
            <View style={[styles.emptyChart, { borderColor: colors.border }]}>
              <Ionicons name="pie-chart-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>Chưa có giao dịch</Text>
            </View>
          ) : (
            <PieChart
              donut
              innerRadius={70}
              data={chartData}
              centerLabelComponent={() => {
                return (
                  <View style={styles.centerLabel}>
                    <Text style={[styles.centerLabelTotal, { color: colors.textSecondary }]}>
                      {statType === 'expense' ? 'TỔNG CHI' : 'TỔNG THU'}
                    </Text>
                    <Text style={[styles.centerLabelAmount, { color: colors.text }]}>{formatCurrency(totalAmount)}</Text>
                  </View>
                );
              }}
              onPress={(item: any) => setSelectedJar(item.jarId)}
            />
          )}
        </View>

        {chartData.length > 0 && (
          <View style={styles.legendContainer}>
            <View style={[styles.legendDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>PHÂN BỔ THEO HŨ</Text>
            {chartData.map((item, index) => {
              const pct = totalAmount > 0 ? ((item.value / totalAmount) * 100).toFixed(1) : '0';
              return (
                <TouchableOpacity
                  key={item.jarId}
                  activeOpacity={0.7}
                  onPress={() => setSelectedJar(item.jarId === selectedJar ? null : item.jarId)}
                  style={[
                    styles.legendRow,
                    selectedJar === item.jarId && { backgroundColor: item.color + '10', borderRadius: 12 },
                    index < chartData.length - 1 && selectedJar !== item.jarId && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.legendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendName, { color: colors.text }]}>{item.name}</Text>
                  </View>
                  <View style={styles.legendRight}>
                    <Text style={[styles.legendAmount, { color: colors.text }]}>{formatCurrency(item.value)}</Text>
                    <Text style={[styles.legendPct, { color: colors.textSecondary }]}>{pct}%</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Animated.View>

      {selectedJarData && (
        <Animated.View entering={FadeInDown.springify()} layout={Layout.springify()} style={[styles.selectedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.selectedAccent, { backgroundColor: selectedJarData.color }]} />
          <View style={styles.selectedBody}>
            <View style={styles.selectedHeader}>
              <View style={[styles.selectedIconBg, { backgroundColor: selectedJarData.color + '15' }]}>
                <Ionicons name="wallet" size={24} color={selectedJarData.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedTitle, { color: selectedJarData.color }]}>
                  {selectedJarData.name}
                </Text>
                <Text style={[styles.selectedSubtitle, { color: colors.textSecondary }]}>
                  Chiếm {selectedJarData.percentage}% tổng {statType === 'expense' ? 'chi' : 'thu'}
                </Text>
              </View>
            </View>
            <View style={[styles.selectedAmountRow, { backgroundColor: selectedJarData.color + '05', borderColor: selectedJarData.color + '20' }]}>
              <Text style={[styles.selectedAmountLabel, { color: colors.textSecondary }]}>
                {statType === 'expense' ? 'Đã chi tiêu' : 'Đã thu vào'}
              </Text>
              <Text style={[styles.selectedAmountValue, { color: selectedJarData.color }]}>
                {formatCurrency(selectedJarData.amount)}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(250).springify()} layout={Layout.springify()} style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>Chi tiết giao dịch</Text>
          <View style={[styles.badge, { backgroundColor: colors.border }]}>
            <Text style={[styles.listCount, { color: colors.textSecondary }]}>{filteredTransactions.length}</Text>
          </View>
        </View>
        
        {filteredTransactions.length === 0 ? (
          <View style={[styles.emptyList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>Chưa có giao dịch nào.</Text>
          </View>
        ) : (
          <View style={[styles.txListCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {filteredTransactions.map((tx, index) => {
              const jarName = jars.find(j => j.id === tx.jarId)?.name || (tx.jarId === 'unallocated' ? 'Chưa phân bổ' : 'Unknown');
              const jarColor = jars.find(j => j.id === tx.jarId)?.color || colors.textSecondary;
              const amountColor = statType === 'income' ? colors.primary : colors.error;
              const sign = statType === 'income' ? '+' : '-';
              return (
                <View key={tx.id} style={[styles.txRow, index < filteredTransactions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                  <View style={styles.txLeft}>
                    <View style={[styles.txIcon, { backgroundColor: amountColor + '10' }]}>
                      <Ionicons name={statType === 'income' ? 'arrow-down' : 'arrow-up'} size={20} color={amountColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txNote, { color: colors.text }]} numberOfLines={1}>
                        {tx.note || (statType === 'income' ? 'Thu nhập' : 'Chi tiêu')}
                      </Text>
                      <View style={styles.txMeta}>
                        <Text style={[styles.txDate, { color: colors.textSecondary }]}>{formatDate(tx.date)}</Text>
                        <View style={[styles.txJarBadge, { backgroundColor: jarColor + '15' }]}>
                          <View style={[styles.txJarDot, { backgroundColor: jarColor }]} />
                          <Text style={[styles.txJarName, { color: jarColor }]}>{jarName}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, { color: amountColor }]}>{sign}{formatCurrency(tx.amount)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Animated.View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingTop: 60, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  exportBtnPremium: { borderRadius: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  exportBtnInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16 },
  exportBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  summaryRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 24, gap: 16 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  summaryIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  summaryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  segmentedOuter: { flexDirection: 'row', marginHorizontal: 20, marginTop: 24, borderRadius: 16, padding: 6 },
  segmentBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  segmentBtnActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  segmentInactive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  segmentTextActive: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  segmentText: { fontWeight: '600', fontSize: 14 },
  chartSection: { marginHorizontal: 20, marginTop: 24, borderRadius: 24, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 4 },
  chartContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  emptyChart: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyChartText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  centerLabel: { alignItems: 'center', justifyContent: 'center' },
  centerLabelTotal: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  centerLabelAmount: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  legendContainer: { paddingHorizontal: 20, paddingBottom: 16 },
  legendDivider: { height: StyleSheet.hairlineWidth, marginBottom: 16 },
  legendTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 8 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  legendLeft: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  legendName: { fontSize: 15, fontWeight: '600' },
  legendRight: { alignItems: 'flex-end' },
  legendAmount: { fontSize: 15, fontWeight: '700' },
  legendPct: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  selectedCard: { marginHorizontal: 20, marginTop: 16, borderRadius: 20, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  selectedAccent: { height: 4 },
  selectedBody: { padding: 20 },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  selectedIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  selectedTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  selectedSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  selectedAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1 },
  selectedAmountLabel: { fontSize: 14, fontWeight: '600' },
  selectedAmountValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  listContainer: { paddingHorizontal: 20, paddingTop: 24 },
  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  listTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  listCount: { fontSize: 12, fontWeight: '700' },
  emptyList: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed' },
  emptyListText: { textAlign: 'center', marginTop: 12, fontSize: 14, fontWeight: '600' },
  txListCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txNote: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txDate: { fontSize: 12, fontWeight: '500' },
  txJarBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  txJarDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  txJarName: { fontSize: 11, fontWeight: '700' },
  txAmount: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
});
