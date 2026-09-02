import { BlurView } from 'expo-blur';
import { PropsWithChildren, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { colors, glass, radius, shadows, spacing } from '../../../constants/theme';

type GlassModalProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  presentationStyle?: 'bottomSheet' | 'center';
}>;

export function GlassModal({ visible, onClose, presentationStyle = 'bottomSheet', children }: GlassModalProps) {
  const { height } = useWindowDimensions();
  const sheet = presentationStyle === 'bottomSheet';

  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const previous = document.body.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = previous;
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            sheet ? { maxHeight: height * 0.8 } : styles.centered,
          ]}
        >
          <BlurView intensity={glass.blur.heavy} tint="extraLight" style={sheet ? styles.blurSheet : styles.blurCenter}>
            {sheet ? <View style={styles.grabber} /> : null}
            {children}
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  centered: {
    marginHorizontal: spacing.xl,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  blurSheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.float,
  },
  blurCenter: {
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.float,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
    marginBottom: spacing.lg,
  },
});
