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

/** A contribution with the real contributor profile joined from `users`. */
export type SavingsContributionWithUser = SavingsContribution & {
  user?: {
    id: string;
    name: string | null;
  } | null;
};

export type ContributionsResult = {
  data: SavingsContributionWithUser[];
  error: Error | null;
};
