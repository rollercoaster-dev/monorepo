import { View, Text, styled } from '@tamagui/core';
import { ScrollView, SafeAreaView } from 'react-native';
import { BadgeCard } from '../components/BadgeCard';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

const Container = styled(View, {
  flex: 1,
  backgroundColor: '$background',
});

const Section = styled(View, {
  padding: '$4',
});

const SectionTitle = styled(Text, {
  fontSize: '$5',
  fontWeight: '600',
  color: '$color',
  marginBottom: '$3',
});

// Mock badge data
const mockBadges = [
  {
    id: '1',
    title: 'First Steps',
    earnedDate: 'Feb 2, 2026',
    evidenceCount: 3,
  },
  {
    id: '2',
    title: 'Consistency Champion',
    earnedDate: 'Feb 1, 2026',
    evidenceCount: 7,
  },
  {
    id: '3',
    title: 'Deep Focus',
    earnedDate: 'Jan 28, 2026',
    evidenceCount: 2,
  },
];

export function TestScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Container>
        <ScrollView>
          <ThemeSwitcher />

          <Section>
            <SectionTitle>Your Badges</SectionTitle>
            {mockBadges.map((badge) => (
              <View key={badge.id} marginBottom="$4">
                <BadgeCard
                  title={badge.title}
                  earnedDate={badge.earnedDate}
                  evidenceCount={badge.evidenceCount}
                  onPress={() => console.log(`Pressed badge: ${badge.title}`)}
                />
              </View>
            ))}
          </Section>
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
}
