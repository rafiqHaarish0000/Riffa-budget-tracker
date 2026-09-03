import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import {
  GlassAvatar,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassModal,
  GlassSection,
} from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { ScreenState, ScreenStateSkeleton } from '../../components/ui/ScreenState';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const MAX_NAME_LENGTH = 50;
const MAX_AVATAR_MB = 5;
const MIN_FEEDBACK_VISIBLE_MS = 350;
const ALLOWED_AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function userNameFallback(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Your Profile';
}

function extensionFromName(fileName: string): string {
  return (fileName.split('.').pop() ?? '').toLowerCase();
}

function mimeFromExtension(extension: string): string {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

function mapProfileUpdateError(error: { message: string }): string {
  const message = error.message;
  if (!isSupabaseConfigured || message.includes('[supabase]') || /not configured/i.test(message)) {
    return 'Profile updates need your Supabase configuration to be connected.';
  }
  if (/(failed to fetch|network|timeout|socket)/i.test(message)) {
    return 'Something went wrong. Please check your connection and try again.';
  }
  return 'Unable to update your profile. Please try again.';
}

function mapAvatarError(error: { message: string }): string {
  const message = error.message;
  if (!isSupabaseConfigured || message.includes('[supabase]') || /not configured/i.test(message)) {
    return 'Photo upload needs your Supabase configuration to be connected.';
  }
  if (/(bucket|not found|does not exist)/i.test(message)) {
    return 'Photo upload is not available yet. Please try again later.';
  }
  if (/(permission|rls|policy)/i.test(message)) {
    return "You don't have permission to update your photo.";
  }
  if (/(failed to fetch|network|timeout|socket)/i.test(message)) {
    return 'Something went wrong. Please check your connection and try again.';
  }
  return 'Unable to update your photo. Please try again.';
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, session, loading, signOut, refreshProfile } = useAuth();

  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the display name field in sync when the profile is refreshed from
  // elsewhere (e.g. family onboarding updates the name) or after a save.
  useEffect(() => {
    setNameInput(user?.name ?? '');
    setNameTouched(false);
  }, [user?.name]);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  const trimmedInput = nameInput.trim();
  const nameChanged =
    (user?.name ?? '').trim() !== trimmedInput;
  const nameValid = trimmedInput.length > 0 && trimmedInput.length <= MAX_NAME_LENGTH;
  const nameEmptyError = nameTouched && trimmedInput.length === 0;
  const nameTooLongError = nameTouched && trimmedInput.length > MAX_NAME_LENGTH;
  const canSave = nameValid && nameChanged && !saving;

  const email = session?.user?.email ?? null;

  function showFeedback(message: string) {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
    setSavedFeedback(message);
    feedbackTimer.current = setTimeout(() => setSavedFeedback(null), 2500);
  }

  async function handleSaveName() {
    if (saving) {
      return;
    }
    if (trimmedInput.length === 0) {
      setNameError('Please enter your name.');
      return;
    }
    if (trimmedInput.length > MAX_NAME_LENGTH) {
      setNameError(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      return;
    }
    if (!user?.id) {
      setNameError('Please sign in to update your profile.');
      return;
    }

    setSaving(true);
    setNameError(null);
    setPhotoError(null);
    const startedAt = Date.now();
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: trimmedInput })
        .eq('id', user.id);

      if (error) {
        setNameError(mapProfileUpdateError(error));
        return;
      }

      await refreshProfile();
      setNameTouched(false);
      showFeedback('Profile updated');
    } catch (err) {
      console.warn('[profile] name update failed', err);
      setNameError('Something went wrong. Please check your connection and try again.');
    } finally {
      const remaining = MIN_FEEDBACK_VISIBLE_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setSaving(false);
    }
  }

  async function handlePickPhoto() {
    if (uploading) {
      return;
    }
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
    } catch (err) {
      console.warn('[profile] image picker failed', err);
      setPhotoError('Unable to open the photo picker. Please try again.');
      return;
    }

    if (result.canceled || !result.assets || result.assets.length === 0) {
      // Picker was dismissed — do nothing, show no error.
      return;
    }

    const asset = result.assets[0];

    const fileSizeMB = typeof asset.fileSize === 'number' ? asset.fileSize / (1024 * 1024) : null;
    if (fileSizeMB !== null && fileSizeMB > MAX_AVATAR_MB) {
      setPhotoError('Please choose a smaller image.');
      return;
    }

    const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? '';
    const extension = extensionFromName(fileName);
    if (!ALLOWED_AVATAR_EXTENSIONS.includes(extension)) {
      setPhotoError('Please choose a JPG, PNG or WebP image.');
      return;
    }

    if (!user?.id) {
      setPhotoError('Please sign in to update your photo.');
      return;
    }

    setUploading(true);
    setPhotoError(null);
    const startedAt = Date.now();
    try {
      const mime = asset.mimeType ?? mimeFromExtension(extension);
      const path = `${user.id}/profile.jpg`;
      const fileBody =
        Platform.OS === 'web'
          ? await (await fetch(asset.uri)).blob()
          : ({ uri: asset.uri, type: mime, name: `profile.${extension}` } as unknown as Blob);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, fileBody, { upsert: true, contentType: mime });

      if (uploadError) {
        setPhotoError(mapAvatarError(uploadError));
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      if (!data?.publicUrl) {
        setPhotoError('Unable to update your photo. Please try again.');
        return;
      }

      const { error: dbError } = await supabase
        .from('users')
        .update({ profile_image_url: data.publicUrl })
        .eq('id', user.id);

      if (dbError) {
        setPhotoError(mapProfileUpdateError(dbError));
        return;
      }

      await refreshProfile();
      showFeedback('Photo updated');
    } catch (err) {
      console.warn('[profile] avatar upload failed', err);
      setPhotoError('Something went wrong. Please check your connection and try again.');
    } finally {
      const remaining = MIN_FEEDBACK_VISIBLE_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setUploading(false);
    }
  }

  async function handleConfirmSignOut() {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      // No manual navigation: clearing the session makes RequireAuth redirect
      // to the intro automatically.
    } catch (err) {
      console.warn('[profile] sign out failed', err);
      setSignOutError('Unable to sign out. Please try again.');
      setSigningOut(false);
      setSignOutOpen(false);
    }
  }

  if (loading) {
    return (
      <ThemedScreen scroll>
        <FadeInView delay={0}>
          <ScreenStateSkeleton tall style={styles.skeleton} />
        </FadeInView>
        <FadeInView delay={80}>
          <ScreenStateSkeleton rows={3} />
        </FadeInView>
      </ThemedScreen>
    );
  }

  if (!user) {
    return (
      <ThemedScreen>
        <ScreenState
          kind="error"
          icon="person-outline"
          title="Unable to load your profile"
          message="Please try again."
          actionLabel="Try Again"
          onAction={() => {
            void refreshProfile();
          }}
        />
      </ThemedScreen>
    );
  }

  const displayName = userNameFallback(user.name);

  return (
    <ThemedScreen scroll keyboardShouldPersistTaps="handled">
      <View style={styles.titleRow}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/home');
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
          Profile
        </ThemedText>
      </View>

      <FadeInView delay={0}>
        <LinearGradient
          colors={['#17422F', '#0B201B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.identityCard}
        >
          <View style={styles.glowTop} />
          <Pressable
            onPress={handlePickPhoto}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
            disabled={uploading}
            style={styles.avatarPressable}
          >
            <View style={styles.avatarRing}>
              <GlassAvatar uri={user.profile_image_url} name={displayName} size={104} />
              {uploading ? (
                <View style={styles.avatarBadge}>
                  <ActivityIndicator size="small" color={colors.textInverse} />
                </View>
              ) : (
                <View style={styles.avatarBadge}>
                  <Ionicons name="camera" size={iconSizes.xs} color={colors.textInverse} />
                </View>
              )}
            </View>
            <View style={styles.changePhoto}>
              <Ionicons name="camera-outline" size={iconSizes.xs} color={colors.accentStrong} />
              <ThemedText variant="captionBold" color={colors.accentStrong}>
                {uploading ? 'Updating photo…' : 'Change Photo'}
              </ThemedText>
            </View>
          </Pressable>

          <ThemedText variant="heading" color={colors.text} style={styles.displayName} numberOfLines={1}>
            {displayName}
          </ThemedText>
          {email ? (
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={iconSizes.xs} color={colors.textMuted} />
              <ThemedText variant="caption" color={colors.textMuted} numberOfLines={1}>
                {email}
              </ThemedText>
            </View>
          ) : null}
        </LinearGradient>
        {photoError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.inlineError}>
            {photoError}
          </ThemedText>
        ) : null}
      </FadeInView>

      <FadeInView delay={60} style={styles.sectionGap}>
        <GlassSection title="Personal Information">
          <GlassCard padding={spacing.lg}>
            <GlassInput
              label="Display name"
              value={nameInput}
              onChangeText={(value) => {
                setNameInput(value);
                setNameTouched(true);
                setNameError(null);
              }}
              editable={!saving}
              maxLength={MAX_NAME_LENGTH}
              autoCapitalize="words"
              placeholder="Your name"
            />
            {nameEmptyError ? (
              <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
                Please enter your name.
              </ThemedText>
            ) : null}
            {nameTooLongError ? (
              <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
                Name must be {MAX_NAME_LENGTH} characters or fewer.
              </ThemedText>
            ) : null}
            {nameError ? (
              <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
                {nameError}
              </ThemedText>
            ) : null}
            <GlassButton
              title="Save Changes"
              onPress={handleSaveName}
              disabled={!canSave}
              loading={saving}
              loadingTitle="Saving…"
              style={styles.saveButton}
            />
            {savedFeedback ? (
              <ThemedText variant="captionBold" color={colors.accentStrong} style={styles.savedFeedback}>
                {savedFeedback}
              </ThemedText>
            ) : null}
          </GlassCard>
        </GlassSection>
      </FadeInView>

      <FadeInView delay={120}>
        <GlassSection title="Family">
          <Pressable
            onPress={() => router.push('/profile/family')}
            accessibilityRole="button"
            accessibilityLabel="Manage your shared family"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="people-outline" size={iconSizes.md} color={colors.accentStrong} />
            </View>
            <View style={styles.rowBody}>
              <ThemedText variant="bodyMedium" color={colors.text}>
                Family
              </ThemedText>
              <ThemedText variant="caption" color={colors.textMuted}>
                Manage your shared family
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textMuted} />
          </Pressable>
        </GlassSection>
      </FadeInView>

      <FadeInView delay={180}>
        <GlassSection title="Settings">
          <Pressable
            onPress={() => router.push('/profile/settings')}
            accessibilityRole="button"
            accessibilityLabel="App preferences and account settings"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="settings-outline" size={iconSizes.md} color={colors.accentStrong} />
            </View>
            <View style={styles.rowBody}>
              <ThemedText variant="bodyMedium" color={colors.text}>
                Settings
              </ThemedText>
              <ThemedText variant="caption" color={colors.textMuted}>
                App preferences and account settings
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.textMuted} />
          </Pressable>
        </GlassSection>
      </FadeInView>

      <FadeInView delay={240}>
        <GlassCard padding={spacing.lg} style={styles.accountCard}>
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
            <ThemedText variant="caption" color={colors.danger} style={styles.inlineError}>
              {signOutError}
            </ThemedText>
          ) : null}
        </GlassCard>
      </FadeInView>

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
          Sign Out
        </ThemedText>
        <ThemedText variant="body" color={colors.textSecondary} style={styles.modalBody}>
          Are you sure you want to sign out?
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
            onPress={handleConfirmSignOut}
            style={styles.modalButton}
          />
        </View>
      </GlassModal>
    </ThemedScreen>
  );
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
  sectionGap: {
    marginTop: spacing.xl,
  },
  identityCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  glowTop: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(85, 214, 177, 0.12)',
  },
  avatarPressable: {
    alignItems: 'center',
  },
  avatarRing: {
    position: 'relative',
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'rgba(85, 214, 177, 0.6)',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  displayName: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxs,
    paddingHorizontal: spacing.md,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  inlineError: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  fieldError: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  saveButton: {
    marginTop: spacing.xs,
  },
  savedFeedback: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  accountCard: {
    backgroundColor: colors.surface,
  },
  signOutButton: {
    minHeight: 50,
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
  skeleton: {
    marginBottom: spacing.lg,
  },
});
