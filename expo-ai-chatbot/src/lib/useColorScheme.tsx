import { useContext } from "react";
import { ColorSchemeContext } from "@/design-system/color-scheme/context";
import type { ColorSchemeName } from "react-native";

export function useColorScheme() {
  const colorSchemeContext = useContext(ColorSchemeContext);
  
  if (!colorSchemeContext) {
    // Fallback when context is not available
    return {
      colorScheme: "light" as ColorSchemeName,
      isDarkColorScheme: false,
      setColorScheme: (scheme: ColorSchemeName) => {},
      toggleColorScheme: () => {},
    };
  }
  
  const { colorScheme, setColorScheme } = colorSchemeContext;
  
  return {
    colorScheme: colorScheme ?? "light",
    isDarkColorScheme: colorScheme === "dark",
    setColorScheme,
    toggleColorScheme: () => setColorScheme(colorScheme === "dark" ? "light" : "dark"),
  };
}
