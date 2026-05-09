import { ref } from 'vue';
import { get, set } from 'idb-keyval';
import type { Event } from '../types/Event';

// Persistent Cache Keys (Prefixes)
const GEO_PREFIX = 'weather_geo_';
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day

// In-memory tracking for in-flight requests
const pendingGeocodes = new Map<string, Promise<{ lat: number; lon: number; timezone: string } | null>>();

// Throttle for Nominatim (max 1 req/sec)
let nextAvailableGeocodeTime = 0;
const GEOCONTROL_DELAY = 1200;

// Module-level state to share coordinates across components without prop drilling
const coordsByEventId = ref<Record<number, { lat: number; lon: number } | null>>({});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const performGeocode = async (q: string): Promise<{ lat: number; lon: number; timezone: string } | null> => {
    // Enforce sequential execution with delay
    const now = Date.now();
    const startTime = Math.max(now, nextAvailableGeocodeTime);
    nextAvailableGeocodeTime = startTime + GEOCONTROL_DELAY;

    const waitTime = startTime - now;
    if (waitTime > 0) {
        await delay(waitTime);
    }

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1`,
        {
            headers: {
                'User-Agent': 'legacy-calendar-client/1.0 (contact@iquick.dev)'
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Geocoding failed for "${q}": HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
        return null;
    }

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        timezone: 'auto'
    };
};

export const geocodeLocation = async (
    location: string
): Promise<{ lat: number; lon: number; timezone: string } | null> => {
    // 0. Check if location is already coordinates (e.g., "(48.1, 11.2)" or "48.1, 11.2")
    const coordRegex = /^\(?\[?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?\]?$/;
    const match = location.trim().match(coordRegex);
    if (match) {
        return {
            lat: parseFloat(match[1]),
            lon: parseFloat(match[2]),
            timezone: 'auto'
        };
    }

    const cacheKey = GEO_PREFIX + location;

    // 1. Check persistent cache with TTL
    try {
        const cached = await get(cacheKey);
        if (cached !== undefined && cached !== null) {
            // Check if it has a timestamp (new format)
            if (cached.timestamp && cached.data !== undefined) {
                const isExpired = Date.now() - cached.timestamp > GEO_CACHE_TTL;
                if (!isExpired) return cached.data;
            } else {
                // Old format (just the result) - migration: treat as valid but wrap it next time
                return cached;
            }
        }
    } catch (e) {
        console.warn('IndexedDB read error:', e);
    }

    // 2. Check in-flight requests
    if (pendingGeocodes.has(location)) {
        return pendingGeocodes.get(location)!;
    }

    // 3. Perform request
    const geocodePromise = (async () => {
        try {
            let result;
            try {
                result = await performGeocode(location);

                // Retry with simplified name if it contains a separator
                if (!result && (location.includes(' - ') || location.includes(' @ '))) {
                    const separator = location.includes(' - ') ? ' - ' : ' @ ';
                    const simplified = location.split(separator)[0];
                    result = await performGeocode(simplified);
                }

                // Always cache with timestamp (even if it's null/not found)
                await set(cacheKey, { data: result, timestamp: Date.now() });
                return result;
            } catch (e) {
                console.error('Geocoding transient error:', e);
                return null; // Don't cache on network/server errors
            }
        } finally {
            pendingGeocodes.delete(location);
        }
    })();

    pendingGeocodes.set(location, geocodePromise);
    return geocodePromise;
};

export function useGeocode() {
    const getOrResolveCoords = async (event: Event) => {
        if (!event.location) return null;

        // Check module-level cache first
        if (coordsByEventId.value[event.id]) {
            return coordsByEventId.value[event.id];
        }

        const geo = await geocodeLocation(event.location);
        if (geo) {
            coordsByEventId.value[event.id] = { lat: geo.lat, lon: geo.lon };
        }
        return geo;
    };

    const getCoordsForEvent = (eventId: number) => {
        return coordsByEventId.value[eventId] || null;
    };

    return {
        getOrResolveCoords,
        getCoordsForEvent,
        coordsByEventId
    };
}
