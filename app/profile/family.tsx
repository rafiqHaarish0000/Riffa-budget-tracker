import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import {
  GlassAvatar,
  GlassButton,
  GlassCard,
  GlassModal,
  GlassSection,
} from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { FamilyMember } from '../../types/family';

const MIN_FEEDBACK_VISIBLE_MS = 350;

function familyNameFallback(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Your Family';
}

function memberName(member: FamilyMember): string {
  return member.user?.name?.trim() ?? 'Family member';
}

function mapFamilyError(error: Error | null): string {
  if (!error) {
    return '';
  }
  const message = error.message;
  if (!isSupabaseConfigured || message.includes('[supabase]') || /not configured/i.test(message)) {
    return 'Family data needs your Supabase configuration to be connected.';
  }
  if (/(failed to fetch|network|timeout|socket)/i.test(message)) {
    return 'Something went wrong. Please check your connection and try again.';
  }
  return 'Unable to load your family. Please try again.';
}

export default function FamilyScreen() {
  const { user, refreshProfile } = useAuth();
  const { family, members, loading, error, refetch, leaveFamily } = useFamily(user);
  const currentUserId = user?.id ?? null;

  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Refresh family data whenever the screen gains focus so newly joined
  // members appear without a full app reload. No continuous polling.
  useFocusEffect(
    useCallback(() => {
      setCopyFeedback(null);
      void refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetch]),
  );

  function setCopyFeedback(value: string | null) {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
      feedbackTimer.current = null;
    }
    setFeedback(value);
    if (value) {
      feedbackTimer.current = setTimeout(() => setFeedback(null), 2200);
    }
  }

  const familyCode = family?.family_code ?? null;

  async function handleCopy() {
    if (!familyCode) {
      return;
    }
    try {
      await Clipboard.setStringAsync(familyCode);
      setCopyFeedback('Family code copied');
    } catch (err) {
      console.warn('[family] copy failed', err);
      setCopyFeedback('Unable to copy the family code.');
    }
  }

  async function handleShare() {
    if (!familyCode) {
      return;
    }
    const message = `Join our RIFAA family using this family code: ${familyCode}`;
    // React Native's built-in share sheet is not available on web; fall back to
    // copying the invite so the user can share it manually.
    if (Platform.OS === 'web') {
      try {
        const ok = await Clipboard.setStringAsync(message);
        setCopyFeedback(ok ? 'Invite message copied' : 'Unable to share the family code.');
      } catch (err) {
        console.warn('[family] share fallback failed', err);
        setCopyFeedback('Unable to share the family code.');
      }
      return;
    }
    try {
      await Share.share({ message });
    } catch (err) {
      console.warn('[family] share failed', err);
      setCopyFeedback('Unable to share the family code.');
    }
  }

  async function handleLeave() {
    if (leaving || !family) {
      return;
    }
    setLeaving(true);
    setLeaveError(null);
    const startedAt = Date.now();
    try {
      const { error: leaveFamilyError } = await leaveFamily();
      if (leaveFamilyError) {
        console.warn('[family] leave failed', leaveFamilyError.message);
        setLeaveError('Unable to leave the family. Please try again.');
        return;
      }
      // Refresh the authenticated profile so family_id becomes null and this
      // screen shows the (empty) no-family state through the existing flow.
      await refreshProfile();
      setLeaveOpen(false);
    } catch (err) {
      console.warn('[family] leave failed', err);
      setLeaveError('Unable to leave the family. Please try again.');
    } finally {
      const remaining = MIN_FEEDBACK_VISIBLE_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setLeaving(false);
    }
  }

  // Loading state — never show fake members/names.
  if (loading) {
    return (
      <ThemedScreen scroll>
        <FadeInView delay={0}>
          <View style={styles.skeletonCard} />
        </FadeInView>
        <FadeInView delay={80}>
          <View style={styles.skeletonCode} />
        </FadeInView>
        <FadeInView delay={160}>
          <View style={styles.skeletonRow} />
          <View style={styles.skeletonRow} />
        </FadeInView>
      </ThemedScreen>
    );
  }

  // Load error state.
  if (error && !family) {
    return (
      <ThemedScreen>
        <View style={styles.stateWrap}>
          <View style={styles.stateIcon}>
            <Ionicons name="people-outline" size={iconSizes.xl} color={colors.accentStrong} />
          </View>
          <ThemedText variant="subheading" color={colors.text} style={styles.stateTitle}>
            Unable to load your family.
          </ThemedText>
          <ThemedText variant="caption" color={colors.textMuted} style={styles.stateText}>
            Please try again.
          </ThemedText>
          <GlassButton
            title="Try Again"
            onPress={() => void refetch()}
            style={styles.stateButton}
          />
        </View>
      </ThemedScreen>
    );
  }

  // No family yet — empty state with create/join actions.
  if (!family) {
    return (
      <ThemedScreen scroll>
        <FadeInView delay={0}>
          <View style={styles.emptyCard}>
            <View style={styles.stateIconSolo}>
              <Ionicons name="people-outline" size={iconSizes.xxl} color={colors.accentStrong} />
            </View>
            <ThemedText variant="heading" color={colors.text} style={styles.emptyTitle}>
              No family yet
            </ThemedText>
            <ThemedText variant="body" color={colors.textSecondary} style={styles.emptyText}>
              Create a family or join one to start sharing your money space.
            </ThemedText>
            <GlassButton
              title="Create Family"
              onPress={() => router.push('/(auth)/create-family')}
              style={styles.emptyAction}
            />
            <GlassButton
              title="Join Family"
              variant="secondary"
              onPress={() => router.push('/(auth)/join-family')}
              style={styles.emptyActionSecondary}
            />
          </View>
        </FadeInView>
      </ThemedScreen>
    );
  }

  const displayName = familyNameFallback(family.name);
  const totalMembers = members.length;
  const otherMembers = members.filter((m) => m.user_id !== currentUserId).length;
  const hasJustMe = totalMembers <= 1;

  return (
    <ThemedScreen scroll>
      <FadeInView delay={0}>
        <GlassCard style={styles.identityCard}>
          <View style={styles.faceIcon}>
            <Ionicons name="people" size={iconSizes.lg} color={colors.accentStrong} />
          </View>
          <ThemedText variant="heading" color={colors.text} style={styles.familyName}>
            {displayName}
          </ThemedText>
          <ThemedText variant="caption" color={colors.textMuted}>
            Your shared money space
          </ThemedText>
        </GlassCard>
      </FadeInView>

      <FadeInView delay={60}>
        <GlassSection title="Invite">
          <GlassCard padding={spacing.lg}>
            <ThemedText variant="label" color={colors.textSecondary} style={styles.codeLabel}>
              Family code
            </ThemedText>
            <ThemedText variant="title" color={colors.text} style={styles.codeValue}>
              {familyCode ?? '—'}
            </ThemedText>
            <View style={styles.codeActions}>
              <GlassButton
                title="Copy"
                variant="secondary"
                onPress={handleCopy}
                style={styles.codeButton}
                leading={<Ionicons name="copy-outline" size={iconSizes.sm} color={colors.accent} />}
              />
              <GlassButton
                title="Share"
                onPress={handleShare}
                style={styles.codeButton}
                leading={<Ionicons name="share-outline" size={iconSizes.sm} color={colors.textInverse} />}
              />
            </View>
            {feedback ? (
              <ThemedText variant="captionBold" color={colors.accentStrong} style={styles.codeFeedback}>
                {feedback}
              </ThemedText>
            ) : null}
          </GlassCard>
          {hasJustMe ? (
            <ThemedText variant="caption" color={colors.textMuted} style={styles.inviteHint}>
              Invite your family member to start sharing.
            </ThemedText>
          ) : null}
        </GlassSection>
      </FadeInView>

      <FadeInView delay={120}>
        <GlassSection title="Family members">
          {members.length === 0 ? (
            <GlassCard style={styles.stateCard}>
              <ThemedText variant="body" color={colors.textMuted} style={styles.stateText}>
                Invite your family member to start sharing.
              </ThemedText>
            </GlassCard>
          ) : (
            <View style={styles.memberList}>
              {members.map((member) => {
                const isYou = member.user_id === currentUserId;
                const name = memberName(member);
                return (
                  <GlassCard key={member.id} padding={spacing.lg} style={styles.memberCard}>
                    <GlassAvatar
                      uri={member.user?.profile_image_url}
                      name={member.user?.name}
                      size={44}
                    />
                    <View style={styles.memberBody}>
                      <ThemedText variant="bodyMedium" color={colors.text} numberOfLines={1}>
                        {name}
                      </ThemedText>
                    </View>
                    {isYou ? (
                      <View
                        accessibilityLabel="This is you"
                        style={styles.youBadge}
                      >
                        <ThemedText variant="label" color={colors.accentStrong}>
                          You
                        </ThemedText>
                      </View>
                    ) : null}
                  </GlassCard>
                );
              })}
            </View>
          )}
          {!hasJustMe && otherMembers === 1 ? (
            <ThemedText variant="caption" color={colors.textMuted} style={styles.memberHint}>
              Shared with 1 family member
            </ThemedText>
          ) : null}
        </GlassSection>
      </FadeInView>

      <FadeInView delay={180}>
        <GlassCard padding={spacing.lg} style={styles.accountCard}>
          <GlassButton
            title="Leave Family"
            variant="destructive"
            onPress={() => {
              setLeaveError(null);
              setLeaveOpen(true);
            }}
            style={styles.leaveButton}
          />
          {leaveError ? (
            <ThemedText variant="caption" color={colors.danger} style={styles.leaveError}>
              {leaveError}
            </ThemedText>
          ) : null}
        </GlassCard>
      </FadeInView>

      <GlassModal
        visible={leaveOpen}
        onClose={() => {
          if (!leaving) {
            setLeaveOpen(false);
          }
        }}
        presentationStyle="center"
      >
        <ThemedText variant="heading" color={colors.text}>
          Leave this family?
        </ThemedText>
        <ThemedText variant="body" color={colors.textSecondary} style={styles.modalBody}>
          You will lose access to shared family expenses and savings.
        </ThemedText>
        <View style={styles.modalActions}>
          <GlassButton
            title="Cancel"
            variant="secondary"
            onPress={() => setLeaveOpen(false)}
            disabled={leaving}
            style={styles.modalButton}
          />
          <GlassButton
            title="Leave Family"
            variant="destructive"
            loading={leaving}
            loadingTitle="Leaving…"
            onPress={handleLeave}
            style={styles.modalButton}
          />
        </View>
      </GlassModal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  faceIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  familyName: {
    marginBottom: spacing.xxs,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  codeLabel: {
    marginBottom: spacing.xs,
  },
  codeValue: {
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  codeButton: {
    flex: 1,
  },
  codeFeedback: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  inviteHint: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  memberList: {
    gap: spacing.md,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberBody: {
    flex: 1,
  },
  youBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  memberHint: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  accountCard: {
    backgroundColor: colors.surface,
  },
  leaveButton: {
    minHeight: 50,
  },
  leaveError: {
    textAlign: 'center',
    marginTop: spacing.md,
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
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stateTitle: {
    textAlign: 'center',
  },
  stateText: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  stateButton: {
    marginTop: spacing.lg,
    minWidth: 160,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.lg,
  },
  stateIconSolo: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    marginBottom: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyAction: {
    minWidth: 200,
  },
  emptyActionSecondary: {
    minWidth: 200,
    marginTop: spacing.md,
  },
  stateCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  skeletonCard: {
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.xxl,
  },
  skeletonCode: {
    height: 120,
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
