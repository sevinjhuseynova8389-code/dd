
export enum Category {
  Food = 'Еда',
  Transport = 'Транспорт',
  Housing = 'Жилье',
  Entertainment = 'Развлечения',
  Shopping = 'Покупки',
  Health = 'Здоровье',
  Other = 'Прочее'
}

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
}

export interface MonthlyData {
  name: string;
  amount: number;
}

export interface Insight {
  title: string;
  description: string;
  type: 'warning' | 'tip' | 'positive';
}
