import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { getColors, PRESET_COLORS } from '@/constants/Colors';
import { useStore, Jar } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn, Layout } from 'react-native-reanimated';

const ICONS = ['wallet-outline', 'home-outline', 'book-outline', 'game-controller-outline', 'trending-up-outline', 'shield-checkmark-outline', 'heart-outline', 'medical-outline'];
const COLORS = ['#4CAF50', '#2196F3', '#E91E63', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FFEB3B'];
const AVATARS = ['👨', '👩', '👦', '👧', '🦊', '🐶', '🐱', '🐼', '🐯', '🐸', '🦄', '🐧'];

export default function OnboardingScreen() {
  const { theme, primaryColor, setPrimaryColor, setOnboarded, setJars, addIncome, setSyncMode, setUserInfo } = useStore();
  const colors = getColors(theme, primaryColor);
  const isDark = theme === 'dark';
  
  const [step, setStep] = useState(0);
  const [initialAmount, setInitialAmount] = useState('');
  
  const [draftName, setDraftName] = useState('');
  const [draftAvatar, setDraftAvatar] = useState(AVATARS[0]);

  const [draftJars, setDraftJars] = useState<Jar[]>([
    { id: '1', name: 'Thiết yếu', percentage: 50, balance: 0, icon: 'home-outline', color: '#10B981' },
    { id: '2', name: 'Tiết kiệm', percentage: 50, balance: 0, icon: 'shield-checkmark-outline', color: '#3B82F6' }
  ]);

  const handleBankSync = () => {
    setSyncMode('auto');
    setStep(3);
  };

  const handleManualSync = () => {
    setSyncMode('manual');
    setStep(3);
  };

  const handleUpdateJar = (id: string, updates: Partial<Jar>) => {
    setDraftJars(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeleteJar = (id: string) => {
    setDraftJars(prev => prev.filter(p => p.id !== id));
  };

  const handleAddJar = () => {
    const newJar: Jar = {
      id: Date.now().toString(),
      name: 'Hũ mới',
      percentage: 0,
      balance: 0,
      icon: ICONS[0],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    setDraftJars(prev => [...prev, newJar]);
  };

  const handleFinish = () => {
    const total = draftJars.reduce((sum, item) => sum + item.percentage, 0);
    if (draftJars.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng tạo ít nhất 1 hũ.');
      return;
    }
    if (total !== 100) {
      Alert.alert('Lỗi', `Tổng tỷ lệ % phải bằng 100%. Hiện tại là ${total}%.`);
      return;
    }

    const amount = parseInt(initialAmount.replace(/\D/g, '')) || 0;

    // 1. Save Configs
    setUserInfo(draftName.trim() || 'Người dùng', draftAvatar);
    setJars(draftJars);
    
    // 2. Mark as onboarded
    setOnboarded(true);

    if (amount > 0) {
      addIncome(amount, null, 'Thu nhập ban đầu', new Date().toISOString());
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderStep0 = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Hồ sơ của bạn</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tùy chỉnh ảnh đại diện và tên để cá nhân hóa ứng dụng.</Text>
      
      <View style={styles.avatarSelectionContainer}>
        <View style={[styles.selectedAvatarBox, { borderColor: colors.primary }]}>
          <Text style={styles.selectedAvatarText}>{draftAvatar}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarList}>
          {AVATARS.map(avatar => (
            <TouchableOpacity 
              key={avatar} 
              style={[styles.avatarOption, draftAvatar === avatar && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 2 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDraftAvatar(avatar);
              }}
            >
              <Text style={styles.avatarOptionText}>{avatar}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ width: '100%', marginBottom: 40 }}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>Tên hiển thị</Text>
        <TextInput
          style={[styles.nameInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          placeholder="Nhập tên của bạn"
          placeholderTextColor={colors.textSecondary}
          value={draftName}
          onChangeText={setDraftName}
          autoFocus
        />
      </View>

      <TouchableOpacity 
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]} 
        onPress={() => {
          if (!draftName.trim()) {
            Alert.alert('Thông báo', 'Vui lòng nhập tên của bạn');
            return;
          }
          setStep(1);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryBtnText}>Tiếp tục</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep1 = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.content}>
      <Ionicons name="color-palette" size={80} color={colors.primary} style={{ marginBottom: 20 }} />
      <Text style={[styles.title, { color: colors.text }]}>Chọn màu yêu thích</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ứng dụng sẽ được cá nhân hóa theo màu sắc chủ đạo này.</Text>
      
      <View style={styles.colorGrid}>
        {PRESET_COLORS.map(c => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setPrimaryColor(c.hex)}
            activeOpacity={0.8}
            style={[
              styles.colorOption,
              { backgroundColor: c.hex },
              primaryColor === c.hex && { borderColor: colors.text, borderWidth: 4 }
            ]}
          >
            {primaryColor === c.hex && <Ionicons name="checkmark" size={24} color="#FFF" />}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 40 }]} 
        onPress={() => setStep(2)}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryBtnText}>Tiếp tục</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.content}>
      <Ionicons name="wallet" size={80} color={colors.primary} style={{ marginBottom: 20 }} />
      <Text style={[styles.title, { color: colors.text }]}>Chào mừng, {draftName}!</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Bạn muốn lấy dữ liệu giao dịch bằng cách nào?</Text>
      
      <TouchableOpacity style={[styles.choiceBtn, { backgroundColor: colors.surface, borderColor: colors.primary + '50' }]} onPress={handleBankSync} activeOpacity={0.8}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="business" size={28} color={colors.primary} />
        </View>
        <View style={styles.choiceTextContainer}>
          <Text style={[styles.choiceTitle, { color: colors.text }]}>Liên kết Ngân hàng (API)</Text>
          <Text style={[styles.choiceDesc, { color: colors.textSecondary }]}>Tự động đồng bộ số dư với backend (Đã mở khoá)</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.choiceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleManualSync} activeOpacity={0.8}>
        <View style={[styles.iconBox, { backgroundColor: colors.textSecondary + '15' }]}>
          <Ionicons name="create" size={28} color={colors.textSecondary} />
        </View>
        <View style={styles.choiceTextContainer}>
          <Text style={[styles.choiceTitle, { color: colors.text }]}>Tự thiết lập thủ công</Text>
          <Text style={[styles.choiceDesc, { color: colors.textSecondary }]}>Kiểm soát mọi giao dịch 100% bằng tay</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Số dư hiện tại</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Nhập tổng số tiền bạn đang có. Số tiền này sẽ được dùng để phân bổ vào các Hũ ở bước sau.</Text>
      
      <TextInput
        style={[styles.bigInput, { color: colors.text, borderBottomColor: colors.primary }]}
        keyboardType="numeric"
        placeholder="0 ₫"
        placeholderTextColor={colors.textSecondary}
        value={initialAmount}
        autoFocus
        onChangeText={(t) => {
          const raw = t.replace(/\D/g, '');
          setInitialAmount(raw ? parseInt(raw).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
        }}
      />

      <TouchableOpacity 
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]} 
        onPress={() => setStep(4)}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryBtnText}>Tiếp tục</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View entering={FadeInUp.springify()} style={styles.step4Container}>
      <View style={styles.step4Header}>
        <Text style={[styles.title, { color: colors.text, fontSize: 28, marginBottom: 8 }]}>Tạo hệ thống Hũ</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Số tiền {initialAmount || '0'} ₫ sẽ được tự động chia vào các Hũ này theo tỷ lệ bạn đặt.</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {draftJars.map((jar) => (
          <Animated.View entering={FadeInDown.springify()} layout={Layout.springify()} key={jar.id} style={[styles.jarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.jarHeader}>
              <View style={[styles.iconBox, { backgroundColor: jar.color + '20' }]}>
                <Ionicons name={jar.icon as any} size={24} color={jar.color} />
              </View>
              <TextInput
                style={[styles.jarNameInput, { color: colors.text, borderBottomColor: colors.border }]}
                value={jar.name}
                onChangeText={(t) => handleUpdateJar(jar.id, { name: t })}
              />
              <View style={[styles.percentageInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.percentageInput, { color: colors.text }]}
                  keyboardType="numeric"
                  value={jar.percentage.toString()}
                  onChangeText={(t) => handleUpdateJar(jar.id, { percentage: parseInt(t) || 0 })}
                />
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>%</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteJar(jar.id)} style={{ padding: 8, marginLeft: 6, backgroundColor: colors.error + '15', borderRadius: 8 }}>
                <Ionicons name="trash" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.editTools}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                {ICONS.map(ic => (
                  <TouchableOpacity 
                    key={ic} 
                    onPress={() => handleUpdateJar(jar.id, { icon: ic })}
                    style={[styles.smallIconBox, jar.icon === ic && { borderColor: jar.color, borderWidth: 2, backgroundColor: jar.color + '20' }]}
                  >
                    <Ionicons name={ic as any} size={18} color={jar.icon === ic ? jar.color : colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                {COLORS.map(col => (
                  <TouchableOpacity 
                    key={col} 
                    onPress={() => handleUpdateJar(jar.id, { color: col })}
                    style={[styles.colorCircle, { backgroundColor: col }, jar.color === col && { borderColor: colors.text, borderWidth: 2 }]}
                  />
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        ))}

        <TouchableOpacity style={[styles.addJarBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]} onPress={handleAddJar} activeOpacity={0.8}>
          <Ionicons name="add" size={24} color={colors.primary} />
          <Text style={[styles.addJarText, { color: colors.primary }]}>Thêm Hũ Mới</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.primaryBtnShadow, { shadowColor: colors.primary }]} 
          onPress={handleFinish}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Hoàn tất & Bắt đầu sử dụng</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 40, lineHeight: 24, fontWeight: '500' },
  avatarSelectionContainer: { width: '100%', alignItems: 'center', marginBottom: 30 },
  selectedAvatarBox: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  selectedAvatarText: { fontSize: 48 },
  avatarList: { gap: 12, paddingHorizontal: 10 },
  avatarOption: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  avatarOptionText: { fontSize: 32 },
  inputLabel: { fontSize: 16, fontWeight: '700', marginBottom: 10, marginLeft: 4 },
  nameInput: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 18, fontWeight: '600' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  colorOption: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  choiceBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  choiceTextContainer: { flex: 1, marginLeft: 16 },
  choiceTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6, letterSpacing: -0.3 },
  choiceDesc: { fontSize: 14, fontWeight: '500' },
  bigInput: { fontSize: 44, fontWeight: '800', textAlign: 'center', borderBottomWidth: 2, paddingBottom: 10, marginBottom: 40, width: '100%', letterSpacing: -1 },
  primaryBtnShadow: { width: '100%', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8, borderRadius: 20 },
  primaryBtn: { padding: 20, borderRadius: 20, width: '100%', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  step4Container: { flex: 1 },
  step4Header: { padding: 24, paddingTop: 40 },
  jarCard: { padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  jarHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  jarNameInput: { fontSize: 18, fontWeight: '700', marginLeft: 14, borderBottomWidth: 1, paddingBottom: 4, flex: 1, marginRight: 12 },
  percentageInputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, height: 36 },
  percentageInput: { fontSize: 16, fontWeight: '800', width: 35, textAlign: 'center' },
  editTools: { marginTop: 20, gap: 16 },
  iconScroll: { flexDirection: 'row' },
  smallIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  colorScroll: { flexDirection: 'row' },
  colorCircle: { width: 32, height: 32, borderRadius: 16, marginRight: 16 },
  addJarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', marginBottom: 20 },
  addJarText: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  footer: { padding: 24, borderTopWidth: 1 },
});
