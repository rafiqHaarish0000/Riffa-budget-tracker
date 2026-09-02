import { ThemedText } from './ThemedText';
import { ThemedScreen } from './ThemedScreen';
import { GlassCard } from './glass';
import { colors } from '../../constants/theme';

type PlaceholderScreenProps = {
  title: string;
  description?: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <ThemedScreen>
      <GlassCard style={{ justifyContent: 'center' }}>
        <ThemedText variant="heading" color={colors.text}>
          {title}
        </ThemedText>
        {description ? (
          <ThemedText variant="body" color={colors.textSecondary} style={{ marginTop: 8 }}>
            {description}
          </ThemedText>
        ) : null}
      </GlassCard>
    </ThemedScreen>
  );
}
