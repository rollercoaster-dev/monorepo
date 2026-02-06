import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { variantOptions, variantOverrides } from '../../themes/variants';
import type { ColorMode } from '../../themes/colorModes';
import { styles, variantPreviewStyles } from './ThemeSwitcher.styles';

const colorModeOptions: Array<{ id: ColorMode; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function ThemeSwitcher() {
  const { colorMode, variant, setColorMode, setVariant } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick what feels right</Text>

      <Text style={styles.sectionTitle}>Color Mode</Text>
      <View style={styles.colorModeRow} accessibilityRole="radiogroup">
        {colorModeOptions.map((option) => {
          const isSelected = colorMode === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setColorMode(option.id)}
              accessible
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${option.label} mode`}
              style={styles.colorModeButton(isSelected)}
            >
              <Text style={styles.colorModeLabel(isSelected)}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Accessibility</Text>
      <ScrollView>
        <View accessibilityRole="radiogroup">
        {variantOptions.map((option) => {
          const isSelected = variant === option.id;
          const variantDef = variantOverrides[option.id];

          return (
            <Pressable
              key={option.id}
              onPress={() => setVariant(option.id)}
              accessible
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${option.label}. ${option.description}`}
            >
              <View style={styles.variantButton(isSelected)}>
                <Text style={variantPreviewStyles.label(option.id, variantDef)}>
                  {option.label}
                </Text>
                <Text style={variantPreviewStyles.description(option.id, variantDef)}>
                  {option.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
        </View>
      </ScrollView>
    </View>
  );
}
