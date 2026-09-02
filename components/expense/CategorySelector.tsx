import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import type { ExpenseCategory } from '../../types/expense';
import { CategoryIcon } from '../dashboard/CategoryIcon';
import { ThemedText } from '../ui/ThemedText';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Groceries',
  'Dining',
  'Transport',
  'Utilities',
  'Housing',
  'Health',
  'Entertainment',
  'Shopping',
  'Travel',
  'Education',
  'Personal',
  'Other',
];

type CategorySelectorProps = {
  selected: ExpenseCategory | null;
  onSelect: (category: ExpenseCategory) => void;
};

/**
 * iOS-style horizontal category picker using the project's existing
 * ExpenseCategory model and CategoryIcon visual language.
 */
export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {EXPENSE_CATEGORIES.map((category) => {
        const active = selected === category;
        return (
          <Pressable
            key={category}
            accessibilityRole="button"
            accessibilityLabel={`Category ${category}`}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(category)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && !active && styles.chipPressed,
            ]}
          >
            <CategoryIcon category={category} size={18} />
            <ThemedText
              variant="bodyMedium"
              color={active ? colors.textInverse : colors.text}
              style={styles.chipLabel}
            >
              {category}
            </ThemedText>
            {active ? (
              <Ionicons name="checkmark" size={16} color={colors.textInverse} />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipLabel: {
    maxWidth: 120,
  },
});