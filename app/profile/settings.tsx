import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassModal,
  GlassSection,
} from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import {
  DEFAULT_DAILY_BUDGET,
  getDailyBudget,
  getMonthlyIncome,
  setDailyBudget,
  setMonthlyIncome,
} from '../../lib/settings';

const MAX_AMOUNT = 10_000_000;
const MIN_FEEDBACK_VISIBLE_MS = 350;

function parseAmount(raw: string): number {
  return Number(raw.trim().replace(/,/g, ''));
}

function amountError(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  const value = parseAmount(trimmed);
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return 'Please enter a valid amount.';
  }
  if (value < 0) {
    return 'Amount cannot be negative.';
  }
  if (value > MAX_AMOUNT) {
    return 'Amount is too large.';
  }
  return null;
}

function formatAmount(value: number | null): string {
  if (value === null) {
    return 'Not set';
  }
  return `₹ ${value.toLocaleString('en-IN')}`;
}

type MoneyKind = 'income' | 'budget';

export default function SettingsScreen() {
  const { user, session, signOut } = useAuth();
  const router = useRouter();

  const [income, setIncome] = useState<number | null>(null);
  const [budget, setBudget] = useState<number>(DEFAULT_DAILY_BUDGET);
  const [loaded, setLoaded] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [moneyModal, setMoneyModal] = useState<MoneyKind | null>(null);
  const [moneyInput, setMoneyInput] = useState('');
  const [moneyTouched, setMoneyTouched] = useState(false);
  const [savingMoney, setSavingMoney] = useState(false);
  const [moneyError, setMoneyError] = useState<string | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getDailyBudget(), getMonthlyIncome()]).then(([b, i]) => {
      if (!active) {
        return;
      }
      setBudget(b);
      setIncome(i);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  function showFeedback(message: string) {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
    setFeedback(message);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2200);
  }

  function openMoneyModal(kind: MoneyKind) {
    setMoneyModal(kind);
    setMoneyInput(kind === 'income' ? (income === null ? '' : String(income)) : String(budget));
    setMoneyTouched(false);
    setMoneyError(null);
  }

  function closeMoneyModal() {
    if (!savingMoney) {
      setMoneyModal(null);
    }
  }

  function saveDisabled(): boolean {
    if (savingMoney) {
      return true;
    }
    return amountError(moneyInput) !== null;
  }

  async function handleSaveMoney() {
    const kind = moneyModal;
    if (!kind || savingMoney) {
      return;
    }
    const validationError = amountError(moneyInput);
    if (validationError) {
      setMoneyError(validationError);
      setMoneyTouched(true);
      return;
    }

    setSavingMoney(true);
    setMoneyError(null);
    const startedAt = Date.now();
    const trimmed = moneyInput.trim();
    try {
      if (kind === 'income') {
        await setMonthlyIncome(trimmed === '' ? null : parseAmount(trimmed));
        setIncome(trimmed === '' ? null : parseAmount(trimmed));
        showFeedback('Income updated');
      } else {
        await setDailyBudget(trimmed === '' ? DEFAULT_DAILY_BUDGET : parseAmount(trimmed));
        setBudget(trimmed === '' ? DEFAULT_DAILY_BUDGET : parseAmount(trimmed));
        showFeedback('Budget updated');
      }
    } catch (err) {
      console.warn('[settings] save money failed', err);
      setMoneyError('Unable to save. Please try again.');
      return;
    } finally {
      const remaining = MIN_FEEDBACK_VISIBLE_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setSavingMoney(false);
    }
    setMoneyModal(null);
    setMoneyInput('');
    setMoneyTouched(false);
  }

  async function handleReset() {
    if (resetting) {
      return;
    }
    setResetting(true);
    try {
      await Promise.all([setMonthlyIncome(null), setDailyBudget(DEFAULT_DAILY_BUDGET)]);
      setIncome(null);
      setBudget(DEFAULT_DAILY_BUDGET);
      showFeedback('Preferences reset');
    } catch (err) {
      console.warn('[settings] reset failed', err);
      setResetOpen(false);
      setFeedback('Unable to reset preferences. Please try again.');
      return;
    } finally {
      setResetting(false);
    }
    setResetOpen(false);
  }

  async function handleSignOut() {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      // Existing auth routing (RouteGuard) handles the redirect to intro.
    } catch (err) {
      console.warn('[settings] sign out failed', err);
      setSignOutError('Unable to sign out. Please try again.');
      setSigningOut(false);
      setSignOutOpen(false);
    }
  }

  if (!loaded) {
    return (
      <ThemedScreen scroll>
        <FadeInView delay={0}>
          <View style={styles.skeletonCard} />
        </FadeInView>
        <FadeInView delay={80}>
          <View style={styles.skeletonRow} />
          <View style={styles.skeletonRow} />
        </FadeInView>
      </ThemedScreen>
    );
  }

  const email = session?.user?.email ?? null;
  const familyStatus = user?.family_id ? 'Family connected' : 'No family';

  return (
    <ThemedScreen scroll keyboardShouldPersistTaps="handled">
      <FadeInView delay={0}>
        <GlassSection title="Account">
          <GlassCard padding={spacing.lg} style={styles.accountCard}>
            <InfoRow label="Email" value={email ?? '—'} />
            <InfoRow label="Display name" value={user?.name ?? 'Your Profile'} />
            <InfoRow label="Family" value={familyStatus} last />
          </GlassCard>
        </GlassSection>
      </FadeInView>

      <FadeInView delay={60}>
        <GlassSection title="Money">
          <GlassCard padding={spacing.lg}>
            <Pressable
              onPress={() => openMoneyModal('income')}
              accessibilityRole="button"
              accessibilityLabel="Edit monthly income"
              style={({ pressed }) => [styles.valueRow, pressed && styles.rowPressed]}
            >
              <View style={styles.valueRowBody}>
                <ThemedText variant="body" color={colors.text}>
                  Monthly income
                </ThemedText>
                <ThemedText
                  variant="caption"
                  color={income === null ? colors.textMuted : colors.textSecondary}
                >
                  {formatAmount(income)}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textMuted} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              onPress={() => openMoneyModal('budget')}
              accessibilityRole="button"
              accessibilityLabel="Edit monthly budget"
              style={({ pressed }) => [styles.valueRow, pressed && styles.rowPressed]}
            >
              <View style={styles.valueRowBody}>
                <ThemedText variant="body" color={colors.text}>
                  Monthly budget
                </ThemedText>
                <ThemedText variant="caption" color={colors.textSecondary}>
                  {formatAmount(budget)}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textMuted} />
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.valueRow}>
              <View style={styles.valueRowBody}>
                <ThemedText variant="body" color={colors.text}>
                  Currency
                </ThemedText>
                <ThemedText variant="caption" color={colors.textMuted}>
                  ₹ Indian Rupee (INR)
                </ThemedText>
              </View>
            </View>
          </GlassCard>
        </GlassSection>
      </FadeInView>

      <FadeInView delay={120}>
        <GlassSection title="Notifications">
          <GlassCard padding={spacing.lg}>
            <Pressable
              onPress={() => router.push('/notifications')}
              accessibilityRole="button"
              accessibilityLabel="Open in-app notifications"
              style={({ pressed }) => [styles.valueRow, pressed && styles.rowPressed]}
            >
              <View style={styles.valueRowBody}>
                <ThemedText variant="body" color={colors.text}>
                  In-app notifications
                </ThemedText>
                <ThemedText variant="caption" color={colors.textMuted}>
                  Family activity and updates
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textMuted} />
            </Pressable>
          </GlassCard>
        </GlassSection>
      </FadeInView>

      <FadeInView delay={180}>
        <GlassSection title="Privacy & Security">
          <GlassCard padding={spacing.lg}>
            <InfoRow label="Family privacy" value="Members see shared expenses and savings" />
            <View style={styles.divider} />
            <InfoRow label="Account security" value="Secured by your RIFAA sign-in" last />
          </GlassCard>
          <View style={styles.signOutWrap}>
            <GlassButton
              title="Sign Out"
              variant="destructive"
              onPress={() => {
                setSignOutError(null);
                setSignOutOpen(true);
              }}
              style={styles.signOutButton}
            />
            {signOutError ? (
              <ThemedText variant="caption" color={colors.danger} style={styles.errorText}>
                {signOutError}
              </ThemedText>
            ) : null}
          </View>
        </GlassSection>
      </FadeInView>

      <FadeInView delay={240}>
        <Pressable
          onPress={() => setResetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Reset local preferences"
          style={({ pressed }) => [styles.resetRow, pressed && styles.rowPressed]}
        >
          <Ionicons name="refresh-outline" size={iconSizes.md} color={colors.accentStrong} />
          <ThemedText variant="bodyMedium" color={colors.accentStrong}>
            Reset preferences
          </ThemedText>
        </Pressable>
      </FadeInView>

      {feedback ? (
        <ThemedText variant="captionBold" color={colors.accentStrong} style={styles.feedback}>
          {feedback}
        </ThemedText>
      ) : null}

      <GlassModal visible={moneyModal !== null} onClose={closeMoneyModal} presentationStyle="bottomSheet">
        <ThemedText variant="heading" color={colors.text} style={styles.sheetTitle}>
          {moneyModal === 'income' ? 'Monthly income' : 'Monthly budget'}
        </ThemedText>
        <ThemedText variant="caption" color={colors.textMuted} style={styles.sheetSubtitle}>
          {moneyModal === 'income'
            ? 'Enter your expected monthly income. Leave empty to clear.'
            : 'Enter your monthly budget. Leave empty to use the default.'}
        </ThemedText>
        <GlassInput
          label={`Amount (₹)`}
          icon={<ThemedText variant="bodyMedium" color={colors.accent}>₹</ThemedText>}
          value={moneyInput}
          onChangeText={(v) => {
            setMoneyInput(v);
            setMoneyTouched(true);
            setMoneyError(null);
          }}
          editable={!savingMoney}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={moneyModal === 'income' ? 'Monthly income amount' : 'Monthly budget amount'}
        />
        {moneyTouched && moneyError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            {moneyError}
          </ThemedText>
        ) : null}
        {moneyModal === 'income' && moneyInput.trim() === '' ? (
          <ThemedText variant="caption" color={colors.textMuted} style={styles.fieldHint}>
            Clears your income — Home will show “Not set”.
          </ThemedText>
        ) : null}
        <GlassButton
          title="Save"
          loading={savingMoney}
          loadingTitle="Saving…"
          disabled={saveDisabled()}
          onPress={handleSaveMoney}
          style={styles.sheetSubmit}
        />
      </GlassModal>

      <GlassModal
        visible={resetOpen}
        onClose={() => {
          if (!resetting) {
            setResetOpen(false);
          }
        }}
        presentationStyle="center"
      >
        <ThemedText variant="heading" color={colors.text}>
          Reset preferences?
        </ThemedText>
        <ThemedText variant="body" color={colors.textSecondary} style={styles.modalBody}>
          This will reset your local RIFAA preferences.
        </ThemedText>
        <View style={styles.modalActions}>
          <GlassButton
            title="Cancel"
            variant="secondary"
            onPress={() => setResetOpen(false)}
            disabled={resetting}
            style={styles.modalButton}
          />
          <GlassButton
            title="Reset"
            variant="destructive"
            loading={resetting}
            loadingTitle="Resetting…"
            onPress={handleReset}
            style={styles.modalButton}
          />
        </View>
      </GlassModal>

      <GlassModal
        visible={signOutOpen}
        onClose={() => {
          if (!signingOut) {
            setSignOutOpen(false);
          }
        }}
        presentationStyle="center"
      >
        <ThemedText variant="heading" color={colors.text}>
          Sign out?
        </ThemedText>
        <ThemedText variant="body" color={colors.textSecondary} style={styles.modalBody}>
          You can sign back in anytime.
        </ThemedText>
        <View style={styles.modalActions}>
          <GlassButton
            title="Cancel"
            variant="secondary"
            onPress={() => setSignOutOpen(false)}
            disabled={signingOut}
            style={styles.modalButton}
          />
          <GlassButton
            title="Sign Out"
            variant="destructive"
            loading={signingOut}
            loadingTitle="Signing out…"
            onPress={handleSignOut}
            style={styles.modalButton}
          />
        </View>
      </GlassModal>
    </ThemedScreen>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <ThemedText variant="body" color={colors.text} style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText variant="caption" color={colors.textSecondary} style={styles.infoValue} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    gap: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  infoRowLast: {
    paddingBottom: 0,
  },
  infoLabel: {
    flexShrink: 1,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
  },
  valueRowBody: {
    flex: 1,
  },
  rowPressed: {
    opacity: 0.7,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  signOutWrap: {
    marginTop: spacing.xl,
  },
  signOutButton: {
    minHeight: 50,
  },
  errorText: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  feedback: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  sheetTitle: {
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    marginBottom: spacing.lg,
  },
  fieldError: {
    marginLeft: spacing.xs,
    marginTop: spacing.sm,
  },
  fieldHint: {
    marginLeft: spacing.xs,
    marginTop: spacing.sm,
  },
  sheetSubmit: {
    marginTop: spacing.xl,
  },
  modalBody: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  skeletonCard: {
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.xxl,
  },
  skeletonRow: {
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
});
