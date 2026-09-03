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

/**
 * A single per-payer allocation toward an expense. `user_id` is the payer's
 * auth user id; `amount` is what that payer contributed. The sum of allocations
 * must equal the owning expense's `amount` (enforced server-side by RPCs).
 */
export type ExpensePayment = {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  created_at: string;
};

/**
 * A payer allocation as supplied when creating/updating an expense. Mirrors
 * `ExpensePayment` but omits the server-managed id/timestamps/expense link.
 */
export type ExpenseAllocation = {
  user_id: string;
  amount: number;
};

/** The shape the app sends to the atomic expense RPCs. */
export type NewExpenseWithPayments = {
  amount: number;
  category: string;
  type: ExpenseType;
  date: string;
  note?: string;
  /** One allocation per payer. Sum must equal `amount`. */
  payments: ExpenseAllocation[];
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
