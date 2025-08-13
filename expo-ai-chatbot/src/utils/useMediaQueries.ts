import { Platform, useWindowDimensions } from "react-native";

type QueryKeys =
  | "maxWidth"
  | "minWidth"
  | "maxHeight"
  | "minHeight"
  | "orientation";

type SubQuery = {
  [queryKey in QueryKeys]?: number | string;
};
type Query = Array<SubQuery>;

export function useMediaQuery(query: SubQuery | Query) {
  const dims = useWindowDimensions();
  const height = dims?.height;
  const width = dims?.width;

  return iterateQuery(query, height, width);
}

function queryResolver(query: any, width?: number, height?: number) {
  for (const queryKey in query) {
    if (!calculateQuery(queryKey, query[queryKey], height, width)) {
      return false;
    }
  }
  return true;
}

function iterateQuery(
  query: SubQuery | Query,
  height?: number,
  width?: number,
) {
  const queryResults = [];
  if (Array.isArray(query)) {
    query.forEach((subQuery: SubQuery) => {
      queryResults.push(queryResolver(subQuery, width, height));
    });
  } else {
    queryResults.push(queryResolver(query, width, height));
  }
  return queryResults;
}

function calculateQuery(
  key: string,
  val?: number | string,
  height?: number,
  width?: number,
) {
  let retval;
  switch (key) {
    case "maxWidth":
      retval = typeof val === "number" && width ? width <= val : undefined;
      break;
    case "minWidth":
      retval = typeof val === "number" && width ? width >= val : undefined;
      break;
    case "maxHeight":
      retval = typeof val === "number" && height ? height <= val : undefined;
      break;
    case "minHeight":
      retval = typeof val === "number" && height ? height >= val : undefined;
      break;
    case "orientation":
      if (val) {
        if (width && height && width > height) {
          retval = typeof val === "string" && val === "landscape";
        } else {
          retval = typeof val === "string" && val === "portrait";
        }
      }
      break;
    default:
      break;
  }
  return retval;
}

export function useMediaQueries() {
  const [isXs, isSm, isMd, isLg, isXl, is2xl] = useMediaQuery([
    {
      maxWidth: 639,
    },
    {
      minWidth: 640,
      maxWidth: 767,
    },
    {
      minWidth: 768,
      maxWidth: 1023,
    },
    {
      minWidth: 1024,
      maxWidth: 1279,
    },
    {
      minWidth: 1280,
      maxWidth: 1535,
    },
    {
      minWidth: 1536,
    },
  ]);

  const isMobile = isXs || isSm;
  const isTablet = isMd;
  const isSmallScreen = isXs || isSm || isMd;
  const isLargeScreen = isLg || isXl || is2xl;

  const isMobileWeb = Platform.OS === "web" && isMobile;
  const isMobileNative = Platform.OS !== "web" && isMobile;
  const isTabletWeb = Platform.OS === "web" && isTablet;
  const isTabletNative = Platform.OS !== "web" && isTablet;
  const isSmallScreenWeb = Platform.OS === "web" && isSmallScreen;
  const isSmallScreenNative = Platform.OS !== "web" && isSmallScreen;
  const isLargeScreenWeb = Platform.OS === "web" && isLargeScreen;
  const isLargeScreenNative = Platform.OS !== "web" && isLargeScreen;

  return {
    // General screen sizes
    isMobile,
    isTablet,
    isSmallScreen,
    isLargeScreen,

    // Web-specific
    isMobileWeb,
    isTabletWeb,
    isSmallScreenWeb,
    isLargeScreenWeb,

    // Native-specific
    isMobileNative,
    isTabletNative,
    isSmallScreenNative,
    isLargeScreenNative,

    // Breakpoints
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
  };
}
