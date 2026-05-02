import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    // eslint-disable-next-line local/no-raw-colors -- fullscreen media canvas, intentionally opaque black
    backgroundColor: "black",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  captionBar: {
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  captionText: {
    // eslint-disable-next-line local/no-raw-colors -- white-on-black media overlay chrome
    color: "white",
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    textAlign: "center",
  },
  errorText: {
    // eslint-disable-next-line local/no-raw-colors -- white-on-black media overlay chrome
    color: "white",
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    textAlign: "center",
  },
}));
