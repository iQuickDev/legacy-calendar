export interface HourlyDataPoint {
    time: string;
    temperature: number;
    weatherCode: number;
    isDay: boolean;
    apparentTemperature: number;
    windSpeed: number;
    humidity: number;
    precipitationProbability: number;
}

export interface EventWeather {
    eventId: number;
    location: string;
    latitude: number;
    longitude: number;
    timezone: string;
    timestamp: string;
    temperature: number | null;
    weatherCode: number | null;
    isDay: boolean;
    summary: string;
    apparentTemperature?: number | null;
    windSpeed?: number | null;
    humidity?: number | null;
    precipitationProbability?: number | null;
    hourly?: HourlyDataPoint[];
}
