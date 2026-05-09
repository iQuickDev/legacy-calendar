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

export const mapWeatherCodeToSummary = (code: number | null): { summary: string; icon: string; emoji: string } => {
    if (code === null) return { summary: 'Unknown', icon: 'pi pi-question', emoji: '❓' };
    if (code === 0) return { summary: 'Clear', icon: 'pi pi-sun', emoji: '☀️' };
    if (code <= 3) return { summary: 'Partly Cloudy', icon: 'pi pi-cloud', emoji: '🌤️' };
    if (code === 45 || code === 48) return { summary: 'Fog', icon: 'pi pi-cloud', emoji: '🌫️' };
    if (code <= 55) return { summary: 'Drizzle', icon: 'pi pi-cloud-download', emoji: '🌦️' };
    if (code <= 65) return { summary: 'Rain', icon: 'pi pi-cloud-download', emoji: '🌧️' };
    if (code <= 75) return { summary: 'Snow', icon: 'pi pi-cloud-download', emoji: '❄️' };
    if (code <= 82) return { summary: 'Showers', icon: 'pi pi-cloud-download', emoji: '🌦️' };
    if (code <= 86) return { summary: 'Snow Showers', icon: 'pi pi-cloud-download', emoji: '🌨️' };
    if (code >= 95) return { summary: 'Thunderstorm', icon: 'pi pi-bolt', emoji: '⛈️' };
    return { summary: 'Unknown', icon: 'pi pi-question', emoji: '❓' };
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
                    // Archive doesn't have precipitation_probability, use precipitation (sum) instead
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

                const data = {
                    timezone: response.timezone(),
                    hourly: {
                        time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map((t) =>
                            new Date((t + utcOffsetSeconds) * 1000).toISOString()
                        ),
                        temperature_2m: Array.from(hourly.variables(0)!.valuesArray()!),
                        weather_code: Array.from(hourly.variables(1)!.valuesArray()!),
                        apparent_temperature: Array.from(hourly.variables(2)!.valuesArray()!),
                        wind_speed_10m: Array.from(hourly.variables(3)!.valuesArray()!),
                        relative_humidity_2m: Array.from(hourly.variables(4)!.valuesArray()!),
                        // Map archive precipitation to probability (0 or 100 for simplicity or just 0)
                        precipitation_probability: isArchive
                            ? Array.from(hourly.variables(5)!.valuesArray()!).map((v) => (v > 0 ? 100 : 0))
                            : Array.from(hourly.variables(5)!.valuesArray()!)
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

        const { summary, icon } = mapWeatherCodeToSummary(forecast.hourly.weather_code[closestIndex]);

        const hourlyWindow = [];
        for (let i = 0; i < forecast.hourly.time.length; i++) {
            hourlyWindow.push({
                time: forecast.hourly.time[i],
                temperature: forecast.hourly.temperature_2m[i],
                weatherCode: forecast.hourly.weather_code[i],
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
            summary: `${summary} ${icon === 'pi pi-sun' ? '☀️' : icon === 'pi pi-cloud' ? '☁️' : ''}`.trim(),
            apparentTemperature: forecast.hourly.apparent_temperature?.[closestIndex] ?? null,
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
