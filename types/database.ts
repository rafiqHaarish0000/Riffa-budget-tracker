import type { User, AuthSessionUser } from './user';
import type { Family, FamilyMember } from './family';
import type { Expense } from './expense';
import type { SavingsGoal, SavingsContribution } from './savings';
import type { AppNotification } from './notification';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
      };
      families: {
        Row: Family;
      };
      family_members: {
        Row: FamilyMember;
      };
      expenses: {
        Row: Expense;
      };
      savings_goals: {
        Row: SavingsGoal;
      };
      savings_contributions: {
        Row: SavingsContribution;
      };
      notifications: {
        Row: AppNotification;
      };
    };
  };
};

export type {
  User,
  AuthSessionUser,
  Family,
  FamilyMember,
  Expense,
  SavingsGoal,
  SavingsContribution,
  AppNotification,
};
