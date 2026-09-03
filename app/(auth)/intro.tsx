import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { GlassButton, GlassCard } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, glass, iconSizes, radius, shadows, spacing } from '../../constants/theme';

const PEOPLE_SIZE = 92;
const SAVINGS_SIZE = 64;

export default function IntroScreen() {
  const router = useRouter();

  return (
    <ThemedScreen scroll>
      <View style={styles.topBar}>
        <ThemedText variant="captionBold" color={colors.accentStrong} style={styles.eyebrow}>
          RIFAA
        </ThemedText>
      </View>

      <View style={styles.illustration}>
        <RowIllustration />
      </View>

      <ThemedText variant="display" color={colors.text} style={styles.title}>
        Money, together.
      </ThemedText>
      <ThemedText variant="body" color={colors.textSecondary} style={styles.supporting}>
        Track spending, plan savings, and manage your money as a family.
      </ThemedText>

      <View style={styles.actions}>
        <GlassButton
          title="Continue with Email"
          onPress={() => router.push('/sign-in')}
          leading={<Ionicons name="mail-outline" size={iconSizes.lg} color={colors.textInverse} />}
          style={styles.primaryButton}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/sign-up')}
          style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
        >
          <ThemedText variant="bodyMedium" color={colors.accent}>
            Create account
          </ThemedText>
        </Pressable>

        <ThemedText variant="caption" color={colors.textMuted} style={styles.privacy}>
          Sign in with your email to access your family&apos;s shared money space.
        </ThemedText>
      </View>
    </ThemedScreen>
  );
}

function RowIllustration() {
  return (
    <View style={rowStyles.container}>
      <PersonGlass style={rowStyles.personLeft} label="1" />
      <SharedSavingsGlass />
      <PersonGlass style={rowStyles.personRight} label="2" />
    </View>
  );
}

function PersonGlass({ style, label }: { style: ViewStyle; label: string }) {
  return (
    <GlassCard tint="extraLight" intensity={glass.blur.medium} style={[rowStyles.person, style]} padding={0}>
      <View style={rowStyles.personInner}>
        <View style={rowStyles.personHead} />
        <ThemedText variant="label" color={colors.accentStrong}>
          {label}
        </ThemedText>
      </View>
    </GlassCard>
  );
}

function SharedSavingsGlass() {
  return (
    <GlassCard
      tint="extraLight"
      intensity={glass.blur.heavy}
      style={rowStyles.savings}
      padding={0}
    >
      <View style={rowStyles.savingsInner}>
        <View style={rowStyles.savingsRing} />
        <View style={rowStyles.savingsDot} />
      </View>
    </GlassCard>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    height: 170,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  person: {
    width: PEOPLE_SIZE,
    height: PEOPLE_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  personLeft: {
    marginRight: spacing.md,
  },
  personRight: {
    marginLeft: spacing.md,
  },
  personInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  personHead: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.xs,
  },
  savings: {
    width: SAVINGS_SIZE,
    height: SAVINGS_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
    ...shadows.float,
  },
  savingsInner: {
    width: SAVINGS_SIZE,
    height: SAVINGS_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsRing: {
    position: 'absolute',
    width: SAVINGS_SIZE - 22,
    height: SAVINGS_SIZE - 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
    opacity: 0.4,
  },
  savingsDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accentStrong,
  },
});

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  eyebrow: {
    letterSpacing: 4,
  },
  illustration: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  supporting: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.text,
  },
  secondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  secondaryPressed: {
    opacity: 0.7,
  },
  privacy: {
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});
