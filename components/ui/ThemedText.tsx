import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, typography } from '../../constants/theme';

type Variant = keyof typeof typography;

type ThemedTextProps = TextProps & {
  variant?: Variant;
  color?: string;
  style?: TextStyle | TextStyle[];
};

export function ThemedText({
  variant = 'body',
  color = colors.text,
  style,
  children,
  ...rest
}: ThemedTextProps) {
  return (
    <Text {...rest} style={[typography[variant], { color }, style]}>
      {children}
    </Text>
  );
}
