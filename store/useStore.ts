import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { API_CONFIG } from '@/constants/ApiConfig';

export interface Jar {
  id: string;
  name: string;
  percentage: number;
  balance: number;
  icon: string;
  color: string;
  goalAmount?: number;
};

export type TransactionCategory = 'Ăn uống' | 'Di chuyển' | 'Mua sắm' | 'Giải trí' | 'Giáo dục' | 'Khác';

export interface RecurringTx {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  name: string;
  dayOfMonth: number;
  lastProcessedMonth: string; // Format: YYYY-MM
  jarId?: string; // If income, maybe null (auto-split) or unallocated
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense' | 'internal_transfer';
  jarId?: string; // id of the jar (for expense or specific income)
  fromJarId?: string; // for internal transfer
  toJarId?: string; // for internal transfer
  note: string;
  date: string;
  currency?: string; // VND, USD, EUR
  originalAmount?: number;
  isAutoSplit?: boolean;
  autoSplitGroupId?: string;
  isBankSync?: boolean;
  bankName?: string;
  category?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  color: string;
  deadline?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
}

export const DEFAULT_BADGES: Badge[] = [
  { id: 'b1', name: 'Bắt đầu hành trình', description: 'Hoàn thành việc tạo hũ lần đầu', icon: 'rocket' },
  { id: 'b2', name: 'Đại gia', description: 'Tổng tài sản vượt mốc 50 triệu', icon: 'diamond' },
  { id: 'b3', name: 'Bàn tay vàng', description: '7 ngày không có giao dịch chi tiêu', icon: 'star' },
  { id: 'b4', name: 'Người tiết kiệm', description: 'Hoàn thành mục tiêu đầu tiên', icon: 'trophy' }
];

export type ThemeType = 'dark' | 'light';
export type SyncMode = 'manual' | 'auto';

export interface StoreState {
  isOnboarded: boolean;
  theme: ThemeType;
  primaryColor: string;
  userName: string;
  userAvatar: string;
  syncMode: SyncMode;
  jars: Jar[];
  unallocatedBalance: number;
  transactions: Transaction[];
  pinCode: string | null;
  biometricEnabled: boolean;
  goals: Goal[];
  badges: Badge[];
  addIncome: (amount: number, specificJarId: string | null, note: string, date: string) => void;
  addExpense: (amount: number, jarId: string, category: string, note: string, date: string) => void;
  addTransfer: (amount: number, fromJarId: string, toJarId: string, note: string, date: string) => void;
  transfer: (amount: number, fromJarId: string, toJarId: string, note: string, date: string) => void;
  setJarsAndUnallocated: (jars: Jar[], unallocatedBalance: number) => void;
  addTransaction: (tx: Transaction) => void;
  setJars: (jars: Jar[]) => void;
  setUnallocatedBalance: (amount: number) => void;
  toggleTheme: () => void;
  setPrimaryColor: (color: string) => void;
  setUserInfo: (name: string, avatar: string) => void;
  setSyncMode: (mode: SyncMode) => void;
  setOnboarded: (val: boolean) => void;
  addJar: (jar: Omit<Jar, 'id' | 'balance'>) => void;
  updateJar: (id: string, jar: Partial<Omit<Jar, 'id' | 'balance'>>) => void;
  deleteJar: (id: string) => void;
  updateJarsConfig: (updates: { id: string; name: string; percentage: number; goalAmount?: number }[]) => void;
  setPinCode: (pin: string | null) => void;
  
  recurringTxs: RecurringTx[];
  addRecurringTx: (tx: Omit<RecurringTx, 'id' | 'lastProcessedMonth'>) => void;
  removeRecurringTx: (id: string) => void;
  processRecurring: () => void;
  
  syncBankTransactions: () => Promise<void>;
  
  // New features
  setBiometricEnabled: (enabled: boolean) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'currentAmount'>) => void;
  contributeToGoal: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;
  checkBadges: () => void;

  resetStore: () => void;
};

const DEFAULT_JARS: Jar[] = [];

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      isOnboarded: false,
      theme: 'dark',
      primaryColor: '#10B981',
      userName: '',
      userAvatar: '👤',
      syncMode: 'manual',
      jars: DEFAULT_JARS,
      unallocatedBalance: 0,
      transactions: [],
      pinCode: null,
      biometricEnabled: false,
      goals: [],
      badges: DEFAULT_BADGES,
      recurringTxs: [],

      addIncome: (amount, jarId, note, date) =>
        set((state) => {
          let newTransactions: Transaction[] = [];
          let newJars = [...state.jars];
          let newUnallocated = state.unallocatedBalance;

          if (jarId === null) {
            // Auto-split
            const groupId = uuid.v4() as string;
            let totalDistributed = 0;
            
            state.jars.forEach((jar) => {
              const jarAmount = Math.floor(amount * (jar.percentage / 100));
              totalDistributed += jarAmount;
              if (jarAmount > 0) {
                newTransactions.push({
                  id: uuid.v4() as string,
                  type: 'income',
                  amount: jarAmount,
                  date,
                  note: note || `Auto-split thu nhập`,
                  jarId: jar.id,
                  isAutoSplit: true,
                  autoSplitGroupId: groupId,
                });
                
                const jarIndex = newJars.findIndex((j) => j.id === jar.id);
                if (jarIndex !== -1) {
                  newJars[jarIndex] = { ...newJars[jarIndex], balance: newJars[jarIndex].balance + jarAmount };
                }
              }
            });
            
            // The rest goes to unallocated
            const remainder = amount - totalDistributed;
            if (remainder > 0) {
              newUnallocated += remainder;
              newTransactions.push({
                id: uuid.v4() as string,
                type: 'income',
                amount: remainder,
                date,
                note: note || `Auto-split thu nhập (Chưa phân bổ)`,
                jarId: 'unallocated',
                isAutoSplit: true,
                autoSplitGroupId: groupId,
              });
            }

            const updatedState = {
              jars: newJars,
              unallocatedBalance: newUnallocated,
              transactions: [...newTransactions, ...state.transactions],
            };
            get().checkBadges();
            return updatedState;
          } else {
            // Single jar income
            newTransactions.push({
              id: uuid.v4() as string,
              type: 'income',
              amount,
              date,
              note,
              jarId,
            });
            if (jarId === 'unallocated') {
              newUnallocated += amount;
            } else {
              const jarIndex = newJars.findIndex((j) => j.id === jarId);
              if (jarIndex !== -1) {
                newJars[jarIndex] = { ...newJars[jarIndex], balance: newJars[jarIndex].balance + amount };
              }
            }
          }

          get().checkBadges();
          return {
            jars: newJars,
            unallocatedBalance: newUnallocated,
            transactions: [...newTransactions, ...state.transactions], // Prepend to show newest first easily
          };
        }),

      addExpense: (amount, jarId, category, note, date) =>
        set((state) => {
          const newTx: Transaction = {
            id: uuid.v4() as string,
            type: 'expense',
            amount,
            category,
            note,
            jarId,
            date,
          };

          let newJars = [...state.jars];
          let newUnallocated = state.unallocatedBalance;

          if (jarId === 'unallocated') {
            newUnallocated -= amount;
          } else {
            newJars = newJars.map((j) => (j.id === jarId ? { ...j, balance: j.balance - amount } : j));
          }

          get().checkBadges();
          return {
            jars: newJars,
            unallocatedBalance: newUnallocated,
            transactions: [newTx, ...state.transactions],
          };
        }),

      addTransfer: (amount, fromJarId, toJarId, note, date) =>
        set((state) => {
          const newTx: Transaction = {
            id: uuid.v4() as string,
            type: 'internal_transfer',
            amount,
            fromJarId,
            toJarId,
            note,
            date,
          };

          let newJars = [...state.jars];
          let newUnallocated = state.unallocatedBalance;

          // Deduct from source
          if (fromJarId === 'unallocated') {
            newUnallocated -= amount;
          } else {
            newJars = newJars.map((j) => (j.id === fromJarId ? { ...j, balance: j.balance - amount } : j));
          }

          // Add to destination
          if (toJarId === 'unallocated') {
            newUnallocated += amount;
          } else {
            newJars = newJars.map((j) => (j.id === toJarId ? { ...j, balance: j.balance + amount } : j));
          }

          return {
            jars: newJars,
            unallocatedBalance: newUnallocated,
            transactions: [newTx, ...state.transactions],
          };
        }),

      transfer: (amount, fromJarId, toJarId, note, date) =>
        set((state) => {
          const fromIndex = state.jars.findIndex((j) => j.id === fromJarId);
          const toIndex = state.jars.findIndex((j) => j.id === toJarId);
          if (fromIndex === -1 || toIndex === -1) return state;

          const newJars = [...state.jars];
          newJars[fromIndex] = { ...newJars[fromIndex], balance: newJars[fromIndex].balance - amount };
          newJars[toIndex] = { ...newJars[toIndex], balance: newJars[toIndex].balance + amount };

          const newTx: Transaction = {
            id: uuid.v4() as string,
            type: 'internal_transfer',
            amount,
            date,
            note,
            fromJarId,
            toJarId,
          };

          return {
            jars: newJars,
            transactions: [newTx, ...state.transactions],
          };
        }),

      setJarsAndUnallocated: (jars, unallocatedBalance) => set({ jars, unallocatedBalance }),

      addTransaction: (tx: Transaction) => set(state => ({
        transactions: [tx, ...state.transactions]
      })),

      setJars: (jars) => set({ jars }),
      
      setUnallocatedBalance: (unallocatedBalance) => set({ unallocatedBalance }),
      
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      
      setPrimaryColor: (color) => set({ primaryColor: color }),

      setUserInfo: (name, avatar) => set({ userName: name, userAvatar: avatar }),

      setSyncMode: (mode) => set({ syncMode: mode }),

      setOnboarded: (val) => set({ isOnboarded: val }),

      addJar: (jar) =>
        set((state) => ({
          jars: [...state.jars, { ...jar, id: uuid.v4() as string, balance: 0 }],
        })),

      updateJar: (id, jarUpdate) =>
        set((state) => ({
          jars: state.jars.map((j) => (j.id === id ? { ...j, ...jarUpdate } : j)),
        })),

      deleteJar: (id) =>
        set((state) => ({
          jars: state.jars.filter((j) => j.id !== id),
        })),

      updateJarsConfig: (updates) =>
        set((state) => {
          const newJars = state.jars.map((j) => {
            const up = updates.find((u) => u.id === j.id);
            if (up) return { ...j, name: up.name, percentage: up.percentage, goalAmount: up.goalAmount };
            return j;
          });
          return { jars: newJars };
        }),

      setPinCode: (pinCode) => set({ pinCode }),

      addRecurringTx: (txData) => set((state) => {
        const newTx: RecurringTx = {
          ...txData,
          id: Date.now().toString(),
          lastProcessedMonth: '', // Has not run yet
        };
        return { recurringTxs: [...state.recurringTxs, newTx] };
      }),

      removeRecurringTx: (id) => set((state) => ({
        recurringTxs: state.recurringTxs.filter(t => t.id !== id)
      })),

      processRecurring: () => set((state) => {
        const today = new Date();
        const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
        const currentDay = today.getDate();
        
        let newTransactions = [...state.transactions];
        let newUnallocated = state.unallocatedBalance;
        let newJars = [...state.jars];
        let newRecurringTxs = [...state.recurringTxs];
        let hasChanges = false;

        newRecurringTxs = newRecurringTxs.map(rtx => {
          if (rtx.lastProcessedMonth !== currentMonthStr && currentDay >= rtx.dayOfMonth) {
            hasChanges = true;
            // Need to process
            const newTx: Transaction = {
              id: Date.now().toString() + Math.random().toString(),
              type: rtx.type,
              amount: rtx.amount,
              note: `[Định kỳ] ${rtx.name}`,
              date: new Date().toISOString(),
              jarId: rtx.jarId,
            };
            newTransactions.unshift(newTx);

            if (rtx.type === 'income') {
              if (!rtx.jarId) {
                // Auto split
                let leftover = rtx.amount;
                newJars = newJars.map((j) => {
                  const share = Math.floor(rtx.amount * (j.percentage / 100));
                  leftover -= share;
                  return { ...j, balance: j.balance + share };
                });
                newUnallocated += leftover;
              } else if (rtx.jarId === 'unallocated') {
                newUnallocated += rtx.amount;
              } else {
                newJars = newJars.map((j) => (j.id === rtx.jarId ? { ...j, balance: j.balance + rtx.amount } : j));
              }
            } else if (rtx.type === 'expense') {
              if (rtx.jarId === 'unallocated') {
                newUnallocated -= rtx.amount;
              } else if (rtx.jarId) {
                newJars = newJars.map((j) => (j.id === rtx.jarId ? { ...j, balance: j.balance - rtx.amount } : j));
              }
            }
            return { ...rtx, lastProcessedMonth: currentMonthStr };
          }
          return rtx;
        });

        if (!hasChanges) return state;

        return {
          transactions: newTransactions,
          jars: newJars,
          unallocatedBalance: newUnallocated,
          recurringTxs: newRecurringTxs,
        };
      }),

      syncBankTransactions: async () => {
        try {
          const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/transactions`, {
            headers: { 'x-api-key': API_CONFIG.API_KEY }
          });
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            set((state) => {
              let newTransactions = [...state.transactions];
              let newUnallocated = state.unallocatedBalance;
              let hasChanges = false;

              json.data.forEach((backendTx: any) => {
                const exists = state.transactions.find(t => t.id === backendTx.id);
                if (!exists) {
                  hasChanges = true;
                  const newTx: Transaction = {
                    id: backendTx.id,
                    type: backendTx.type,
                    amount: backendTx.amount,
                    date: backendTx.createdAt,
                    note: `[${backendTx.bankName}] ${backendTx.note}`,
                    jarId: 'unallocated',
                    isBankSync: true,
                    bankName: backendTx.bankName,
                  };
                  newTransactions.unshift(newTx);
                  
                  if (backendTx.type === 'income') {
                    newUnallocated += backendTx.amount;
                  } else {
                    newUnallocated -= backendTx.amount;
                  }
                }
              });

              if (!hasChanges) return state;

              // Sort by date desc
              newTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return {
                transactions: newTransactions,
                unallocatedBalance: newUnallocated,
              };
            });
          }
        } catch (error) {
          console.log('Sync Bank Error:', error);
          throw error;
        }
      },

      setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),

      addGoal: (goal) => set((state) => ({
        goals: [...state.goals, { ...goal, id: Date.now().toString(), currentAmount: 0 }]
      })),

      contributeToGoal: (id, amount) => set((state) => {
        if (state.unallocatedBalance < amount) return state; // Deduct from unallocated
        return {
          unallocatedBalance: state.unallocatedBalance - amount,
          goals: state.goals.map(g => g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g)
        };
      }),

      deleteGoal: (id) => set((state) => ({
        goals: state.goals.filter(g => g.id !== id)
      })),

      checkBadges: () => set((state) => {
        const newBadges = [...state.badges];
        let updated = false;
        
        const unlock = (id: string) => {
          const b = newBadges.find(x => x.id === id);
          if (b && !b.earnedAt) { b.earnedAt = new Date().toISOString(); updated = true; }
        };

        if (state.jars.length > 0) unlock('b1');
        
        const totalBal = state.unallocatedBalance + state.jars.reduce((s,j)=>s+j.balance,0);
        if (totalBal >= 50000000) unlock('b2');

        const goalsCompleted = state.goals.some(g => g.currentAmount >= g.targetAmount);
        if (goalsCompleted) unlock('b4');

        const hasExpensesIn7Days = state.transactions.some(tx => {
          if (tx.type !== 'expense') return false;
          const txDate = new Date(tx.date);
          const now = new Date();
          const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
          return diffDays <= 7;
        });
        if (!hasExpensesIn7Days && state.transactions.length > 5) unlock('b3');

        return updated ? { badges: newBadges } : state;
      }),

      resetStore: () => set({
        isOnboarded: false,
        theme: 'dark',
        primaryColor: '#10B981',
        userName: '',
        userAvatar: '👤',
        syncMode: 'manual',
        jars: [],
        unallocatedBalance: 0,
        transactions: [],
        pinCode: null,
        biometricEnabled: false,
        goals: [],
        badges: DEFAULT_BADGES,
        recurringTxs: [],
      }),
    }),
    {
      name: 'money-jars-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
