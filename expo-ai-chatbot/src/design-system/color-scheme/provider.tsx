import { useState, useCallback, useEffect } from "react";
import {
  useColorScheme as useDeviceColorScheme,
  Appearance,
  Platform,
} from "react-native";
import type { ColorSchemeName } from "react-native";

import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import { useColorScheme as useTailwindColorScheme } from "nativewind";

import { ColorSchemeContext } from "./context";
import {
  deleteDisabledSystemTheme,
  getColorScheme as getPersistedColorScheme,
  getDisabledSystemTheme,
  setColorScheme as persistColorScheme,
  setDisabledSystemTheme,
} from "./store";

export const toggleColorScheme = (isDark?: boolean) => {
  if (Platform.OS !== "android") return;
  NavigationBar.setBackgroundColorAsync(isDark ? "#000" : "#FFF");
  NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
};

// Web-specific theme detection using CSS media queries
const getWebSystemTheme = (): 'light' | 'dark' => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

export function ColorSchemeProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const deviceColorScheme = useDeviceColorScheme();
  const nativewind = useTailwindColorScheme();
  const [colorScheme, setColorScheme] = useState<"dark" | "light">(
    deviceColorScheme
  );

  useEffect(() => {
    getPersistedColorScheme().then((persistedScheme) => {
      const appearanceTheme = Appearance.getColorScheme();
      const webSystemTheme = getWebSystemTheme();
      const disabledSystemTheme = getDisabledSystemTheme();
      
      // Clear any persisted scheme and use actual system theme
      deleteDisabledSystemTheme();
      
      // Use web-specific detection for web platform, fallback to device scheme for mobile
      const actualSystemTheme = Platform.OS === 'web' ? webSystemTheme : (deviceColorScheme || 'light');
      setColorScheme(actualSystemTheme);
      
      // Force the correct theme immediately
      const isDark = actualSystemTheme === 'dark';
      if (isDark) {
        toggleColorScheme(isDark);
        SystemUI.setBackgroundColorAsync('black');
        nativewind.setColorScheme('dark');
      } else {
        toggleColorScheme();
        SystemUI.setBackgroundColorAsync('white');
        nativewind.setColorScheme('light');
      }
    });
  }, [deviceColorScheme, nativewind]);

  const changeTheme = useCallback(
    (newColorScheme: ColorSchemeName) => {
      if (!newColorScheme) return;
      persistColorScheme(newColorScheme);
      setColorScheme(newColorScheme);
      const isDark = newColorScheme === "dark";
      if (isDark) {
        toggleColorScheme(isDark);
        SystemUI.setBackgroundColorAsync("black");
        nativewind.setColorScheme("dark");
      } else {
        toggleColorScheme();
        SystemUI.setBackgroundColorAsync("white");
        nativewind.setColorScheme("light");
      }
    },
    [nativewind]
  );

  useEffect(() => {
    const themeChangeListener = () => {
      const theme = Appearance.getColorScheme();
      const webSystemTheme = getWebSystemTheme();
      const disabledSystemTheme = getDisabledSystemTheme();
      
      // Use web-specific detection for theme changes on web platform
      const actualTheme = Platform.OS === 'web' ? webSystemTheme : (theme && !disabledSystemTheme ? theme : colorScheme);
      changeTheme(actualTheme);
    };
    themeChangeListener();
    const appearanceListener =
      Appearance.addChangeListener(themeChangeListener);
    return () => {
      // @ts-ignore
      appearanceListener.remove();
    };
  }, [changeTheme, colorScheme, deviceColorScheme]);

  const handleColorSchemeChange = (newColorScheme: ColorSchemeName) => {
    if (newColorScheme) {
      changeTheme(newColorScheme);
      setDisabledSystemTheme();
    } else {
      deleteDisabledSystemTheme();
      const theme = Appearance.getColorScheme();
      if (theme) {
        changeTheme(theme);
      }
    }
  };

  return (
    <ColorSchemeContext.Provider
      value={{ colorScheme, setColorScheme: handleColorSchemeChange }}
    >
      {children}
    </ColorSchemeContext.Provider>
  );
}
