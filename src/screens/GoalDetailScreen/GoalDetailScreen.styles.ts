import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  backIcon: {
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
  },
  spacer: {
    width: 48,
  },
  scrollContent: {
    padding: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.space[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[3],
  },
  titleText: {
    flex: 1,
  },
  descriptionText: {
    color: theme.colors.textSecondary,
  },
  mutedText: {
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.space[3],
  },
  actionButton: {
    flex: 1,
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
  completionCue: {
    color: theme.colors.success,
    marginTop: theme.space[2],
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.space[4],
    backgroundColor: `${theme.colors.shadow}80`,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    alignItems: 'center',
    gap: theme.space[3],
    marginBottom: theme.space[4],
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  modalActions: {
    gap: theme.space[2],
  },
}));
