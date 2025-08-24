import { fetchWeatherApi } from 'openmeteo';

interface WeatherData {
  city: string;
  current: {
    temperature_2m: number;
    weathercode: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
  daily?: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

interface OpenCageGeocodingResult {
  results?: Array<{
    components: {
      city: string;
      state: string;
      country: string;
    };
    geometry: {
      lat: number;
      lng: number;
    };
  }>;
}

/**
 * Get coordinates for a city using OpenCage Geocoding API
 */
async function getCoordinates(city: string): Promise<{ lat: number; lon: number; name: string }> {
  const apiKey = process.env.EXPO_PUBLIC_OPENCAGE_API_KEY;
  if (!apiKey) {
    throw new Error('OpenCage API key not configured');
  }
  const geocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=${apiKey}`;
  
  const response = await fetch(geocodingUrl);
  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.statusText}`);
  }
  
  const data: OpenCageGeocodingResult = await response.json();
  
  if (!data.results || data.results.length === 0) {
    throw new Error(`City "${city}" not found`);
  }
  
  const result = data.results[0];
  return {
    lat: result.geometry.lat,
    lon: result.geometry.lng,
    name: result.components.city
  };
}

/**
 * Fetch weather data from Open-Meteo API
 */
export async function getWeatherData(city: string, forecast_days?: number): Promise<WeatherData> {
  try {
    // First, get coordinates for the city
    const { lat, lon, name } = await getCoordinates(city);
    
    const params: any = {
      "latitude": lat,
      "longitude": lon,
      "current": ["temperature_2m", "relative_humidity_2m", "weather_code", "wind_speed_10m"],
      "temperature_unit": "fahrenheit",
      "wind_speed_unit": "mph",
      "timezone": "auto",
    };

    if (forecast_days) {
      params["daily"] = ["weather_code", "temperature_2m_max", "temperature_2m_min"];
      params["forecast_days"] = forecast_days;
    }

    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);
    
    const response = responses[0];
    const current = response.current()!;
    const daily = response.daily()!;

    const weatherData: WeatherData = {
      city: name,
      current: {
        temperature_2m: Math.round(current.variables(0)!.value()),
        relative_humidity_2m: current.variables(1)!.value(),
        weathercode: current.variables(2)!.value(),
        wind_speed_10m: Math.round(current.variables(3)!.value() * 10) / 10,
      }
    };

    if (daily) {
      weatherData.daily = {
        time: daily.variables(0)!.valuesArray()! as unknown as string[],
        weathercode: daily.variables(1)!.valuesArray()! as unknown as number[],
        temperature_2m_max: daily.variables(2)!.valuesArray()! as unknown as number[],
        temperature_2m_min: daily.variables(3)!.valuesArray()! as unknown as number[],
      };
    }
    
    return weatherData;
  } catch (error) {
    console.error('Weather service error:', error);
    if (error instanceof Error && error.message.includes('City')) {
      throw new Error(`I couldn't find the weather for ${city}. Please try a different city or be more specific.`);
    }
    throw new Error(`Failed to get weather data for ${city}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get weather data with error handling and fallback
 */
export async function getWeatherSafely(city: string): Promise<WeatherData | null> {
  try {
    return await getWeatherData(city);
  } catch (error) {
    console.error('Weather fetch failed:', error);
    return null;
  }
}