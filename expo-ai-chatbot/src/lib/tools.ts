import { z } from 'zod';
import { tool } from 'ai';
import { getWeatherData } from './weather-service';
import { getCurrentZipCode } from './location-service';
import * as Calendar from 'expo-calendar';

// Define the getWeather tool
export const getWeatherTool = tool({
  description: 'Get current weather information or a weather forecast for a specific city or zip code. Use this when users ask about weather conditions, temperature, or climate in any location. You can also specify the number of days for a forecast.',
  inputSchema: z.object({
    location: z.string(),
    forecast_days: z.number().optional(),
  }),
  execute: async ({ location, forecast_days }: { location: string, forecast_days?: number }) => {
    try {
      if (!location || typeof location !== 'string' || location.trim().length === 0) {
        throw new Error(`Invalid location parameter: ${JSON.stringify(location)}`);
      }
      const result = await getWeatherData(location.trim(), forecast_days ?? 3);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        error.message = `Weather tool execution failed for location "${location}": ${error.message}`;
      }
      throw error;
    }
  }
});

// Define the webSearchTool
export const webSearchTool = tool({
  description: 'Use the Serper API to perform a web search. This is useful for finding information on the internet. Use this when users ask for information that is not related to weather.',
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }: { query: string }) => {
    const myHeaders = new Headers();
    myHeaders.append("X-API-KEY", process.env.EXPO_PUBLIC_SERPER_API_KEY);
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      "q": query
    });

    const requestOptions: RequestInit = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };

    try {
      const response = await fetch("https://google.serper.dev/search", requestOptions);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(error);
      return { error: error.message };
    };
  }
});

// Define the getLocation tool
export const getLocationTool = tool({
  description: 'Get the user\'s current zip code to provide location-specific information for queries about nearby places, such as restaurants or movie theaters.',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const zipCode = await getCurrentZipCode();
      return { zipCode };
    } catch (error) {
      return { error: error.message };
    }
  }
});

// Define calendar tools
export const getCalendarEventsTool = tool({
  description: 'Get calendar events for a specific date range. Use this when users ask about their schedule, upcoming events, or what they have planned.',
  inputSchema: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  execute: async ({ startDate, endDate }: { startDate: string, endDate: string }) => {
    console.log('🔍 getCalendarEvents - Input parameters:', { startDate, endDate });
    console.log('🔍 getCalendarEvents - Device info:', {
      platform: 'expo',
      calendarEntityType: Calendar.EntityTypes.EVENT,
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('🔍 getCalendarEvents - Requesting calendar permissions...');
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      console.log('🔍 getCalendarEvents - Permission status:', status);
      
      if (status !== 'granted') {
        const errorResult = { error: 'Calendar permission not granted. Please enable calendar access in settings.' };
        console.log('🔍 getCalendarEvents - Permission denied, returning:', errorResult);
        return errorResult;
      }

      console.log('🔍 getCalendarEvents - Getting calendars...');
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      console.log('🔍 getCalendarEvents - Found calendars:', calendars.length, calendars.map(c => ({ id: c.id, title: c.title })));
      
      // Enhanced logging for calendar configuration status
      console.log('🔍 getCalendarEvents - Calendar configuration details:', {
        calendarsFound: calendars?.length || 0,
        calendarsArray: calendars,
        isCalendarsNull: calendars === null,
        isCalendarsUndefined: calendars === undefined,
        isCalendarsEmpty: Array.isArray(calendars) && calendars.length === 0
      });
      
      // Check if no calendars are configured
      if (!calendars || calendars.length === 0) {
        console.log('❌ getCalendarEvents - EMPTY/UNCONFIGURED CALENDARS DETECTED');
        console.log('🔍 getCalendarEvents - Device calendar status:', {
          calendarsValue: calendars,
          calendarsType: typeof calendars,
          calendarsLength: calendars?.length,
          possibleReasons: [
            'No calendar accounts configured on device',
            'All calendars are hidden or disabled',
            'Calendar app not set up',
            'Device restrictions preventing calendar access'
          ]
        });
        
        const errorResult = { error: 'No calendars found on this device. Please set up a calendar in your device settings first.' };
        console.log('🔍 getCalendarEvents - No calendars configured, returning:', errorResult);
        return errorResult;
      }
      
      console.log('🔍 getCalendarEvents - Getting events from', new Date(startDate), 'to', new Date(endDate));
      const events = await Calendar.getEventsAsync(
        calendars.map(cal => cal.id),
        new Date(startDate),
        new Date(endDate)
      );
      console.log('🔍 getCalendarEvents - Raw events from API:', events.length, 'events');
      console.log('🔍 getCalendarEvents - Raw event sample:', events[0] ? {
        id: events[0].id,
        title: events[0].title,
        startDate: events[0].startDate,
        endDate: events[0].endDate,
        startDateType: typeof events[0].startDate,
        endDateType: typeof events[0].endDate,
        allDay: events[0].allDay,
        allDayType: typeof events[0].allDay
      } : 'No events found');

      console.log('🔍 getCalendarEvents - Mapping events...');
      const mappedEvents = events.map((event, index) => {
        console.log(`🔍 getCalendarEvents - Mapping event ${index}:`, {
          originalId: event.id,
          originalTitle: event.title,
          originalStartDate: event.startDate,
          originalEndDate: event.endDate,
          originalAllDay: event.allDay
        });
        
        const mappedEvent = {
          id: event.id || '',
          title: event.title || '',
          startDate: event.startDate instanceof Date ? event.startDate.toISOString() : (event.startDate || ''),
          endDate: event.endDate instanceof Date ? event.endDate.toISOString() : (event.endDate || ''),
          location: event.location || '',
          notes: event.notes || '',
          allDay: Boolean(event.allDay),
        };
        
        console.log(`🔍 getCalendarEvents - Mapped event ${index}:`, mappedEvent);
        return mappedEvent;
      });

      const finalResult = {
        events: mappedEvents
      };
      
      console.log('🔍 getCalendarEvents - Final result structure:', {
        eventsCount: finalResult.events.length,
        firstEvent: finalResult.events[0] || null,
        resultKeys: Object.keys(finalResult),
        eventsKeys: finalResult.events[0] ? Object.keys(finalResult.events[0]) : []
      });
      console.log('🔍 getCalendarEvents - Full final result:', JSON.stringify(finalResult, null, 2));
      
      return finalResult;
    } catch (error) {
      const errorResult = { error: `Failed to get calendar events: ${error instanceof Error ? error.message : String(error)}` };
      console.log('🔍 getCalendarEvents - Error occurred:', error);
      console.log('🔍 getCalendarEvents - Error result:', errorResult);
      return errorResult;
    }
  }
});

export const createCalendarEventTool = tool({
  description: 'Create a new calendar event. Use this when users want to schedule meetings, appointments, or add events to their calendar.',
  inputSchema: z.object({
    title: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    location: z.string().optional(),
    notes: z.string().optional(),
    allDay: z.boolean().optional(),
  }),
  execute: async ({ title, startDate, endDate, location, notes, allDay }) => {
    console.log('🔍 createCalendarEvent - Input parameters:', { title, startDate, endDate, location, notes, allDay });
    console.log('🔍 createCalendarEvent - Device info:', {
      platform: 'expo',
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('🔍 createCalendarEvent - Requesting calendar permissions...');
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      console.log('🔍 createCalendarEvent - Permission status:', status);
      
      if (status !== 'granted') {
        return { error: 'Calendar permission not granted. Please enable calendar access in settings.' };
      }
      
      console.log('🔍 createCalendarEvent - Getting default calendar...');

      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      
      // Enhanced logging for default calendar status
      console.log('🔍 createCalendarEvent - Default calendar details:', {
        defaultCalendar: defaultCalendar,
        hasDefaultCalendar: !!defaultCalendar,
        defaultCalendarId: defaultCalendar?.id,
        defaultCalendarTitle: defaultCalendar?.title,
        defaultCalendarType: defaultCalendar?.type,
        defaultCalendarSource: defaultCalendar?.source
      });
      
      // Check if no default calendar is available
      if (!defaultCalendar || !defaultCalendar.id) {
        console.log('❌ createCalendarEvent - NO DEFAULT CALENDAR DETECTED');
        console.log('🔍 createCalendarEvent - Default calendar troubleshooting:', {
          defaultCalendarValue: defaultCalendar,
          defaultCalendarType: typeof defaultCalendar,
          hasId: defaultCalendar?.id !== undefined,
          idValue: defaultCalendar?.id,
          possibleReasons: [
            'No default calendar set on device',
            'Default calendar is disabled or hidden',
            'Calendar account not properly configured',
            'Device calendar settings need attention'
          ]
        });
        
        return { error: 'No default calendar found on this device. Please set up a calendar in your device settings first.' };
      }
      
      const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location: location || '',
        notes: notes || '',
        allDay: allDay ?? false,
      });

      return {
        success: true,
        eventId: eventId || '',
        message: `Event "${title}" created successfully`
      };
    } catch (error) {
      return { error: `Failed to create calendar event: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
});

export const updateCalendarEventTool = tool({
  description: 'Update an existing calendar event. Use this when users want to modify event details, reschedule, or change event information.',
  inputSchema: z.object({
    eventId: z.string(),
    title: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
  }),
  execute: async ({ eventId, title, startDate, endDate, location, notes }) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        return { error: 'Calendar permission not granted. Please enable calendar access in settings.' };
      }

      const updateData: any = {};
      if (title) updateData.title = title;
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (location !== undefined) updateData.location = location;
      if (notes !== undefined) updateData.notes = notes;

      await Calendar.updateEventAsync(eventId, updateData);

      return {
        success: true,
        message: 'Event updated successfully'
      };
    } catch (error) {
      return { error: `Failed to update calendar event: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
});

export const deleteCalendarEventTool = tool({
  description: 'Delete a calendar event. Use this when users want to cancel or remove events from their calendar.',
  inputSchema: z.object({
    eventId: z.string(),
  }),
  execute: async ({ eventId }) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        return { error: 'Calendar permission not granted. Please enable calendar access in settings.' };
      }

      await Calendar.deleteEventAsync(eventId);

      return {
        success: true,
        message: 'Event deleted successfully'
      };
    } catch (error) {
      return { error: `Failed to delete calendar event: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
});

// Export all available tools
export const tools = {
  getWeather: getWeatherTool,
  webSearch: webSearchTool,
  getLocation: getLocationTool,
  getCalendarEvents: getCalendarEventsTool,
  createCalendarEvent: createCalendarEventTool,
  updateCalendarEvent: updateCalendarEventTool,
  deleteCalendarEvent: deleteCalendarEventTool,
};

// Export tool names for easy reference
export const toolNames = Object.keys(tools) as Array<keyof typeof tools>;
