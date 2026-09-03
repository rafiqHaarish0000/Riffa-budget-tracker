import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import type { ExpenseType } from '../../types/expense';
import { ThemedText } from '../ui/ThemedText';

type TypeSelectorProps = {
  value: ExpenseType;
  onChange: (value: ExpenseType) => void;
};

/** Two-option glass segmented control for Personal vs Shared expenses. */
export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup">
      <TypeOption
        icon="person-outline"
        label="Personal"
        active={value === 'personal'}
        onPress={() => onChange('personal')}
      />
      <TypeOption
        icon="people-outline"
        label="Shared"
        active={value === 'shared'}
        onPress={() => onChange('shared')}
      />
    </View>
  );
}

type TypeOptionProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
};

function TypeOption({ icon, label, active, onPress }: TypeOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.option, active && styles.optionActive]}
    >
      <View style={styles.optionContent}>
        <View style={[styles.optionIcon, active && styles.optionIconActive]}>
          <Ionicons
            name={icon}
            size={iconSizes.sm}
            color={active ? colors.textInverse : colors.textMuted}
          />
        </View>
        <ThemedText
          variant="bodyMedium"
          color={active ? colors.textInverse : colors.textSecondary}
        >
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  optionActive: {
    backgroundColor: colors.accent,
    ...{
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 2,
    },
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconActive: {
    backgroundColor: 'rgba(194, 244, 227, 0.2)',
  },
});