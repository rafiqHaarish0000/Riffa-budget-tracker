import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { AmountInput, parseAmount } from '../../components/expense/AmountInput';
import { ProgressRing } from '../../components/savings/ProgressRing';
import { TargetDateField } from '../../components/savings/TargetDateField';
import { GlassAvatar, GlassButton, GlassCard, GlassInput } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
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
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/savings');
    }
  }

  return (
    <ThemedScreen scroll keyboardShouldPersistTaps="handled">
      <FadeInView delay={0}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/savings');
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Ionicons name="chevron-back" size={iconSizes.md} color={colors.text} />
          </Pressable>
          <ThemedText variant="heading" color={colors.text} style={styles.headerTitle}>
            New Goal
          </ThemedText>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={({ pressed }) => pressed && styles.backButtonPressed}
          >
            <GlassAvatar uri={user?.profile_image_url} name={user?.name} size={44} />
          </Pressable>
        </View>

        <View style={styles.heroWrap}>
          <LinearGradient
            colors={['#17422F', '#0B201B']}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.heroImage}
          />
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=85',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <ThemedText variant="body" color={colors.accentStrong}>
              Savings goal
            </ThemedText>
            <ThemedText variant="heading" color={colors.text}>
              Build toward what matters
            </ThemedText>
            <ThemedText variant="caption" color={colors.textSecondary}>
              Give your next goal a name, target, and monthly plan.
            </ThemedText>
          </View>
        </View>
      </FadeInView>

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
            <View style={styles.previewRow}>
              <ProgressRing
                progress={preview.percent / 100}
                size={96}
                thickness={9}
                centerValue={`${preview.percent}`}
                centerCaption="%"
              />
              <View style={styles.previewBody}>
                <ThemedText variant="subheading" color={colors.text} numberOfLines={1}>
                  {trimmedName || 'New goal'}
                </ThemedText>
                <ThemedText variant="bodyMedium" color={colors.text} style={styles.previewAmount}>
                  {formatCurrency(preview.current)}
                  <ThemedText variant="caption" color={colors.textMuted}>
                    {' '}/ {formatCurrency(targetNumber ?? 0)}
                  </ThemedText>
                </ThemedText>
                <View style={styles.previewMeta}>
                  {targetDate ? (
                    <View style={styles.previewMetaItem}>
                      <Ionicons name="calendar-outline" size={12} color={colors.accent} />
                      <ThemedText variant="caption" color={colors.textSecondary}>
                        {formatDateLabel(targetDate)}
                      </ThemedText>
                    </View>
                  ) : null}
                  {monthlyHasText && monthlyParsed !== null ? (
                    <View style={styles.previewMetaItem}>
                      <Ionicons name="trending-up-outline" size={12} color={colors.accent} />
                      <ThemedText variant="caption" color={colors.textSecondary}>
                        {formatCurrency(monthlyParsed)}/mo
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    pointerEvents: 'none',
  },
  heroWrap: {
    height: 168,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    justifyContent: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 30, 24, 0.45)',
  },
  heroContent: {
    padding: spacing.lg,
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
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  previewBody: {
    flex: 1,
  },
  previewAmount: {
    marginTop: spacing.xxs,
  },
  previewMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  previewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
});
