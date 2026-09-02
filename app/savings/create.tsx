import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { AmountInput, parseAmount } from '../../components/expense/AmountInput';
import { TargetDateField } from '../../components/savings/TargetDateField';
import { GlassButton, GlassCard, GlassInput } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useSavings } from '../../hooks/useSavings';
import { isSupabaseConfigured } from '../../lib/supabase';
import { formatDateLabel } from '../../utils/date';
import { formatCurrency } from '../../utils/format';

const MIN_SUBMIT_VISIBLE_MS = 350;
const MAX_NAME_LENGTH = 60;
const DEFAULT_CURRENT = '0';

export default function CreateSavingsScreen() {
  const { user } = useAuth();
  const { createGoal } = useSavings(user?.family_id ?? null, user?.id ?? null);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [monthlyTarget, setMonthlyTarget] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const targetNumber = parseAmount(targetAmount);
  const targetHasText = targetAmount.trim().length > 0;
  const currentParsed = parseAmount(currentAmount);
  const currentNumber = currentAmount.trim().length === 0 ? 0 : currentParsed;
  const monthlyParsed = parseAmount(monthlyTarget);
  const monthlyHasText = monthlyTarget.trim().length > 0;

  const nameError = trimmedName.length === 0;
  const targetInvalid = targetHasText && (targetNumber === null || targetNumber <= 0);
  const currentInvalid =
    currentAmount.trim().length > 0 && (currentParsed === null || currentParsed < 0);
  const currentExceedsTarget =
    currentAmount.trim().length > 0 &&
    targetNumber !== null &&
    targetNumber > 0 &&
    (currentParsed ?? 0) > targetNumber;
  const monthlyInvalid =
    monthlyHasText && (monthlyParsed === null || monthlyParsed <= 0);

  const showNameError = touched && nameError;
  const showTargetError = touched && !targetHasText ? true : targetInvalid;
  const showCurrentError = touched && (currentInvalid || currentExceedsTarget);
  const showMonthlyError = touched && monthlyInvalid;

  const targetDateNumber = targetDate ? new Date(`${targetDate}T00:00:00`) : null;
  const today = new Date();
  const targetBeforeToday =
    targetDateNumber !== null && targetDateNumber.getTime() < today.getTime();
  const targetDateInvalid = targetDate !== null && targetBeforeToday;
  const showTargetDateError = touched && targetDateInvalid;

  const canSave =
    trimmedName.length >= 2 &&
    !nameError &&
    !targetInvalid &&
    targetHasText &&
    targetNumber !== null &&
    targetNumber > 0 &&
    !currentInvalid &&
    !currentExceedsTarget &&
    !monthlyInvalid &&
    !targetDateInvalid;

  const preview = useMemo(() => {
    if (!targetHasText || targetNumber === null || targetNumber <= 0) {
      return null;
    }
    const current = currentNumber ?? 0;
    const safeProgress =
      targetNumber > 0 ? Math.min(1, Math.max(0, current / targetNumber)) : 0;
    return {
      percent: Math.round(safeProgress * 100),
      current,
    };
  }, [targetHasText, targetNumber, currentNumber]);

  async function handleCreate() {
    if (submitting) {
      return;
    }
    const parsedTarget = parseAmount(targetAmount);
    if (trimmedName.length === 0) {
      setError('Please enter a goal name.');
      return;
    }
    if (parsedTarget === null || parsedTarget <= 0) {
      setError('Enter a target amount greater than ₹0.');
      return;
    }
    const parsedCurrent = currentAmount.trim().length === 0 ? 0 : parseAmount(currentAmount);
    const saved = parsedCurrent === null ? 0 : parsedCurrent;
    if (saved > parsedTarget) {
      setError("Already saved can't be greater than the target.");
      return;
    }
    const parsedMonthly = monthlyHasText ? monthlyParsed : null;
    if (monthlyHasText && (parsedMonthly === null || parsedMonthly <= 0)) {
      setError('Enter a monthly target greater than ₹0.');
      return;
    }
    if (targetDateInvalid) {
      setError('Choose today or a future date.');
      return;
    }

    setError(null);
    setSubmitting(true);
    const startedAt = Date.now();

    let submitError: string | null = null;
    if (!isSupabaseConfigured) {
      submitError =
        "Savings isn't connected yet. Add your Supabase configuration to create goals.";
    } else if (!user?.family_id) {
      submitError = 'Please complete your family setup before creating a goal.';
    } else {
      const { error: dbError } = await createGoal({
        name: trimmedName,
        target_amount: parsedTarget,
        ...(currentAmount.trim().length > 0 ? { current_amount: saved } : {}),
        ...(targetDate ? { target_date: targetDate } : {}),
        ...(monthlyHasText && parsedMonthly !== null
          ? { monthly_target: parsedMonthly }
          : {}),
      });
      submitError = dbError ? mapSavingsError(dbError) : null;
    }

    const remaining = MIN_SUBMIT_VISIBLE_MS - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }
    router.back();
  }

  return (
    <ThemedScreen scroll keyboardShouldPersistTaps="handled">
      <ThemedText variant="caption" color={colors.textMuted} style={styles.supporting}>
        Give your next goal a name, target, and plan.
      </ThemedText>

      <FadeInView delay={0} style={styles.section}>
        <GlassInput
          label="Goal name"
          placeholder="e.g. New Home"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={(v) => {
            if (v.length <= MAX_NAME_LENGTH) {
              setName(v);
            }
            setTouched(true);
            setError(null);
          }}
          editable={!submitting}
          autoCapitalize="words"
          returnKeyType="done"
          accessibilityLabel="Goal name"
        />
        {showNameError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            Please enter a goal name.
          </ThemedText>
        ) : null}
      </FadeInView>

      <FadeInView delay={60} style={styles.section}>
        <AmountInput
          label="Target amount"
          value={targetAmount}
          onChangeText={(v) => {
            setTargetAmount(v);
            setTouched(true);
            setError(null);
          }}
          editable={!submitting}
        />
        {showTargetError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            Enter a target amount greater than ₹0.
          </ThemedText>
        ) : null}
      </FadeInView>

      <FadeInView delay={120} style={styles.section}>
        <AmountInput
          label="Already saved"
          value={currentAmount}
          onChangeText={(v) => {
            setCurrentAmount(v);
            setTouched(true);
            setError(null);
          }}
          editable={!submitting}
        />
        {showCurrentError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            {currentExceedsTarget
              ? "Already saved can't be greater than the target."
              : 'Enter a valid amount.'}
          </ThemedText>
        ) : null}
      </FadeInView>

      <FadeInView delay={180} style={styles.section}>
        <TargetDateField
          value={targetDate}
          onChange={(v) => {
            setTargetDate(v);
            setTouched(true);
            setError(null);
          }}
        />
        {showTargetDateError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            Choose today or a future date.
          </ThemedText>
        ) : null}
      </FadeInView>

      <FadeInView delay={240} style={styles.section}>
        <AmountInput
          label="Monthly target"
          value={monthlyTarget}
          onChangeText={(v) => {
            setMonthlyTarget(v);
            setTouched(true);
            setError(null);
          }}
          editable={!submitting}
        />
        <ThemedText variant="caption" color={colors.textMuted} style={styles.hint}>
          How much you'd like to save each month.
        </ThemedText>
        {showMonthlyError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            Enter a monthly target greater than ₹0.
          </ThemedText>
        ) : null}
      </FadeInView>

      {preview ? (
        <FadeInView delay={300} style={styles.section}>
          <GlassCard>
            <ThemedText variant="subheading" color={colors.text} numberOfLines={1}>
              {trimmedName || 'New goal'}
            </ThemedText>
            <ThemedText variant="bodyMedium" color={colors.text} style={styles.previewAmount}>
              {formatCurrency(preview.current)} / {formatCurrency(targetNumber ?? 0)}
            </ThemedText>
            <ThemedText variant="captionBold" color={colors.accentStrong}>
              {preview.percent}% saved
            </ThemedText>
            {targetDate ? (
              <ThemedText variant="caption" color={colors.textMuted} style={styles.previewLine}>
                Target: {formatDateLabel(targetDate)}
              </ThemedText>
            ) : null}
            {monthlyHasText && monthlyParsed !== null ? (
              <ThemedText variant="caption" color={colors.textMuted} style={styles.previewLine}>
                {formatCurrency(monthlyParsed)} / month
              </ThemedText>
            ) : null}
          </GlassCard>
        </FadeInView>
      ) : null}

      {error ? (
        <ThemedText variant="caption" color={colors.danger} style={styles.submitError}>
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.footer}>
        <GlassButton
          title="Create goal"
          loading={submitting}
          loadingTitle="Creating…"
          disabled={!canSave}
          onPress={handleCreate}
        />
      </View>
    </ThemedScreen>
  );
}

function mapSavingsError(error: Error): string {
  const message = error.message;
  if (!isSupabaseConfigured || message.includes('[supabase]') || /not configured/i.test(message)) {
    return "Savings isn't connected yet. Add your Supabase configuration to create goals.";
  }
  if (/(permission|rls|policy|row.level)/i.test(message)) {
    return "You don't have permission to create this goal.";
  }
  if (/(failed to fetch|network|timeout|socket)/i.test(message)) {
    return 'Unable to create savings goal. Please try again.';
  }
  return 'Unable to create savings goal. Please try again.';
}

const styles = StyleSheet.create({
  supporting: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  hint: {
    marginLeft: spacing.xs,
    marginTop: spacing.xs,
  },
  fieldError: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  submitError: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  footer: {
    paddingBottom: spacing.md,
  },
  previewAmount: {
    marginTop: spacing.xs,
  },
  previewLine: {
    marginTop: spacing.xs,
  },
});
