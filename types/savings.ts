export type SavingsGoal = {
  id: string;
  family_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  monthly_target: number | null;
  created_at: string;
};

export type NewSavingsGoalInput = {
  name: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string | null;
  monthly_target?: number | null;
};

export type SavingsContribution = {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  date: string;
  created_at: string;
};

export type NewSavingsContributionInput = {
  goal_id: string;
  amount: number;
  date: string;
};
