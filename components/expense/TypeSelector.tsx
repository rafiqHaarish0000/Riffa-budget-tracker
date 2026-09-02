import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
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
        label="Personal"
        active={value === 'personal'}
        onPress={() => onChange('personal')}
      />
      <TypeOption
        label="Shared"
        active={value === 'shared'}
        onPress={() => onChange('shared')}
      />
    </View>
  );
}

type TypeOptionProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function TypeOption({ label, active, onPress }: TypeOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.option, active && styles.optionActive]}
    >
      <ThemedText
        variant="bodyMedium"
        color={active ? colors.textInverse : colors.textSecondary}
      >
        {label}
      </ThemedText>
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
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  optionActive: {
    backgroundColor: colors.accent,
  },
});