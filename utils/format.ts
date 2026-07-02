import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

export const formatCurrency = (amount: number) => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
};

export const formatDate = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: vi });
  } catch (e) {
    return dateString;
  }
};
