
import * as Location from 'expo-location';

interface OpenCageGeocodingResult {
  results?: Array<{
    components: {
      postcode: string;
      city: string;
      state: string;
      country: string;
    };
  }>;
}

/**
 * Get the user's current zip code using Expo's Location API and OpenCage Geocoding.
 */
export async function getCurrentZipCode(): Promise<string> {
  // 1. Request permission to access location
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access location was denied. Please enable it in your device settings.');
  }

  // 2. Get current location
  const location = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = location.coords;

  // 3. Reverse geocode to get address information including zip code
  const apiKey = process.env.EXPO_PUBLIC_OPENCAGE_API_KEY;
  if (!apiKey) {
    throw new Error('OpenCage API key not configured. Please set EXPO_PUBLIC_OPENCAGE_API_KEY in your environment.');
  }
  
  const geocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;
  
  const response = await fetch(geocodingUrl);
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.statusText}`);
  }
  
  const data: OpenCageGeocodingResult = await response.json();
  
  const postcode = data.results?.[0]?.components?.postcode;

  if (!postcode) {
    throw new Error('Could not determine zip code from your current location.');
  }

  return postcode;
}
