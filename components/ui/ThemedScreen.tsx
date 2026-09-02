import { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, theme } from '../../constants/theme';
import { GlassScreenBackground } from './glass/GlassBackground';

type ThemedScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  style?: ViewStyle | ViewStyle[];
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
}>;

export function ThemedScreen({
  children,
  scroll = false,
  contentContainerStyle,
  style,
  scrollProps,
  keyboardShouldPersistTaps = 'handled',
}: ThemedScreenProps) {
  const insets = useSafeAreaInsets();

  const baseContentStyle: ViewStyle = {
    paddingTop: insets.top + spacing.md,
    paddingBottom: insets.bottom + spacing.xxl,
    paddingHorizontal: theme.screenPadding,
  };

  return (
    <GlassScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            {...scrollProps}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            contentContainerStyle={[baseContentStyle, contentContainerStyle]}
            style={style}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, baseContentStyle, style]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </GlassScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
