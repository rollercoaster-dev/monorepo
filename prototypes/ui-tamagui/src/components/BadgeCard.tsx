import { View, Text, styled, GetProps } from '@tamagui/core';
import { Pressable } from 'react-native';

const CardContainer = styled(View, {
  name: 'BadgeCard',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: '$lg',
  padding: '$4',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 2,

  variants: {
    size: {
      compact: {
        padding: '$3',
      },
      normal: {
        padding: '$4',
      },
      spacious: {
        padding: '$5',
      },
    },
  } as const,

  defaultVariants: {
    size: 'normal',
  },
});

const BadgeImage = styled(View, {
  width: 80,
  height: 80,
  borderRadius: '$md',
  backgroundColor: '$accentPurple',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '$3',
});

const BadgeTitle = styled(Text, {
  fontSize: '$5',
  fontWeight: '600',
  color: '$color',
  marginBottom: '$1',
});

const BadgeDate = styled(Text, {
  fontSize: '$2',
  color: '$colorMuted',
});

const EvidenceCount = styled(Text, {
  fontSize: '$2',
  color: '$colorSecondary',
  marginTop: '$2',
});

export interface BadgeCardProps extends GetProps<typeof CardContainer> {
  title: string;
  earnedDate: string;
  evidenceCount: number;
  onPress?: () => void;
}

export function BadgeCard({
  title,
  earnedDate,
  evidenceCount,
  onPress,
  ...props
}: BadgeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Badge: ${title}, earned ${earnedDate}`}
      style={{ minHeight: 48 }}
    >
      <CardContainer {...props}>
        <BadgeImage>
          <Text color="white" fontSize="$7" fontWeight="700">
            {title.charAt(0).toUpperCase()}
          </Text>
        </BadgeImage>
        <BadgeTitle>{title}</BadgeTitle>
        <BadgeDate>{earnedDate}</BadgeDate>
        <EvidenceCount>
          {evidenceCount} {evidenceCount === 1 ? 'piece' : 'pieces'} of evidence
        </EvidenceCount>
      </CardContainer>
    </Pressable>
  );
}
