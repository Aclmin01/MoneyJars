import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { getColors } from '@/constants/Colors';
import { useStore, Transaction } from '@/store/useStore';
import { formatCurrency, formatDate } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, Layout, ZoomIn } from 'react-native-reanimated';

export default function HomeScreen() {
  const { theme, primaryColor, syncMode, jars, unallocatedBalance, transactions, processRecurring, syncBankTransactions, userName, userAvatar } = useStore();
  const colors = getColors(theme, primaryColor);
  const isDark = theme === 'dark';

  useEffect(() => {
    processRecurring();
  }, []);

  const totalBalance = useMemo(() => {
    return unallocatedBalance + jars.reduce((sum, jar) => sum + jar.balance, 0);
  }, [jars, unallocatedBalance]);

  const recentTransactions = transactions.slice(0, 5);

  const jarProgress = useMemo(() => {
    const progress: Record<string, { totalIn: number }> = {};
    jars.forEach(j => progress[j.id] = { totalIn: 0 });
    
    transactions.forEach(tx => {
      if (tx.type === 'income' && tx.jarId) {
        if (!progress[tx.jarId]) progress[tx.jarId] = { totalIn: 0 };
        progress[tx.jarId].totalIn += tx.amount;
      } else if (tx.type === 'internal_transfer') {
        if (tx.toJarId && progress[tx.toJarId]) {
          progress[tx.toJarId].totalIn += tx.amount;
        }
      }
    });
    return progress;
  }, [transactions, jars]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const nameStr = userName ? `, ${userName}` : '';
    if (hour < 12) return `Chào buổi sáng${nameStr} ☀️`;
    if (hour < 18) return `Chào buổi chiều${nameStr} 🌤️`;
    return `Chào buổi tối${nameStr} 🌙`;
  };

  const getFormattedDate = () => {
    const now = new Date();
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  };

  const handleSyncReal = async () => {
    try {
      await syncBankTransactions();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đồng bộ thành công',
        'Đã đồng bộ các giao dịch mới nhất từ ngân hàng thông qua iOS Shortcuts!',
      );
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể kết nối tới Backend.');
    }
  };

  const headerGradient: [string, string, string] = useMemo(() => {
    return isDark 
      ? [colors.primary + '30', colors.primary + '10', colors.background] 
      : [colors.primary + '15', colors.primary + '05', colors.background];
  }, [isDark, colors.primary, colors.background]);

  const renderTransaction = (tx: Transaction, index: number) => {
    const isIncome = tx.type === 'income';
    const isTransfer = tx.type === 'internal_transfer';
    const color = isIncome ? colors.primary : isTransfer ? colors.warning : colors.error;
    const sign = isIncome ? '+' : '-';
    
    let jarName = '';
    if (isTransfer) {
      const fromJar = jars.find(j => j.id === tx.fromJarId)?.name || 'Quỹ chung';
      const toJar = jars.find(j => j.id === tx.toJarId)?.name || 'Quỹ chung';
      jarName = `${fromJar} ➞ ${toJar}`;
    } else {
      jarName = jars.find(j => j.id === tx.jarId)?.name || (tx.jarId === 'unallocated' ? 'Ví tích luỹ' : 'Không xác định');
    }

    return (
      <Animated.View 
        entering={FadeInDown.delay(300 + index * 100).springify()} 
        layout={Layout.springify()}
        key={tx.id} 
        style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.txLeft}>
          <LinearGradient
            colors={[color + '25', color + '05']}
            style={styles.txIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={isIncome ? 'arrow-down' : isTransfer ? 'swap-horizontal' : 'arrow-up'} size={20} color={color} />
          </LinearGradient>
          <View style={styles.txInfo}>
            <Text style={[styles.txNote, { color: colors.text }]} numberOfLines={1}>
              {tx.note || (isIncome ? 'Thu nhập' : 'Chi tiêu')}
            </Text>
            <Text style={[styles.txDate, { color: colors.textSecondary }]}>
              {formatDate(tx.date)} • {jarName}
            </Text>
          </View>
        </View>
        <Text style={[styles.txAmount, { color }]}>
          {sign}{formatCurrency(tx.amount)}
        </Text>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={headerGradient}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.headerTopRow}>
            <View>
              <Text style={[styles.greeting, { color: colors.text }]}>{getGreeting()}</Text>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{getFormattedDate()}</Text>
            </View>
            {syncMode === 'auto' && (
              <TouchableOpacity
                style={[styles.syncBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                onPress={handleSyncReal}
                activeOpacity={0.7}
              >
                <View style={[styles.syncDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.syncText, { color: colors.primary }]}>Đồng bộ</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Premium Glass Balance Card */}
          <Animated.View entering={ZoomIn.delay(200).springify()} style={[styles.balanceWrapper, { shadowColor: colors.primary, backgroundColor: colors.primary, borderRadius: 24 }]}>
            <LinearGradient
              colors={[colors.primary, colors.primary + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <Text style={styles.balanceLabel}>TỔNG TÀI SẢN</Text>
              <Text style={styles.balanceValue}>
                {formatCurrency(totalBalance)}
              </Text>
              <View style={styles.balanceMeta}>
                <View style={styles.balanceChip}>
                  <Ionicons name="wallet-outline" size={14} color="#FFF" />
                  <Text style={styles.balanceChipText}>{jars.length} hũ</Text>
                </View>
                <View style={styles.balanceChip}>
                  <Ionicons name="receipt-outline" size={14} color="#FFF" />
                  <Text style={styles.balanceChipText}>{transactions.length} GD</Text>
                </View>
              </View>
              
              {/* Decorative Elements */}
              <View style={styles.circle1} />
              <View style={styles.circle2} />
            </LinearGradient>
          </Animated.View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Trạng thái Hũ</Text>
          </View>
          <View style={styles.jarsGrid}>
            {jars.map((jar, index) => {
              const totalIn = jarProgress[jar.id]?.totalIn || 0;
              let rawProgress = jar.goalAmount ? (jar.balance / jar.goalAmount) : (totalIn > 0 ? (jar.balance / totalIn) : 0);
              const progressPercent = Math.max(0, Math.min(1, rawProgress)) * 100;
              const progressLabel = jar.goalAmount ? `Mục tiêu: Đạt ${progressPercent.toFixed(0)}%` : (totalIn > 0 ? `Còn ${progressPercent.toFixed(0)}% lượng thu vào` : 'Chưa có tiền');

              return (
                <Animated.View 
                  entering={FadeInDown.delay(250 + index * 100).springify()} 
                  key={jar.id} 
                  style={[styles.jarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <LinearGradient colors={[jar.color, jar.color + '80']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.jarAccent} />
                  <View style={styles.jarCardHeader}>
                    <View style={[styles.jarIconWrap, { backgroundColor: jar.color + '15' }]}>
                      <Ionicons name={jar.icon as any} size={18} color={jar.color} />
                    </View>
                    <Text style={[styles.jarName, { color: colors.text }]} numberOfLines={1}>{jar.name}</Text>
                  </View>
                  <Text style={[styles.jarBalance, { color: colors.text }]}>{formatCurrency(jar.balance)}</Text>
                  
                  <View style={[styles.progressBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                    <LinearGradient
                      colors={[jar.color, jar.color + 'EE']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${progressPercent}%` }]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>{progressLabel}</Text>
                </Animated.View>
              );
            })}
            {jars.length === 0 && (
              <Animated.View entering={FadeInDown.delay(300)} style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="add-circle-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có hũ nào. Hãy qua Tab Hũ để tạo nhé!</Text>
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Giao dịch gần đây</Text>
            {recentTransactions.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/stats')} activeOpacity={0.7}>
                <Text style={[styles.viewAll, { color: colors.primary }]}>Xem tất cả</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentTransactions.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(400)} style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có giao dịch nào.</Text>
            </Animated.View>
          ) : (
            recentTransactions.map((tx, index) => renderTransaction(tx, index))
          )}
        </View>
      </ScrollView>

      {/* Modern Floating Action Button */}
      <Animated.View entering={ZoomIn.delay(600).springify()} style={[styles.fabContainer, { shadowColor: colors.primary, backgroundColor: colors.primary, borderRadius: 32 }]}>
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/add');
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabInner}
          >
            <Ionicons name="add" size={32} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dateLabel: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontWeight: '700',
    fontSize: 12,
  },
  balanceWrapper: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)', top: -50, right: -20,
  },
  circle2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, right: 80,
  },
  balanceLabel: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)',
    marginBottom: 8, letterSpacing: 1.5,
  },
  balanceValue: {
    fontSize: 40, fontWeight: '800', color: '#FFF',
    letterSpacing: -1, marginBottom: 16,
  },
  balanceMeta: { flexDirection: 'row', gap: 12 },
  balanceChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6,
  },
  balanceChipText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  viewAll: { fontSize: 14, fontWeight: '700' },
  jarsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  jarCard: {
    width: '48%', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  jarAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  jarCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  jarIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  jarName: { fontWeight: '700', fontSize: 14, flex: 1 },
  jarBalance: { fontSize: 18, fontWeight: '800', marginBottom: 12, letterSpacing: -0.5 },
  progressBg: { height: 6, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: '600' },
  txCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txInfo: { flex: 1 },
  txNote: { fontSize: 16, fontWeight: '700', marginBottom: 4, letterSpacing: -0.2 },
  txDate: { fontSize: 12, fontWeight: '500' },
  txAmount: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', gap: 10, width: '100%' },
  emptyText: { textAlign: 'center', fontSize: 14, fontWeight: '600' },
  fabContainer: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 80, right: 24,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  fab: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  fabInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
