export type ExpenseType = 'personal' | 'shared';

export type Expense = {
  id: string;
  family_id: string;
  user_id: string;
  amount: number;
  category: string;
  type: ExpenseType;
  paid_by: string;
  date: string;
  note: string | null;
  created_at: string;
};

export type NewExpenseInput = {
  amount: number;
  category: string;
  type: ExpenseType;
  paid_by: string;
  date: string;
  note?: string;
};

export type ExpenseCategory =
  | 'Groceries'
  | 'Dining'
  | 'Transport'
  | 'Utilities'
  | 'Housing'
  | 'Health'
  | 'Entertainment'
  | 'Shopping'
  | 'Travel'
  | 'Education'
  | 'Personal'
  | 'Other';
