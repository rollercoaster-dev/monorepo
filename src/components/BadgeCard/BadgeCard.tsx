import { View, Text, Pressable } from 'react-native';
import { styles } from './BadgeCard.styles';

export type BadgeCardSize = 'compact' | 'normal' | 'spacious';

export interface BadgeCardProps {
  title: string;
  earnedDate: string;
  evidenceCount: number;
  size?: BadgeCardSize;
  onPress?: () => void;
}

export function BadgeCard({
  title,
  earnedDate,
  evidenceCount,
  size = 'normal',
  onPress,
}: BadgeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Badge: ${title}, earned ${earnedDate}`}
      style={styles.pressable}
    >
      <View style={styles.container(size)}>
        <View style={styles.image}>
          <Text style={styles.imageText}>
            {(title.charAt(0) || '?').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.date}>{earnedDate}</Text>
        <Text style={styles.evidenceCount}>
          {evidenceCount} {evidenceCount === 1 ? 'piece' : 'pieces'} of evidence
        </Text>
      </View>
    </Pressable>
  );
}
