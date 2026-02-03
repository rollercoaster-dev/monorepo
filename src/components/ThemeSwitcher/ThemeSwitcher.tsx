import { View, Text, Pressable, ScrollView } from 'react-native';
import { useStyles, UnistylesRuntime } from 'react-native-unistyles';
import { themeOptions, ThemeName } from '../../themes';
import { stylesheet } from './ThemeSwitcher.styles';

export function ThemeSwitcher() {
  const { styles } = useStyles(stylesheet);
  const currentTheme = UnistylesRuntime.themeName as ThemeName;

  const handleThemeChange = (themeName: ThemeName) => {
    UnistylesRuntime.setTheme(themeName);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick what feels right</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {themeOptions.map((option) => {
          const isSelected = currentTheme === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => handleThemeChange(option.id)}
              accessible
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${option.label} theme. ${option.description}`}
            >
              <View style={styles.button(isSelected)}>
                <Text style={styles.label}>{option.label}</Text>
                <Text style={styles.description}>{option.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
