import type React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ColorSchemeProvider } from "@/design-system/color-scheme/provider";
import { Toaster } from "@/components/sonner";
import NativewindThemeProvider from "./ThemeProvider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ColorSchemeProvider>
          <Toaster />
          <NativewindThemeProvider>
            <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
          </NativewindThemeProvider>
        </ColorSchemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default Providers;
