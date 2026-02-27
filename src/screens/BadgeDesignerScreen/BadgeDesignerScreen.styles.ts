import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  contentArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    paddingBottom: theme.space[4],
    backgroundColor: theme.colors.accentYellow,
    zIndex: 1,
    ...shadowStyle(theme, 'hardMd'),
  },
  topBarTitle: {
    ...theme.textStyles.title,
    color: theme.colors.text,
  },
  spacer: {
    width: 48,
  },
  scrollContent: {
    paddingBottom: theme.space[12],
    gap: theme.space[4],
    alignItems: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space[4],
    borderRadius: 0,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
    ...shadowStyle(theme, 'hardMd'),
  },
  sectionContainer: {
    width: '100%',
    gap: theme.space[2],
  },
  sectionLabel: {
    ...theme.textStyles.label,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: theme.space[4],
  },
  iconSection: {
    width: '100%',
    gap: theme.space[2],
  },
  footer: {
    paddingTop: theme.space[6],
    paddingBottom: theme.space[4],
    paddingHorizontal: theme.space[4],
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.space[4],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
}));
