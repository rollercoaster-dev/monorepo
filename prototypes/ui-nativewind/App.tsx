import "./global.css";
import { ThemeProvider } from "./src/ThemeProvider";
import { TestScreen } from "./src/screens/TestScreen";

export default function App() {
  return (
    <ThemeProvider>
      <TestScreen />
    </ThemeProvider>
  );
}
