import { StyleSheet } from 'react-native-unistyles';
import { size, sizeL, lineHeight, lineHeightL } from '../../themes/tokens';
import type { Variant } from '../../themes/variants';

export const styles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
  },
  title: {
    fontSize: theme.size['2xl'],
    lineHeight: theme.lineHeight['2xl'],
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily,
    color: theme.colors.text,
    marginBottom: theme.space[4],
  },
  sectionTitle: {
    fontSize: theme.size.lg,
    lineHeight: theme.lineHeight.lg,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily,
    color: theme.colors.textSecondary,
    marginBottom: theme.space[2],
    marginTop: theme.space[2],
  },
  colorModeRow: {
    flexDirection: 'row',
    gap: theme.space[2],
    marginBottom: theme.space[4],
  },
  colorModeButton: (selected: boolean) => ({
    flex: 1,
    padding: theme.space[3],
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: selected ? theme.colors.accentPurple : theme.colors.border,
    backgroundColor: selected ? theme.colors.backgroundSecondary : theme.colors.background,
    alignItems: 'center' as const,
  }),
  colorModeLabel: (selected: boolean) => ({
    fontSize: theme.size.md,
    lineHeight: theme.lineHeight.md,
    fontWeight: selected ? theme.fontWeight.bold : theme.fontWeight.normal,
    fontFamily: theme.fontFamily,
    color: theme.colors.text,
  }),
  variantButton: (selected: boolean) => ({
    padding: theme.space[3],
    borderRadius: theme.radius.md,
    borderWidth: 2,
    marginBottom: theme.space[2],
    borderColor: selected ? theme.colors.accentPurple : theme.colors.border,
    backgroundColor: selected ? theme.colors.backgroundSecondary : theme.colors.background,
  }),
  label: {
    fontSize: theme.size.lg,
    lineHeight: theme.lineHeight.lg,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily,
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.sm,
    fontFamily: theme.fontFamily,
    color: theme.colors.textSecondary,
    marginTop: theme.space[1],
  },
}));

// Variant-specific preview styles for each button
interface VariantDef {
  size?: typeof size | typeof sizeL;
  lineHeight?: typeof lineHeight | typeof lineHeightL;
  fontFamily?: string;
}

export const variantPreviewStyles = {
  label: (_variantId: Variant, variantDef: VariantDef) => {
    const sizeScale = variantDef.size ?? size;
    const lineHeightScale = variantDef.lineHeight ?? lineHeight;

    return {
      fontSize: sizeScale.lg,
      lineHeight: lineHeightScale.lg,
      fontWeight: '600' as const,
      fontFamily: variantDef.fontFamily,
    };
  },
  description: (_variantId: Variant, variantDef: VariantDef) => {
    const sizeScale = variantDef.size ?? size;
    const lineHeightScale = variantDef.lineHeight ?? lineHeight;

    return {
      fontSize: sizeScale.sm,
      lineHeight: lineHeightScale.sm,
      fontFamily: variantDef.fontFamily,
      marginTop: 4,
    };
  },
};
