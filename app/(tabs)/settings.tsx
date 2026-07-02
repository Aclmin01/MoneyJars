import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { getColors, PRESET_COLORS } from '@/constants/Colors';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn, Layout } from 'react-native-reanimated';

export default function SettingsScreen() {
  const { theme, toggleTheme, syncMode, setSyncMode, resetStore, pinCode, setPinCode, primaryColor, setPrimaryColor, userName, userAvatar, setUserInfo, biometricEnabled, setBiometricEnabled } = useStore();
  const colors = getColors(theme, primaryColor);
  const isDark = theme === 'dark';

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAvatar, setDraftAvatar] = useState('');
  const AVATARS = ['👨', '👩', '👦', '👧', '🦊', '🐶', '🐱', '🐼', '🐯', '🐸', '🦄', '🐧'];

  const handleToggleSync = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncMode(syncMode === 'manual' ? 'auto' : 'manual');
  };

  const handleToggleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTheme();
  };

  const handleTogglePin = () => {
    setPinInput('');
    setPinError('');
    setPinModalVisible(true);
  };

  const submitPin = () => {
    if (pinInput.length !== 4) {
      setPinError('Mã PIN phải có 4 chữ số');
      return;
    }
    if (pinCode) {
      if (pinInput === pinCode) {
        setPinCode(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPinModalVisible(false);
        if (Platform.OS === 'web') window.alert('Đã tắt khóa ứng dụng');
      } else {
        setPinError('Mã PIN không đúng');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      setPinCode(pinInput);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPinModalVisible(false);
      if (Platform.OS === 'web') window.alert('Đã bật khóa ứng dụng');
    }
  };

  const handleReset = () => {
    const doReset = () => {
      resetStore();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/onboarding');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('CẢNH BÁO: Toàn bộ dữ liệu của bạn sẽ bị xoá vĩnh viễn và không thể khôi phục. Bạn có chắc chắn?')) {
        doReset();
      }
    } else {
      Alert.alert(
        'Xóa Toàn Bộ Dữ Liệu',
        'CẢNH BÁO: Toàn bộ dữ liệu của bạn sẽ bị xoá vĩnh viễn và không thể khôi phục. Bạn có chắc chắn?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa Sạch', style: 'destructive', onPress: doReset }
        ]
      );
    }
  };

  const renderToggleSwitch = (isOn: boolean, onColor: string) => (
    <View style={[
      styles.toggleTrack,
      { backgroundColor: isOn ? onColor : isDark ? '#3A3A3C' : '#D1D1D6' }
    ]}>
      <View style={[
        styles.toggleThumb,
        {
          backgroundColor: '#FFFFFF',
          transform: [{ translateX: isOn ? 20 : 2 }],
          ...(isOn ? { shadowColor: onColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 } : {}),
        }
      ]} />
    </View>
  );

  const renderSettingIcon = (name: string, color: string, bgColor: string) => (
    <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
      <Ionicons name={name as any} size={20} color={color} />
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={isDark ? ['#1B5E20', '#0A3D22', colors.background] : ['#E8F9EE', '#F2FCEE', colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View entering={FadeInUp.springify()} style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            activeOpacity={0.8}
            onPress={() => {
              setDraftName(userName);
              setDraftAvatar(userAvatar || '👤');
              setProfileModalVisible(true);
            }}
          >
            <View style={[styles.avatarGradient, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 3 }]}>
              <Text style={{ fontSize: 40 }}>{userAvatar || '👤'}</Text>
            </View>
            <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Ionicons name="pencil" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{userName || 'Chưa thiết lập tên'}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Nhấn vào ảnh đại diện để sửa hồ sơ</Text>
        </Animated.View>
      </LinearGradient>

      <Animated.View entering={FadeInDown.delay(50).springify()} layout={Layout.springify()} style={[styles.section, { marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>THÀNH TÍCH</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
          {useStore(s => s.badges).map((b, i) => (
            <View key={b.id} style={[styles.badgeCard, { backgroundColor: colors.surface, borderColor: b.earnedAt ? colors.primary : colors.border, opacity: b.earnedAt ? 1 : 0.6 }]}>
              <View style={[styles.badgeIconWrap, { backgroundColor: b.earnedAt ? colors.primary + '20' : colors.textSecondary + '20' }]}>
                <Ionicons name={b.icon as any} size={28} color={b.earnedAt ? colors.primary : colors.textSecondary} />
              </View>
              <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={1}>{b.name}</Text>
              <Text style={[styles.badgeDesc, { color: colors.textSecondary }]} numberOfLines={2}>{b.description}</Text>
              {b.earnedAt ? (
                <View style={[styles.badgeStatus, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
              ) : (
                <View style={[styles.badgeStatus, { backgroundColor: colors.textSecondary }]}>
                  <Ionicons name="lock-closed" size={10} color="#FFF" />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()} layout={Layout.springify()} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>GIAO DIỆN</Text>
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleToggleTheme} activeOpacity={0.7}>
          <View style={styles.cardInner}>
            {renderSettingIcon(isDark ? 'moon' : 'sunny', "#FFF", isDark ? '#8B5CF6' : '#F59E0B')}
            <View style={styles.cardText}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Chế độ nền</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{isDark ? 'Đang sử dụng giao diện tối' : 'Đang sử dụng giao diện sáng'}</Text>
            </View>
          </View>
          {renderToggleSwitch(isDark, colors.primary)}
        </TouchableOpacity>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={[styles.cardInner, { marginBottom: 16 }]}>
            {renderSettingIcon('color-palette', "#FFF", colors.primary)}
            <View style={styles.cardText}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Màu chủ đạo</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Cá nhân hóa màu sắc của ứng dụng</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
            {PRESET_COLORS.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setPrimaryColor(c.hex)}
                style={[
                  styles.colorCircleBtn,
                  { backgroundColor: c.hex },
                  primaryColor === c.hex && { borderColor: colors.text, borderWidth: 3 }
                ]}
              >
                {primaryColor === c.hex && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).springify()} layout={Layout.springify()} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NGUỒN DỮ LIỆU</Text>
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleToggleSync} activeOpacity={0.7}>
          <View style={styles.cardInner}>
            {renderSettingIcon(syncMode === 'auto' ? 'sync' : 'create', "#FFF", syncMode === 'auto' ? '#3B82F6' : '#F59E0B')}
            <View style={styles.cardText}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Chế độ lấy thông tin</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{syncMode === 'auto' ? 'Từ bên ngoài (Ngân hàng/App)' : 'Tự thiết lập thủ công'}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statusPill, { backgroundColor: syncMode === 'auto' ? (isDark ? '#3B82F625' : '#3B82F615') : (isDark ? '#F59E0B25' : '#F59E0B15') }]}>
              <View style={[styles.statusDot, { backgroundColor: syncMode === 'auto' ? '#3B82F6' : '#F59E0B' }]} />
              <Text style={[styles.statusText, { color: syncMode === 'auto' ? '#3B82F6' : '#F59E0B' }]}>{syncMode === 'auto' ? 'Tự động' : 'Thủ công'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>


      <Animated.View entering={FadeInDown.delay(200).springify()} layout={Layout.springify()} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BẢO MẬT</Text>
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleTogglePin} activeOpacity={0.7}>
          <View style={styles.cardInner}>
            {renderSettingIcon(pinCode ? 'lock-closed' : 'lock-open', "#FFF", pinCode ? colors.primary : '#9CA3AF')}
            <View style={styles.cardText}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Khóa ứng dụng (Mã PIN)</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>{pinCode ? 'Đang bật — nhấn để tắt' : 'Chưa thiết lập — nhấn để bật'}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statusPill, { backgroundColor: pinCode ? colors.primary + '15' : '#9CA3AF15' }]}>
              <View style={[styles.statusDot, { backgroundColor: pinCode ? colors.primary : '#9CA3AF' }]} />
              <Text style={[styles.statusText, { color: pinCode ? colors.primary : '#9CA3AF' }]}>{pinCode ? 'Đang bật' : 'Tắt'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {pinCode && (
          <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBiometricEnabled(!biometricEnabled); }} activeOpacity={0.7}>
            <View style={styles.cardInner}>
              {renderSettingIcon('scan', "#FFF", biometricEnabled ? colors.primary : '#9CA3AF')}
              <View style={styles.cardText}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Mở khóa Sinh trắc học</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>FaceID / TouchID</Text>
              </View>
            </View>
            {renderToggleSwitch(biometricEnabled, colors.primary)}
          </TouchableOpacity>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).springify()} layout={Layout.springify()} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.error }]}>KHU VỰC NGUY HIỂM</Text>
        <TouchableOpacity style={[styles.dangerCard, { backgroundColor: colors.error + '08', borderColor: colors.error + '20' }]} onPress={handleReset} activeOpacity={0.7}>
          <View style={styles.cardInner}>
            {renderSettingIcon("trash-bin", "#FFF", colors.error)}
            <View style={styles.cardText}>
              <Text style={[styles.settingLabel, { color: colors.error }]}>Xóa toàn bộ dữ liệu</Text>
              <Text style={[styles.settingDesc, { color: colors.error, opacity: 0.8 }]}>Đưa app về trạng thái như mới cài đặt</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.error} style={{ opacity: 0.5 }} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.footer}>
        <View style={[styles.footerInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.footerRow}>
            {renderSettingIcon("information-circle-outline", "#FFF", "#9CA3AF")}
            <Text style={[styles.settingLabel, { color: colors.text, flex: 1, marginLeft: 12 }]}>Phiên bản ứng dụng</Text>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>v1.0.0</Text>
          </View>
        </View>

        <View style={styles.brandingContainer}>
          <LinearGradient colors={[colors.primary, colors.primary + 'DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.brandingIcon}>
            <Ionicons name="wallet" size={22} color="#FFF" />
          </LinearGradient>
          <Text style={[styles.brandingName, { color: colors.text }]}>Money Jars</Text>
          <Text style={[styles.brandingTagline, { color: colors.textSecondary }]}>Quản lý tài chính thông minh</Text>
          <Text style={[styles.copyright, { color: colors.textSecondary }]}>© 2026 Money Jars • v1.0.0</Text>
        </View>
      </Animated.View>

      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.springify()} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <LinearGradient colors={pinCode ? ['#F59E0B', '#D97706'] : [colors.primary, colors.primary + 'DD']} style={styles.modalIcon}>
              <Ionicons name={pinCode ? 'lock-open' : 'lock-closed'} size={32} color="#FFF" />
            </LinearGradient>

            <Text style={[styles.modalTitle, { color: colors.text }]}>{pinCode ? 'Nhập mã PIN hiện tại' : 'Tạo mã PIN mới'}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{pinCode ? 'Xác minh danh tính để tắt bảo mật' : 'Bảo vệ ứng dụng với mã PIN 4 số'}</Text>

            <View style={[styles.pinInputContainer, { backgroundColor: isDark ? '#27272A' : '#F8F9FA', borderColor: pinError ? colors.error : colors.border }]}>
              <TextInput
                style={[styles.pinInput, { color: colors.text }]}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                autoFocus
                value={pinInput}
                onChangeText={setPinInput}
                placeholder="• • • •"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.pinDot, { backgroundColor: pinInput.length > i ? colors.primary : colors.border, transform: [{ scale: pinInput.length > i ? 1.2 : 1 }] }]} />
              ))}
            </View>

            {pinError ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{pinError}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtnCancel, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]} onPress={() => setPinModalVisible(false)} activeOpacity={0.7}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={submitPin} activeOpacity={0.7}>
                <LinearGradient colors={[colors.primary, colors.primary + 'DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalBtnGradient}>
                  <Text style={styles.modalBtnConfirmText}>Xác nhận</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal visible={profileModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View entering={ZoomIn.springify()} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sửa hồ sơ</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Chọn ảnh đại diện và tên mới</Text>

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

            <View style={{ width: '100%', marginBottom: 24, marginTop: 10 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Tên hiển thị</Text>
              <TextInput
                style={[styles.nameInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Nhập tên của bạn"
                placeholderTextColor={colors.textSecondary}
                value={draftName}
                onChangeText={setDraftName}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtnCancel, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]} onPress={() => setProfileModalVisible(false)} activeOpacity={0.7}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalBtnConfirm} 
                activeOpacity={0.7}
                onPress={() => {
                  if (!draftName.trim()) {
                    Alert.alert('Lỗi', 'Tên không được để trống');
                    return;
                  }
                  setUserInfo(draftName.trim(), draftAvatar);
                  setProfileModalVisible(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <LinearGradient colors={[colors.primary, colors.primary + 'DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalBtnGradient}>
                  <Text style={styles.modalBtnConfirmText}>Lưu</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { alignItems: 'center' },
  avatarContainer: { marginBottom: 16, position: 'relative' },
  avatarGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8 },
  avatarBadge: { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 4, fontWeight: '600' },
  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800', marginBottom: 12, marginLeft: 8, letterSpacing: 1 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardInner: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardText: { marginLeft: 14, flex: 1 },
  cardRight: { marginLeft: 10 },
  settingLabel: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  settingDesc: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
  toggleThumb: { width: 24, height: 24, borderRadius: 12 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '800' },
  hintCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 16, marginTop: 4, gap: 10, borderWidth: 1 },
  hintText: { fontSize: 13, lineHeight: 18, flex: 1, fontWeight: '600' },
  dangerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 20, borderWidth: 1 },
  footer: { marginTop: 32, paddingHorizontal: 20, paddingBottom: 40 },
  footerInfoCard: { padding: 18, borderRadius: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  versionText: { fontSize: 15, fontWeight: '700' },
  brandingContainer: { alignItems: 'center', marginTop: 32, paddingBottom: 16 },
  brandingIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  brandingName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  brandingTagline: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  copyright: { fontSize: 12, marginTop: 10, fontWeight: '500' },
  colorCircleBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { padding: 32, borderRadius: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 16 },
  modalIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, fontWeight: '500' },
  pinInputContainer: { borderRadius: 16, borderWidth: 1.5, width: '80%', marginBottom: 16, overflow: 'hidden' },
  pinInput: { fontSize: 32, letterSpacing: 16, paddingVertical: 16, paddingHorizontal: 20, textAlign: 'center', fontWeight: '800' },
  pinDots: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  pinDot: { width: 12, height: 12, borderRadius: 6 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '700' },
  modalActions: { flexDirection: 'row', width: '100%', gap: 12, marginTop: 8 },
  modalBtnCancel: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  modalBtnConfirm: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  modalBtnGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  modalBtnText: { fontSize: 16, fontWeight: '700' },
  modalBtnConfirmText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  avatarSelectionContainer: { width: '100%', alignItems: 'center', marginBottom: 10 },
  selectedAvatarBox: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  selectedAvatarText: { fontSize: 40 },
  avatarList: { gap: 8, paddingHorizontal: 4 },
  avatarOption: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  avatarOptionText: { fontSize: 24 },
  inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  nameInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '600' },
  badgeCard: { width: 140, padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  badgeIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  badgeName: { fontSize: 13, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  badgeDesc: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  badgeStatus: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
});
