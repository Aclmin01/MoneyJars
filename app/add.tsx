import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { getColors } from '@/constants/Colors';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { formatCurrency } from '@/utils/format';
import Animated, { FadeInDown, FadeInUp, ZoomIn, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type Tab = 'income' | 'expense' | 'transfer';

const EXPENSE_CATEGORIES = ['Ăn uống', 'Mua sắm', 'Di chuyển', 'Hóa đơn', 'Giải trí', 'Khác'];

export default function AddTransactionScreen() {
  const [tab, setTab] = useState<Tab>('expense');
  const [amount, setAmount] = useState('0');
  const [selectedJar, setSelectedJar] = useState<string | null>(null);
  const [selectedToJar, setSelectedToJar] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [currency, setCurrency] = useState('VND');
  const [isScanning, setIsScanning] = useState(false);

  const handleScanReceipt = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
      });

      if (!result.canceled) {
        setIsScanning(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Simulate OCR process
        setTimeout(() => {
          setIsScanning(false);
          // Random amount between 50k and 1M
          const randomAmount = Math.floor(Math.random() * 20 + 1) * 50000;
          setAmount(randomAmount.toString());
          setNote('Bill nhà hàng');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Thành công', 'Đã quét hoá đơn và nhận diện số tiền!');
        }, 1500);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở máy ảnh');
    }
  };

  const EXCHANGE_RATES: Record<string, number> = {
    'VND': 1,
    'USD': 25400,
    'EUR': 27500,
  };

  const { theme, primaryColor, jars, addIncome, addExpense, addTransfer, addRecurringTx } = useStore();
  const colors = getColors(theme, primaryColor);

  const handleNumpad = (val: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (val === 'C') {
      setAmount('0');
    } else if (val === '<') {
      setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (val === '+10k') {
      setAmount(prev => (parseInt(prev.replace(/\./g, '')) + 10000).toString());
    } else if (val === '+50k') {
      setAmount(prev => (parseInt(prev.replace(/\./g, '')) + 50000).toString());
    } else {
      setAmount(prev => prev === '0' ? val : prev + val);
    }
  };

  const parsedAmount = parseInt(amount.replace(/\./g, '')) || 0;

  const handleSubmit = () => {
    if (parsedAmount <= 0) {
      if (Platform.OS === 'web') window.alert('Vui lòng nhập số tiền.'); else Alert.alert('Lỗi', 'Vui lòng nhập số tiền.');
      return;
    }
    
    let finalAmount = parsedAmount;
    if (currency !== 'VND') {
      finalAmount = parsedAmount * EXCHANGE_RATES[currency];
    }
    
    if (tab === 'income') {
      if (!selectedJar) {
        if (Platform.OS === 'web') window.alert('Vui lòng chọn hũ hoặc dùng Auto-Split.'); else Alert.alert('Lỗi', 'Vui lòng chọn hũ hoặc dùng Auto-Split.');
        return;
      }

      if (isRecurring) {
        addRecurringTx({
          type: 'income',
          amount: finalAmount,
          name: note || 'Thu nhập',
          dayOfMonth: new Date().getDate(),
          jarId: selectedJar === 'unallocated' ? 'unallocated' : selectedJar,
        });
      }

      addIncome(finalAmount, selectedJar, note, new Date().toISOString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } else if (tab === 'expense') {
      if (!selectedJar) {
        if (Platform.OS === 'web') window.alert('Vui lòng chọn hũ chi tiêu.'); else Alert.alert('Lỗi', 'Vui lòng chọn hũ chi tiêu.');
        return;
      }

      if (isRecurring) {
        addRecurringTx({
          type: 'expense',
          amount: finalAmount,
          name: note || selectedCategory,
          dayOfMonth: new Date().getDate(),
          jarId: selectedJar === 'unallocated' ? 'unallocated' : selectedJar,
        });
      }

      addExpense(finalAmount, selectedJar, selectedCategory, note, new Date().toISOString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } else if (tab === 'transfer') {
      if (!selectedJar || !selectedToJar) {
        if (Platform.OS === 'web') window.alert('Vui lòng chọn đủ hũ nguồn và đích.'); else Alert.alert('Lỗi', 'Vui lòng chọn đủ hũ nguồn và đích.');
        return;
      }
      if (selectedJar === selectedToJar) {
        if (Platform.OS === 'web') window.alert('Hũ nguồn và đích phải khác nhau.'); else Alert.alert('Lỗi', 'Hũ nguồn và đích phải khác nhau.');
        return;
      }
      addTransfer(finalAmount, selectedJar, selectedToJar, note, new Date().toISOString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    }
  };

  const handleAutoSplit = () => {
    if (parsedAmount <= 0) {
      if (Platform.OS === 'web') window.alert('Vui lòng nhập số tiền để phân bổ.'); else Alert.alert('Lỗi', 'Vui lòng nhập số tiền để phân bổ.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isRecurring) {
      addRecurringTx({
        type: 'income',
        amount: parsedAmount,
        name: note || 'Thu nhập Auto-Split',
        dayOfMonth: new Date().getDate(),
      });
    }

    addIncome(parsedAmount, null, note, new Date().toISOString());
    router.replace('/');
  };

  const activeColor = tab === 'income' ? colors.primary : tab === 'transfer' ? colors.warning : colors.error;

  const renderNumpad = () => {
    const keys = [
      ['1', '2', '3', '+10k'],
      ['4', '5', '6', '+50k'],
      ['7', '8', '9', 'C'],
      ['000', '0', '00', '<']
    ];

    return (
      <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.numpad, { backgroundColor: colors.background }]}>
        {keys.map((row, i) => (
          <View key={i} style={styles.numRow}>
            {row.map(k => (
              <TouchableOpacity key={k} style={styles.numKey} onPress={() => handleNumpad(k)} activeOpacity={0.7}>
                {k === '<' ? (
                  <Ionicons name="backspace-outline" size={28} color={colors.text} />
                ) : (
                  <Text style={[styles.numKeyText, { color: colors.text }]}>{k}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeInUp.springify()} style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} activeOpacity={0.7}>
          <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
            <Ionicons name="close" size={24} color={colors.text} />
          </View>
        </TouchableOpacity>
        
        <View style={[styles.toggleContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['income', 'expense', 'transfer'] as Tab[]).map((t) => (
            <TouchableOpacity 
              key={t}
              style={[styles.toggleBtn, tab === t && { backgroundColor: t === 'income' ? colors.primary : t === 'expense' ? colors.error : colors.warning }]} 
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, { color: colors.textSecondary }, tab === t && styles.toggleTextActive]}>
                {t === 'income' ? 'Thu' : t === 'expense' ? 'Chi' : 'Chuyển'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View entering={ZoomIn.springify()} style={styles.amountContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.currencySelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {['VND', 'USD', 'EUR'].map(cur => (
                <TouchableOpacity 
                  key={cur}
                  style={[styles.currencyBtn, currency === cur && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setCurrency(cur)}
                >
                  <Text style={[styles.currencyBtnText, { color: currency === cur ? colors.primary : colors.textSecondary }]}>{cur}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={[styles.amountText, { color: activeColor }]}>
            {formatCurrency(parsedAmount)} {currency}
          </Text>
          
          {tab === 'expense' && (
            <TouchableOpacity 
              style={[styles.scanBtn, { backgroundColor: isScanning ? colors.border : colors.primary + '15' }]} 
              onPress={handleScanReceipt}
              disabled={isScanning}
            >
              <Ionicons name="scan-outline" size={18} color={isScanning ? colors.textSecondary : colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: isScanning ? colors.textSecondary : colors.primary, fontWeight: '700', fontSize: 13 }}>
                {isScanning ? 'Đang quét OCR...' : 'Quét hoá đơn (OCR)'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {tab === 'income' && (
          <Animated.View entering={FadeInDown.springify()} layout={Layout.springify()}>
            <TouchableOpacity style={styles.autoSplitBtn} onPress={handleAutoSplit} activeOpacity={0.8}>
              <LinearGradient colors={['#F59E0B', '#D97706']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.autoSplitGradient}>
                <Ionicons name="color-wand" size={24} color="#FFF" style={{ marginRight: 10 }} />
                <Text style={styles.autoSplitText}>Tự động phân bổ (Auto-Split)</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(100).springify()} layout={Layout.springify()} style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{tab === 'transfer' ? 'TỪ HŨ (NGUỒN)' : 'CHỌN HŨ'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jarScroll}>
            <TouchableOpacity 
              style={[styles.jarItem, { backgroundColor: colors.surface, borderColor: colors.border }, selectedJar === 'unallocated' && { borderColor: activeColor, backgroundColor: activeColor + '15' }]}
              onPress={() => setSelectedJar('unallocated')}
              activeOpacity={0.7}
            >
              <Ionicons name="wallet-outline" size={28} color={selectedJar === 'unallocated' ? activeColor : colors.textSecondary} />
              <Text style={[styles.jarItemText, { color: colors.text }, selectedJar === 'unallocated' && { color: activeColor, fontWeight: '700' }]}>
                Ví tích luỹ
              </Text>
            </TouchableOpacity>

            {jars.map(jar => (
              <TouchableOpacity 
                key={jar.id} 
                style={[styles.jarItem, { backgroundColor: colors.surface, borderColor: colors.border }, selectedJar === jar.id && { borderColor: activeColor, backgroundColor: activeColor + '15' }]}
                onPress={() => setSelectedJar(jar.id)}
                activeOpacity={0.7}
              >
                <Ionicons name={jar.icon as any} size={28} color={selectedJar === jar.id ? activeColor : jar.color} />
                <Text style={[styles.jarItemText, { color: colors.text }, selectedJar === jar.id && { color: activeColor, fontWeight: '700' }]}>
                  {jar.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {tab === 'transfer' && (
          <Animated.View entering={FadeInDown.delay(150).springify()} layout={Layout.springify()} style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>ĐẾN HŨ (ĐÍCH)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jarScroll}>
              <TouchableOpacity 
                style={[styles.jarItem, { backgroundColor: colors.surface, borderColor: colors.border }, selectedToJar === 'unallocated' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                onPress={() => setSelectedToJar('unallocated')}
                activeOpacity={0.7}
              >
                <Ionicons name="wallet-outline" size={28} color={selectedToJar === 'unallocated' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.jarItemText, { color: colors.text }, selectedToJar === 'unallocated' && { color: colors.primary, fontWeight: '700' }]}>
                  Ví tích luỹ
                </Text>
              </TouchableOpacity>

              {jars.map(jar => (
                <TouchableOpacity 
                  key={jar.id} 
                  style={[styles.jarItem, { backgroundColor: colors.surface, borderColor: colors.border }, selectedToJar === jar.id && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                  onPress={() => setSelectedToJar(jar.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={jar.icon as any} size={28} color={selectedToJar === jar.id ? colors.primary : jar.color} />
                  <Text style={[styles.jarItemText, { color: colors.text }, selectedToJar === jar.id && { color: colors.primary, fontWeight: '700' }]}>
                    {jar.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {tab === 'expense' && (
          <Animated.View entering={FadeInDown.delay(150).springify()} layout={Layout.springify()} style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>DANH MỤC</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jarScroll}>
              {EXPENSE_CATEGORIES.map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.catItem, { backgroundColor: colors.surface, borderColor: colors.border }, selectedCategory === cat && { borderColor: colors.error, backgroundColor: colors.error + '15' }]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catItemText, { color: colors.textSecondary }, selectedCategory === cat && { color: colors.error, fontWeight: '700' }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200).springify()} layout={Layout.springify()} style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>GHI CHÚ</Text>
          <View style={[styles.noteInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.noteInput, { color: colors.text }]}
              placeholder="Thêm ghi chú..."
              placeholderTextColor={colors.textSecondary}
              value={note}
              onChangeText={setNote}
            />
          </View>
          {currency !== 'VND' && parsedAmount > 0 && (
            <Text style={{ textAlign: 'center', marginTop: 10, color: colors.textSecondary, fontWeight: '600' }}>
              ≈ {formatCurrency(parsedAmount * EXCHANGE_RATES[currency])} VND
            </Text>
          )}
        </Animated.View>

        {tab !== 'transfer' && (
          <Animated.View entering={FadeInDown.delay(250).springify()} layout={Layout.springify()}>
            <TouchableOpacity 
              style={[styles.recurringToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setIsRecurring(!isRecurring)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="repeat" size={22} color={isRecurring ? activeColor : colors.textSecondary} />
                <Text style={[styles.recurringText, { color: colors.text }]}>Lặp lại hàng tháng</Text>
              </View>
              <View style={[styles.checkbox, isRecurring && { backgroundColor: activeColor, borderColor: activeColor }]}>
                {isRecurring && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(300).springify()} layout={Layout.springify()}>
          <TouchableOpacity 
            style={styles.submitBtnContainer} 
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={tab === 'income' ? [colors.primary, colors.primary + 'DD'] : tab === 'transfer' ? ['#F59E0B', '#D97706'] : ['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtn}
            >
              <Text style={styles.submitBtnText}>XÁC NHẬN GIAO DỊCH</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {renderNumpad()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15,
  },
  closeBtn: { padding: 4 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  toggleContainer: { flexDirection: 'row', borderRadius: 24, padding: 4, borderWidth: 1 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20 },
  toggleText: { fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  toggleTextActive: { color: '#FFF' },
  amountContainer: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  currencySelector: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  currencyBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  currencyBtnText: { fontSize: 13, fontWeight: '700' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  amountText: { fontSize: 52, fontWeight: '800', letterSpacing: -1.5 },
  autoSplitBtn: { marginHorizontal: 20, marginBottom: 24, borderRadius: 16, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  autoSplitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16 },
  autoSplitText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  section: { marginBottom: 24 },
  label: { marginLeft: 24, marginBottom: 12, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  jarScroll: { paddingHorizontal: 16 },
  jarItem: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20,
    marginHorizontal: 6, borderWidth: 1, minWidth: 104,
  },
  jarItemText: { marginTop: 10, fontSize: 13, fontWeight: '600' },
  catItem: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, marginHorizontal: 6, borderWidth: 1,
  },
  catItemText: { fontSize: 14, fontWeight: '600' },
  noteInputWrapper: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, height: 56,
  },
  noteInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  recurringToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 20, padding: 18, borderRadius: 16, marginBottom: 24, borderWidth: 1,
  },
  recurringText: { fontSize: 15, marginLeft: 12, fontWeight: '600' },
  checkbox: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#D1D1D6',
    alignItems: 'center', justifyContent: 'center'
  },
  submitBtnContainer: { marginHorizontal: 20, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  submitBtn: { flexDirection: 'row', padding: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  numpad: { paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  numRow: { flexDirection: 'row' },
  numKey: { flex: 1, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  numKeyText: { fontSize: 26, fontWeight: '600' }
});
