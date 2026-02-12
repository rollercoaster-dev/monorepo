import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'black',
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  closeText: {
    fontSize: 18,
    color: 'white',
    fontWeight: theme.fontWeight.bold,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  captionBar: {
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  captionText: {
    color: 'white',
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    textAlign: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    textAlign: 'center',
  },
}));
