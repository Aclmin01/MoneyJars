import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { getColors } from '@/constants/Colors';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { formatCurrency } from '@/utils/format';

const ICONS = ['airplane', 'home', 'car', 'game-controller', 'laptop', 'book', 'heart', 'gift'];
const COLORS = ['#4CAF50', '#2196F3', '#E91E63', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FFEB3B'];

export default function GoalsScreen() {
  const { theme, primaryColor, goals, addGoal, contributeToGoal, deleteGoal, unallocatedBalance } = useStore();
  const colors = getColors(theme, primaryColor);
  const isDark = theme === 'dark';

  const [modalVisible, setModalVisible] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftTarget, setDraftTarget] = useState('');
  const [draftIcon, setDraftIcon] = useState(ICONS[0]);
  const [draftColor, setDraftColor] = useState(COLORS[0]);

  const [contributeModalVisible, setContributeModalVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const handleAddGoal = () => {
    if (!draftName.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập tên mục tiêu');
    const target = parseInt(draftTarget.replace(/\D/g, ''));
    if (!target || target <= 0) return Alert.alert('Lỗi', 'Số tiền mục tiêu không hợp lệ');

    addGoal({
      name: draftName,
      targetAmount: target,
      icon: draftIcon,
      color: draftColor
    });
    setModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDraftName('');
    setDraftTarget('');
  };

  const handleContribute = () => {
    if (!selectedGoalId) return;
    const amount = parseInt(contributeAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) return Alert.alert('Lỗi', 'Số tiền không hợp lệ');
    if (amount > unallocatedBalance) return Alert.alert('Lỗi', `Số dư Ví tích luỹ không đủ (${formatCurrency(unallocatedBalance)})`);

    contributeToGoal(selectedGoalId, amount);
    setContributeModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setContributeAmount('');
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Xóa mục tiêu', 'Bạn có chắc muốn xóa mục tiêu này không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => { deleteGoal(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mục tiêu</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Tích luỹ cho ước mơ của bạn</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View style={[styles.balanceCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Text style={[styles.balanceLabel, { color: colors.primary }]}>Số dư Ví tích luỹ hiện có:</Text>
          <Text style={[styles.balanceValue, { color: colors.text }]}>{formatCurrency(unallocatedBalance)}</Text>
        </View>

        {goals.map((goal, index) => {
          const progress = Math.min(1, goal.currentAmount / goal.targetAmount);
          const progressPercent = (progress * 100).toFixed(0);
          
          return (
            <Animated.View 
              key={goal.id}
              entering={FadeInDown.delay(index * 100).springify()}
              style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <LinearGradient colors={[goal.color, goal.color + 'DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.goalIconContainer}>
                <Ionicons name={goal.icon as any} size={28} color="#FFF" />
              </LinearGradient>
              
              <View style={styles.goalInfo}>
                <View style={styles.goalHeaderRow}>
                  <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
                  <TouchableOpacity onPress={() => confirmDelete(goal.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.goalAmountText, { color: colors.textSecondary }]}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{formatCurrency(goal.currentAmount)}</Text> / {formatCurrency(goal.targetAmount)}
                </Text>

                <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: goal.color, width: `${progressPercent}%` as any }]} />
                </View>

                <View style={styles.goalFooterRow}>
                  <Text style={[styles.progressText, { color: goal.color }]}>{progressPercent}% hoàn thành</Text>
                  <TouchableOpacity 
                    style={[styles.contributeBtn, { backgroundColor: goal.color + '15' }]}
                    onPress={() => { setSelectedGoalId(goal.id); setContributeAmount(''); setContributeModalVisible(true); }}
                  >
                    <Ionicons name="add" size={16} color={goal.color} />
                    <Text style={[styles.contributeText, { color: goal.color }]}>Góp tiền</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          );
        })}

        {goals.length === 0 && (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Ionicons name="flag-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Bạn chưa có mục tiêu nào.{'\n'}Hãy tạo một mục tiêu để tiết kiệm nhé!</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Add Goal Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.springify()} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Tạo Mục Tiêu Mới</Text>
            
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Tên mục tiêu (VD: Mua iPhone)"
              placeholderTextColor={colors.textSecondary}
              value={draftName}
              onChangeText={setDraftName}
            />
            
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Số tiền mục tiêu"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={draftTarget}
              onChangeText={(t) => {
                const raw = t.replace(/\D/g, '');
                setDraftTarget(raw ? parseInt(raw).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
              }}
            />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Chọn biểu tượng</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionScroll}>
              {ICONS.map(ic => (
                <TouchableOpacity key={ic} onPress={() => setDraftIcon(ic)} style={[styles.iconSelect, draftIcon === ic && { borderColor: colors.primary, borderWidth: 2 }]}>
                  <Ionicons name={ic as any} size={24} color={draftIcon === ic ? colors.primary : colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Chọn màu sắc</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionScroll}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setDraftColor(c)} style={[styles.colorSelect, { backgroundColor: c }, draftColor === c && { borderColor: colors.text, borderWidth: 3 }]} />
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border }]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleAddGoal}>
                <Text style={[styles.btnText, { color: '#FFF' }]}>Tạo Mục Tiêu</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Contribute Modal */}
      <Modal visible={contributeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.springify()} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Góp tiền vào mục tiêu</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 20 }}>Tiền sẽ được trích từ Ví tích luỹ ({formatCurrency(unallocatedBalance)})</Text>
            
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, fontSize: 24, fontWeight: 'bold', textAlign: 'center' }]}
              placeholder="0 ₫"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={contributeAmount}
              autoFocus
              onChangeText={(t) => {
                const raw = t.replace(/\D/g, '');
                setContributeAmount(raw ? parseInt(raw).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
              }}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border }]} onPress={() => setContributeModalVisible(false)}>
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleContribute}>
                <Text style={[styles.btnText, { color: '#FFF' }]}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  headerTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  balanceCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24, alignItems: 'center' },
  balanceLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  balanceValue: { fontSize: 24, fontWeight: '800' },
  goalCard: { flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  goalIconContainer: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  goalInfo: { flex: 1, justifyContent: 'center' },
  goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  goalName: { fontSize: 18, fontWeight: '700' },
  goalAmountText: { fontSize: 13, marginBottom: 12 },
  progressBarBg: { height: 8, borderRadius: 4, width: '100%', overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  goalFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 13, fontWeight: '800' },
  contributeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
  contributeText: { fontSize: 13, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 30, right: 24, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  emptyState: { padding: 40, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderRadius: 24, marginTop: 40 },
  emptyText: { textAlign: 'center', marginTop: 16, fontSize: 15, lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 24, borderRadius: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  selectionScroll: { flexDirection: 'row', marginBottom: 20 },
  iconSelect: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: 'rgba(150,150,150,0.1)' },
  colorSelect: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
});
