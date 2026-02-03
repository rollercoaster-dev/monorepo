import { View, Text, ScrollView } from 'react-native';
import { UnistylesRuntime, useUnistyles } from 'react-native-unistyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BadgeCard } from '../../components/BadgeCard';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { styles } from './TestScreen.styles';

export function TestScreen() {
  const { theme } = useUnistyles();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Theme Info */}
        <View style={styles.themeInfo}>
          <Text style={styles.themeInfoText}>
            Current theme: {UnistylesRuntime.themeName}
          </Text>
        </View>

        {/* Theme Switcher */}
        <View style={styles.section}>
          <ThemeSwitcher />
        </View>

        {/* Badge Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badge Cards</Text>
          <View style={styles.row}>
            <BadgeCard
              title="Creativity"
              earnedDate="Jan 15, 2024"
              evidenceCount={3}
              size="compact"
            />
            <BadgeCard
              title="Problem Solving"
              earnedDate="Feb 1, 2024"
              evidenceCount={5}
              size="normal"
            />
          </View>
        </View>

        {/* Color Swatches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme Colors</Text>
          <View style={styles.row}>
            <View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.colors.background }]} />
              <Text style={styles.swatchLabel}>bg</Text>
            </View>
            <View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.colors.backgroundSecondary }]} />
              <Text style={styles.swatchLabel}>bg2</Text>
            </View>
            <View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.colors.accentPurple }]} />
              <Text style={styles.swatchLabel}>purple</Text>
            </View>
            <View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.colors.accentMint }]} />
              <Text style={styles.swatchLabel}>mint</Text>
            </View>
            <View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.colors.accentYellow }]} />
              <Text style={styles.swatchLabel}>yellow</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
