import { ref, watch, type Ref } from 'vue';
import { get, set } from 'idb-keyval';
import { fetchWeatherApi } from 'openmeteo';
import type { Event } from '../types/Event';
import type { EventWeather } from '../types/Weather';
import { useGeocode } from './useGeocode';

// Persistent Cache Keys (Prefixes)
const FORECAST_PREFIX = 'weather_forecast_';
const FORECAST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// In-memory tracking for in-flight requests
const pendingForecasts = new Map<string, Promise<any>>();

// Track what we've already fetched to avoid redundant re-processing
// key: eventId, value: signature (location + startTime)
const weatherFetchSignatures = new Map<number, string>();

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const getWeekRange = (targetDate: Date) => {
    const start = new Date(targetDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Align to Monday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Sunday
    end.setHours(23, 59, 59, 999);

    return {
        start,
        end,
        startStr: formatDate(start),
        endStr: formatDate(end)
    };
};

export const mapWeatherCodeToSummary = (
    code: number | null,
    isDay = true
): { summary: string; meteoconSlug: string } => {
    if (code === null) return { summary: 'Unknown', meteoconSlug: 'not-available' };

    // WMO Weather interpretation codes (WW)
    // https://open-meteo.com/en/docs
    if (code === 0) {
        return {
            summary: 'Clear',
            meteoconSlug: isDay ? 'clear-day' : 'clear-night'
        };
    }
    if (code <= 3) {
        return {
            summary: 'Partly Cloudy',
            meteoconSlug: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night'
        };
    }
    if (code === 45 || code === 48) {
        return {
            summary: 'Fog',
            meteoconSlug: isDay ? 'fog-day' : 'fog-night'
        };
    }
    if (code <= 55) {
        return {
            summary: 'Drizzle',
            meteoconSlug: 'drizzle'
        };
    }
    if (code <= 65) {
        return {
            summary: 'Rain',
            meteoconSlug: 'rain'
        };
    }
    if (code <= 75) {
        return {
            summary: 'Snow',
            meteoconSlug: 'snow'
        };
    }
    if (code <= 82) {
        return {
            summary: 'Showers',
            meteoconSlug: 'extreme-rain'
        };
    }
    if (code <= 86) {
        return {
            summary: 'Snow Showers',
            meteoconSlug: 'extreme-snow'
        };
    }
    if (code >= 95) {
        return {
            summary: 'Thunderstorm',
            meteoconSlug: isDay ? 'thunderstorms-day-rain' : 'thunderstorms-night-rain'
        };
    }

    return { summary: 'Unknown', meteoconSlug: 'not-available' };
};

const weatherByEventId = ref<Record<number, EventWeather>>({});
const loadingWeather = ref(false);
const weatherError = ref<string | null>(null);

export function useEventWeather(events?: Ref<Event[]>) {
    let isProcessing = false;
    const { getOrResolveCoords } = useGeocode();

    const fetchForecast = async (lat: number, lon: number, targetDate: Date) => {
        const { startStr, endStr, start: weekStart, end: weekEnd } = getWeekRange(targetDate);

        const now = new Date();
        const maxForecastDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        if (weekStart > maxForecastDate) {
            return null;
        }

        const cacheKey = `${FORECAST_PREFIX}${lat.toFixed(4)},${lon.toFixed(4)}_${startStr}`;

        // 1. Check persistent cache
        try {
            const cached = await get(cacheKey);
            // Forecasts for the current week or future should be refreshed occasionally
            // Historical forecasts (past weeks) can be cached indefinitely
            const isHistorical = weekStart.getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000;
            if (cached && (isHistorical || Date.now() - cached.timestamp < FORECAST_CACHE_TTL)) {
                return cached.data;
            }
        } catch (e) {
            console.warn('IndexedDB read error:', e);
        }

        // 2. Check in-flight requests
        const inFlightKey = `${lat.toFixed(4)},${lon.toFixed(4)}_${startStr}`;
        if (pendingForecasts.has(inFlightKey)) {
            return pendingForecasts.get(inFlightKey)!;
        }

        // 3. Perform request using SDK
        const forecastPromise = (async () => {
            try {
                const hourlyVariables = [
                    'temperature_2m',
                    'weather_code',
                    'is_day',
                    'apparent_temperature',
                    'wind_speed_10m',
                    'relative_humidity_2m',
                    'precipitation_probability'
                ];

                const ninetyTwoDaysAgo = new Date(now.getTime() - 92 * 24 * 60 * 60 * 1000);

                let url = 'https://api.open-meteo.com/v1/forecast';
                let isArchive = false;

                if (weekStart < ninetyTwoDaysAgo) {
                    url = 'https://archive-api.open-meteo.com/v1/archive';
                    isArchive = true;
                    // Archive doesn't have is_day or precipitation_probability
                    const isDayIndex = hourlyVariables.indexOf('is_day');
                    if (isDayIndex > -1) hourlyVariables.splice(isDayIndex, 1);

                    const probIndex = hourlyVariables.indexOf('precipitation_probability');
                    if (probIndex > -1) hourlyVariables[probIndex] = 'precipitation';
                }

                const params = {
                    latitude: lat,
                    longitude: lon,
                    hourly: hourlyVariables,
                    start_date: startStr,
                    end_date: weekEnd > maxForecastDate ? formatDate(maxForecastDate) : endStr,
                    timezone: 'auto'
                };
                const responses = await fetchWeatherApi(url, params);
                const response = responses[0];

                const utcOffsetSeconds = response.utcOffsetSeconds();
                const hourly = response.hourly()!;

                const range = (start: number, stop: number, step: number) =>
                    Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

                const getVar = (name: string) => {
                    const idx = hourlyVariables.indexOf(name);
                    if (idx === -1) return null;
                    const v = hourly.variables(idx);
                    return v ? Array.from(v.valuesArray()!) : null;
                };

                const data = {
                    timezone: response.timezone(),
                    hourly: {
                        time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map((t) =>
                            new Date((t + utcOffsetSeconds) * 1000).toISOString()
                        ),
                        temperature_2m: getVar('temperature_2m')!,
                        weather_code: getVar('weather_code')!,
                        is_day: getVar('is_day'),
                        apparent_temperature: getVar('apparent_temperature'),
                        wind_speed_10m: getVar('wind_speed_10m'),
                        relative_humidity_2m: getVar('relative_humidity_2m'),
                        precipitation_probability: isArchive
                            ? (getVar('precipitation') || []).map((v) => (v > 0 ? 100 : 0))
                            : getVar('precipitation_probability')
                    }
                };

                await set(cacheKey, { data, timestamp: Date.now() });
                return data;
            } catch (e) {
                console.error('Forecast fetch error (SDK):', e);
                return null;
            } finally {
                pendingForecasts.delete(inFlightKey);
            }
        })();

        pendingForecasts.set(inFlightKey, forecastPromise);
        return forecastPromise;
    };

    const processEventWeather = async (event: Event) => {
        if (!event.location || !event.startTime) return;

        const eventDate = new Date(event.startTime);
        const { start: weekStart } = getWeekRange(eventDate);

        const now = new Date();
        const maxForecastDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        if (weekStart > maxForecastDate) return;

        const signature = `${event.location}|${event.startTime}`;
        if (weatherByEventId.value[event.id] && weatherFetchSignatures.get(event.id) === signature) {
            return;
        }

        const geo = await getOrResolveCoords(event);
        if (!geo) return;

        const forecast = await fetchForecast(geo.lat, geo.lon, eventDate);
        if (!forecast || !forecast.hourly) return;

        const eventTime = new Date(event.startTime).getTime();
        let closestIndex = 0;
        let minDiff = Infinity;

        for (let i = 0; i < forecast.hourly.time.length; i++) {
            const slotTime = new Date(forecast.hourly.time[i]).getTime();
            const diff = Math.abs(slotTime - eventTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }

        const hourlyWindow = [];
        for (let i = 0; i < forecast.hourly.time.length; i++) {
            hourlyWindow.push({
                time: forecast.hourly.time[i],
                temperature: forecast.hourly.temperature_2m[i],
                weatherCode: forecast.hourly.weather_code[i],
                isDay: forecast.hourly.is_day?.[i] === 0 ? false : true, // Default to true if missing
                apparentTemperature: forecast.hourly.apparent_temperature?.[i] ?? forecast.hourly.temperature_2m[i],
                windSpeed: forecast.hourly.wind_speed_10m?.[i] ?? 0,
                humidity: forecast.hourly.relative_humidity_2m?.[i] ?? 0,
                precipitationProbability: forecast.hourly.precipitation_probability?.[i] ?? 0
            });
        }

        weatherByEventId.value[event.id] = {
            eventId: event.id,
            location: event.location,
            latitude: geo.lat,
            longitude: geo.lon,
            timezone: forecast.timezone || 'UTC',
            timestamp: forecast.hourly.time[closestIndex],
            temperature: forecast.hourly.temperature_2m[closestIndex],
            weatherCode: forecast.hourly.weather_code[closestIndex],
            isDay: forecast.hourly.is_day?.[closestIndex] === 0 ? false : true,
            summary: mapWeatherCodeToSummary(
                forecast.hourly.weather_code[closestIndex],
                forecast.hourly.is_day?.[closestIndex] === 0 ? false : true
            ).summary,
            apparentTemperature:
                forecast.hourly.apparent_temperature?.[closestIndex] ?? forecast.hourly.temperature_2m[closestIndex],
            windSpeed: forecast.hourly.wind_speed_10m?.[closestIndex] ?? null,
            humidity: forecast.hourly.relative_humidity_2m?.[closestIndex] ?? null,
            precipitationProbability: forecast.hourly.precipitation_probability?.[closestIndex] ?? null,
            hourly: hourlyWindow
        };

        weatherFetchSignatures.set(event.id, signature);
    };

    const loadWeatherForEvent = async (event: Event) => {
        try {
            await processEventWeather(event);
        } catch (e) {
            console.error('Single event weather error:', e);
        }
    };

    const loadWeatherForEvents = async () => {
        if (!events || events.value.length === 0 || isProcessing) return;

        isProcessing = true;
        loadingWeather.value = true;
        weatherError.value = null;

        try {
            for (const event of events.value) {
                await processEventWeather(event);
            }
        } catch (e) {
            console.error('Global weather error:', e);
            weatherError.value = 'Failed to load weather data';
        } finally {
            loadingWeather.value = false;
            isProcessing = false;
        }
    };

    const getWeatherForEvent = (eventId: number) => {
        return weatherByEventId.value[eventId] || null;
    };

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    watch(
        () => events?.value,
        (newVal) => {
            if (!newVal) return;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadWeatherForEvents();
            }, 500);
        },
        { deep: true }
    );

    return {
        weatherByEventId,
        loadingWeather,
        weatherError,
        loadWeatherForEvents,
        loadWeatherForEvent,
        getWeatherForEvent,
        mapWeatherCodeToSummary
    };
}
