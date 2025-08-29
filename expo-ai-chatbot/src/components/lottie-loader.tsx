import { useRef } from "react";
import { View, useColorScheme } from "react-native";
import LottieView from "lottie-react-native";
import loaderAnimation from "../assets/loader-three-dots.json";

export const LottieLoader = ({ width = 60, height = 60 }) => {
  const animationRef = useRef<LottieView>(null);
  const colorScheme = useColorScheme();
  
  // Color filters to change black dots to white in dark mode
  const colorFilters = colorScheme === 'dark' ? [
    {
      keypath: "**",
      color: "#FFFFFF", // White color for dark mode
    },
  ] : undefined;

  return (
    <View
      className="ml-0"
      style={{
        width: width,
        height: height,
        alignItems: "flex-start",
        justifyContent: "flex-start",
      }}
    >
      <LottieView
        ref={animationRef}
        source={loaderAnimation}
        autoPlay
        loop
        colorFilters={colorFilters}
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
};
