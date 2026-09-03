import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import type { ComponentProps } from 'react';
import { GlassButton, GlassCard } from './glass';
import { ThemedText } from './ThemedText';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type ScreenStateKind = 'empty' | 'error';

type ScreenStateProps = {
  kind: ScreenStateKind;
  title: string;
  message?: string;
  icon?: IoniconName;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'secondary';
  /** Optional secondary action shown under the primary action. */
  secondaryActionLabel?: string;
  secondaryAction?: () => void;
  style?: ViewStyle | ViewStyle[];
  /** Small inline variant for narrow sections (e.g. a day on the calendar). */
  compact?: boolean;
  /** Render this state inside a GlassCard (default true for standalone states). */
  contained?: boolean;
};

/**
 * Reusable centered application state shared across every data screen. Keeps
 * loading / empty / error presentation visually consistent with the RIFAA
 * glassmorphism system without redeclaring it everywhere.
 *
 * `ScreenStateSkeleton` mirrors the same surface for the loading phase so the
 * layout doesn't jump between a skeleton and a card state.
 */
export function ScreenState({
  kind,
  title,
  message,
  icon,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  secondaryActionLabel,
  secondaryAction,
  style,
  compact = false,
  contained = true,
}: ScreenStateProps) {
  const defaultIcon: Record<ScreenStateKind, IoniconName> = {
    empty: 'file-tray-outline',
    error: 'alert-circle-outline',
  };
  const iconName = icon ?? defaultIcon[kind];

  const content = (
    <>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.iconWrap, compact && styles.iconWrapCompact]}
      >
        <Ionicons
          name={iconName}
          size={compact ? iconSizes.lg : iconSizes.xl}
          color={colors.accentStrong}
        />
      </View>
      <ThemedText variant={compact ? 'bodyMedium' : 'subheading'} color={colors.text} style={styles.title}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText variant="caption" color={colors.textMuted} style={styles.message}>
          {message}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <GlassButton
          title={actionLabel}
          variant={actionVariant}
          onPress={onAction}
          style={compact ? styles.actionCompact : styles.action}
        />
      ) : null}
      {secondaryActionLabel && secondaryAction ? (
        <GlassButton
          title={secondaryActionLabel}
          variant="secondary"
          onPress={secondaryAction}
          style={compact ? styles.actionCompact : styles.secondaryAction}
        />
      ) : null}
    </>
  );

  if (!contained) {
    return (
      <View style={[styles.root, styles.uncontained, compact && styles.rootCompact, style]}>
        {content}
      </View>
    );
  }

  return (
    <GlassCard
      style={[styles.root, compact && styles.rootCompact, style] as ViewStyle[]}
      padding={spacing.xxl}
    >
      {content}
    </GlassCard>
  );
}

type ScreenStateSkeletonProps = {
  rows?: number;
  tall?: boolean;
  style?: ViewStyle | ViewStyle[];
};

/** Skeleton placeholders for the loading phase of a data screen. */
export function ScreenStateSkeleton({
  rows = 2,
  tall = false,
  style,
}: ScreenStateSkeletonProps) {
  return (
    <View style={[styles.skeletonStack, style]}>
      <View style={[styles.skeletonBlock, tall && styles.skeletonBlockTall]} />
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.skeletonRow} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.md,
  },
  rootCompact: {
    paddingVertical: spacing.xl,
  },
  uncontained: {
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconWrapCompact: {
    width: 48,
    height: 48,
    marginBottom: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  action: {
    marginTop: spacing.lg,
    minWidth: 160,
  },
  secondaryAction: {
    marginTop: spacing.sm,
    minWidth: 160,
  },
  actionCompact: {
    marginTop: spacing.md,
    minWidth: 120,
  },
  skeletonStack: {
    gap: spacing.md,
  },
  skeletonBlock: {
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  skeletonBlockTall: {
    height: 240,
  },
  skeletonRow: {
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});
