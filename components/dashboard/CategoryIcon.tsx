import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius } from '../../constants/theme';
import type { ExpenseCategory } from '../../types/expense';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICONS: Record<ExpenseCategory, { icon: IconName; color: string }> = {
  Groceries: { icon: 'cart', color: colors.accentStrong },
  Dining: { icon: 'restaurant', color: colors.danger },
  Transport: { icon: 'car', color: colors.info },
  Utilities: { icon: 'flash', color: colors.warning },
  Housing: { icon: 'home', color: colors.accent },
  Health: { icon: 'medkit', color: colors.danger },
  Entertainment: { icon: 'film', color: colors.info },
  Shopping: { icon: 'bag-handle', color: colors.accentStrong },
  Travel: { icon: 'airplane', color: colors.info },
  Education: { icon: 'school', color: colors.accent },
  Personal: { icon: 'person', color: colors.textSecondary },
  Other: { icon: 'ellipsis-horizontal', color: colors.textMuted },
};

type CategoryIconProps = {
  category: string;
  size?: number;
};

export function CategoryIcon({ category, size = iconSizes.md }: CategoryIconProps) {
  const fallback = CATEGORY_ICONS.Other;
  const match = CATEGORY_ICONS[category as ExpenseCategory] ?? fallback;
  const icon = match?.icon ?? fallback.icon;
  const color = match?.color ?? fallback.color;

  return (
    <View style={styles.circle}>
      <Ionicons name={icon} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});