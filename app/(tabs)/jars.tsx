import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { getColors } from '@/constants/Colors';
import { useStore, Jar } from '@/store/useStore';
import { formatCurrency } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import uuid from 'react-native-uuid';
import Animated, { FadeInDown, FadeInUp, Layout, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const ICONS = ['wallet-outline', 'home-outline', 'book-outline', 'game-controller-outline', 'trending-up-outline', 'shield-checkmark-outline', 'heart-outline', 'car-outline', 'airplane-outline', 'cafe-outline', 'cart-outline', 'medical-outline'];
const COLORS = ['#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EAB308'];

export default function JarsScreen() {
  const { theme, primaryColor, jars, unallocatedBalance, setJarsAndUnallocated, addTransaction } = useStore();
  const colors = getColors(theme, primaryColor);
  const isDark = theme === 'dark';
  
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [editConfig, setEditConfig] = useState<Jar[]>([]);

  const totalMoney = useMemo(() => {
    return unallocatedBalance + jars.reduce((sum, j) => sum + j.balance, 0);
  }, [jars, unallocatedBalance]);

  const handleOpenConfig = () => {
    setEditConfig([...jars]);
    setIsConfigMode(true);
  };

  const handleSaveConfig = () => {
    const sumBalances = editConfig.reduce((sum, item) => sum + item.balance, 0);
    const sumPercentages = editConfig.reduce((sum, item) => sum + item.percentage, 0);

    if (sumPercentages > 100) {
      const msg = `Tổng tỷ lệ % đang là ${sumPercentages.toFixed(1)}% (lớn hơn 100%). Vui lòng điều chỉnh lại.`;
      Platform.OS === 'web' ? window.alert('Lỗi: ' + msg) : Alert.alert('Lỗi', msg);
      return;
    }

    if (sumBalances > totalMoney) {
      const msg = `Bạn đã phân bổ lố ${formatCurrency(sumBalances - totalMoney)}. Hãy giảm bớt tiền trong các hũ.`;
      Platform.OS === 'web' ? window.alert('Lỗi: ' + msg) : Alert.alert('Lỗi', msg);
      return;
    }
    
    jars.forEach(oldJar => {
      if (!editConfig.find(newJar => newJar.id === oldJar.id)) {
        if (oldJar.balance > 0) {
          addTransaction({
            id: uuid.v4() as string,
            type: 'income',
            amount: oldJar.balance,
            date: new Date().toISOString(),
            note: `Hủy hũ: ${oldJar.name}`,
            jarId: 'unallocated',
          });
        }
      }
    });

    const leftover = totalMoney - sumBalances;
    setJarsAndUnallocated(editConfig, leftover);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsConfigMode(false);
  };

  const handleUpdatePercentage = (id: string, text: string) => {
    let p = parseFloat(text) || 0;
    if (p < 0) p = 0;
    if (p > 100) p = 100;
    
    setEditConfig(prev => prev.map(jar => {
      if (jar.id === id) {
        const newBalance = totalMoney > 0 ? Math.floor(totalMoney * (p / 100)) : 0;
        return { ...jar, percentage: p, balance: newBalance };
      }
      return jar;
    }));
  };

  const handleUpdateBalance = (id: string, text: string) => {
    const raw = text.replace(/\D/g, '');
    let b = parseInt(raw) || 0;
    if (b < 0) b = 0;

    setEditConfig(prev => prev.map(jar => {
      if (jar.id === id) {
        const newPercentage = totalMoney > 0 ? Number(((b / totalMoney) * 100).toFixed(1)) : 0;
        return { ...jar, balance: b, percentage: newPercentage };
      }
      return jar;
    }));
  };

  const handleUpdateGoal = (id: string, text: string) => {
    const raw = text.replace(/\D/g, '');
    let g = parseInt(raw) || 0;
    setEditConfig(prev => prev.map(jar => jar.id === id ? { ...jar, goalAmount: g > 0 ? g : undefined } : jar));
  };

  const handleUpdate = (id: string, updates: Partial<Jar>) => {
    setEditConfig(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa hũ này? Tiền trong hũ sẽ được hoàn về Quỹ chung.');
      if (confirmDelete) {
        setEditConfig(prev => prev.filter(p => p.id !== id));
      }
    } else {
      Alert.alert('Xóa hũ', 'Bạn có chắc chắn muốn xóa hũ này? Tiền trong hũ sẽ được hoàn về Quỹ chung.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => {
          setEditConfig(prev => prev.filter(p => p.id !== id));
        }}
      ]);
    }
  };

  const handleAddJar = () => {
    const newJar: Jar = {
      id: Date.now().toString(),
      name: 'Hũ mới',
      percentage: 0,
      balance: 0,
      icon: ICONS[0],
      color: COLORS[0],
    };
    setEditConfig(prev => [...prev, newJar]);
  };

  const displayJars = isConfigMode ? editConfig : jars;
  const currentSum = displayJars.reduce((sum, item) => sum + item.balance, 0);
  const currentLeftover = totalMoney - currentSum;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeInUp.springify()} style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quản lý Hũ</Text>
        {!isConfigMode ? (
          <TouchableOpacity onPress={handleOpenConfig} style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="options-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Cấu hình</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSaveConfig} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={20} color="#FFF" />
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Lưu</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {isConfigMode && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.totalMoneyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }}>Nguồn tiền tổng hợp</Text>
            <Text style={[styles.totalMoneyText, { color: colors.text }]}>{formatCurrency(totalMoney)}</Text>
          </Animated.View>
        )}

        {displayJars.length === 0 && (
          <Animated.View entering={ZoomIn.springify()} style={[styles.emptyState, { borderColor: colors.border }]}>
            <Ionicons name="albums-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có hũ nào. Hãy cấu hình để tạo hũ!</Text>
          </Animated.View>
        )}

        {displayJars.map((jar, index) => {
          return (
            <Animated.View 
              key={jar.id} 
              entering={FadeInDown.delay(index * 100).springify()}
              layout={Layout.springify()}
              style={[styles.jarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.jarHeader}>
                <View style={styles.jarNameRow}>
                  <View style={[styles.iconBox, { backgroundColor: jar.color + '18' }]}>
                    <Ionicons name={jar.icon as any} size={24} color={jar.color} />
                  </View>
                  {!isConfigMode ? (
                    <Text style={[styles.jarName, { color: colors.text }]}>{jar.name}</Text>
                  ) : (
                    <TextInput
                      style={[styles.jarNameInput, { color: colors.text, borderBottomColor: colors.border }]}
                      value={jar.name}
                      onChangeText={(t) => handleUpdate(jar.id, { name: t })}
                    />
                  )}
                </View>
                
                <View style={styles.rightHeader}>
                  {!isConfigMode ? (
                    <View style={[styles.percentageBadge, { backgroundColor: jar.color + '15' }]}>
                      <Text style={[styles.percentageText, { color: jar.color }]}>{jar.percentage}%</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.percentageInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.percentageInput, { color: colors.text }]}
                          keyboardType="numeric"
                          value={jar.percentage.toString()}
                          onChangeText={(t) => handleUpdatePercentage(jar.id, t)}
                        />
                        <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>%</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(jar.id)} style={[styles.deleteBtn, { backgroundColor: colors.error + '15' }]}>
                        <Ionicons name="trash" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {isConfigMode ? (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.editRow}>
                    <View style={styles.editField}>
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>SỐ TIỀN PHÂN BỔ</Text>
                      <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.balanceInput, { color: colors.text }]}
                          keyboardType="numeric"
                          value={jar.balance ? jar.balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                          placeholder="0"
                          placeholderTextColor={colors.textSecondary}
                          onChangeText={(t) => handleUpdateBalance(jar.id, t)}
                        />
                        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>₫</Text>
                      </View>
                    </View>
                    <View style={styles.editField}>
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>MỤC TIÊU</Text>
                      <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.balanceInput, { color: colors.warning }]}
                          keyboardType="numeric"
                          value={jar.goalAmount ? jar.goalAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                          placeholder="Tùy chọn"
                          placeholderTextColor={colors.textSecondary}
                          onChangeText={(t) => handleUpdateGoal(jar.id, t)}
                        />
                        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>₫</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.jarBalance, { color: colors.text }]}>{formatCurrency(jar.balance)}</Text>
                  {jar.goalAmount ? (
                    <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                      Mục tiêu: {formatCurrency(jar.goalAmount)} ({((jar.balance / jar.goalAmount) * 100).toFixed(1)}%)
                    </Text>
                  ) : null}
                </View>
              )}

              {isConfigMode && (
                <View style={styles.editTools}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                    {ICONS.map(ic => (
                      <TouchableOpacity 
                        key={ic} 
                        onPress={() => handleUpdate(jar.id, { icon: ic })}
                        style={[styles.smallIconBox, jar.icon === ic && { backgroundColor: jar.color + '20', borderColor: jar.color, borderWidth: 2 }]}
                      >
                        <Ionicons name={ic as any} size={20} color={jar.icon === ic ? jar.color : colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                    {COLORS.map(col => (
                      <TouchableOpacity 
                        key={col} 
                        onPress={() => handleUpdate(jar.id, { color: col })}
                        style={[styles.colorCircle, { backgroundColor: col }, jar.color === col && { borderColor: colors.text, borderWidth: 3 }]}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}
            </Animated.View>
          );
        })}

        {isConfigMode && (
          <Animated.View entering={FadeInDown.delay(displayJars.length * 100).springify()}>
            <TouchableOpacity style={[styles.addJarBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]} onPress={handleAddJar}>
              <Ionicons name="add" size={24} color={colors.primary} />
              <Text style={[styles.addJarText, { color: colors.primary }]}>Thêm Hũ Mới</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.leftoverBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.leftoverRow}>
            <View style={[styles.leftoverIconBox, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="wallet" size={24} color={colors.primary} />
            </View>
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' }}>
                {isConfigMode ? 'Quỹ chung (Chưa phân bổ)' : 'Mục tích lũy (Số dư)'}
              </Text>
              <Text style={[styles.leftoverAmount, { color: currentLeftover < 0 ? colors.error : colors.primary }]}>
                {formatCurrency(currentLeftover)}
              </Text>
            </View>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  actionBtnText: { fontWeight: '700', marginLeft: 6, fontSize: 14 },
  totalMoneyBox: {
    padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  totalMoneyText: { fontSize: 32, fontWeight: '800', marginTop: 8, letterSpacing: -1 },
  emptyState: { padding: 40, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderRadius: 24, marginTop: 20 },
  emptyText: { fontSize: 16, textAlign: 'center', fontWeight: '600' },
  jarCard: {
    padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
  },
  jarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  jarNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  jarName: { fontSize: 18, fontWeight: '700', marginLeft: 14 },
  jarNameInput: {
    fontSize: 18, fontWeight: '700', marginLeft: 14,
    borderBottomWidth: 1, paddingBottom: 4, flex: 1, marginRight: 10,
  },
  rightHeader: { flexDirection: 'row', alignItems: 'center' },
  percentageBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  percentageText: { fontWeight: '800', fontSize: 16 },
  percentageInputContainer: { 
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, marginRight: 8, borderWidth: 1, height: 36
  },
  percentageInput: { fontSize: 16, fontWeight: '700', width: 45, textAlign: 'center', height: '100%' },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editRow: { flexDirection: 'row', gap: 12 },
  editField: { flex: 1 },
  editLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  balanceInput: { flex: 1, fontSize: 16, fontWeight: '700' },
  editTools: { marginTop: 20, gap: 16 },
  iconScroll: { flexDirection: 'row' },
  smallIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  colorScroll: { flexDirection: 'row' },
  colorCircle: { width: 36, height: 36, borderRadius: 18, marginRight: 16 },
  jarBalance: { fontSize: 26, fontWeight: '800', marginTop: 8, letterSpacing: -0.5 },
  addJarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed',
    marginBottom: 20,
  },
  addJarText: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  leftoverBox: {
    padding: 20, borderRadius: 20, borderWidth: 1, marginTop: 10, marginBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  leftoverRow: { flexDirection: 'row', alignItems: 'center' },
  leftoverIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  leftoverAmount: { fontSize: 24, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
});
