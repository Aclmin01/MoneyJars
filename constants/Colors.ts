export const PRESET_COLORS = [
  { id: 'emerald', hex: '#10B981', name: 'Emerald' },
  { id: 'sapphire', hex: '#3B82F6', name: 'Sapphire' },
  { id: 'amethyst', hex: '#8B5CF6', name: 'Amethyst' },
  { id: 'ruby', hex: '#EF4444', name: 'Ruby' },
  { id: 'amber', hex: '#F59E0B', name: 'Amber' },
  { id: 'cyan', hex: '#06B6D4', name: 'Cyan' },
  { id: 'rose', hex: '#EC4899', name: 'Rose' },
];

export const getColors = (theme: 'light' | 'dark', primaryColor: string) => {
  if (theme === 'light') {
    return {
      text: '#111827',
      textSecondary: '#6B7280',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      border: '#E5E7EB',
      primary: primaryColor,
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      tabIconDefault: '#9CA3AF',
      tabIconSelected: primaryColor,
      tabBarBackground: '#FFFFFF',
    };
  } else {
    return {
      text: '#F9FAFB',
      textSecondary: '#9CA3AF',
      background: '#09090B',
      surface: '#18181B',
      border: '#27272A',
      primary: primaryColor,
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      tabIconDefault: '#52525B',
      tabIconSelected: primaryColor,
      tabBarBackground: '#18181B',
    };
  }
};

// Fallback for files that haven't been updated yet (if any), using Emerald as default
export const Colors = {
  light: getColors('light', '#10B981'),
  dark: getColors('dark', '#10B981'),
};
