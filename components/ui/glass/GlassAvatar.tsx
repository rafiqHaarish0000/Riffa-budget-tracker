import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontFamily, fontWeight, radius, typography } from '../../../constants/theme';

type GlassAvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: ViewStyle | ViewStyle[];
};

export function GlassAvatar({ uri, name, size = 44, style }: GlassAvatarProps) {
  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.wrapper,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { borderRadius: size / 2 }]} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.36, fontFamily, fontWeight: fontWeight.semibold }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    ...typography.captionBold,
    color: colors.accentStrong,
  },
});

export const avatarRadius = radius.pill;
