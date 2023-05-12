import fs from "fs/promises";
import path from "path";

export type Data = {
  weather: string;
  season: string;
  time: string;
  area: string;
  avgDuration: number;
  avgDistance: number;
  avgFareAmount: number;
  avgTipAmount: number;
  avgTotalAmount: number;
  numberOfTrips: number;
};

export type WeekData = Data & {
  day: string;
};

export type MonthData = Data & {
  month: string;
};

export type ZonesData = Data & {
  startZone: string;
  endZone: string;
};

async function loadCSV(filename: string): Promise<string[]> {
  const csvData = await fs.readFile(
    path.join(__dirname, "..", "data", filename),
    "utf-8"
  );

  return csvData.split("\n").slice(1); // Don't include the header
}

function parseData(row: string[]): Data {
  const [
    weather,
    season,
    time,
    area,
    avgDistance,
    avgFareAmount,
    avgTipAmount,
    avgTotalAmount,
    avgDuration,
    numberOfTrips,
  ] = row;

  return {
    weather,
    season,
    time,
    area,
    avgDuration: parseFloat(avgDuration),
    avgDistance: parseFloat(avgDistance),
    avgFareAmount: parseFloat(avgFareAmount),
    avgTipAmount: parseFloat(avgTipAmount),
    avgTotalAmount: parseFloat(avgTotalAmount),
    numberOfTrips: parseInt(numberOfTrips),
  };
}

export async function loadWeekData(): Promise<WeekData[]> {
  const csvLines = await loadCSV("by-day.csv");

  const weekData = csvLines.map((row: string) => {
    const [day, ...data] = row.split(",");
    return { day, ...parseData(data) };
  });

  return weekData;
}

export async function loadMonthData(): Promise<MonthData[]> {
  const csvLines = await loadCSV("by-month.csv");
  const monthData = csvLines.map((row: string) => {
    const [month, ...data] = row.split(",");
    return {
      month,
      ...parseData(data),
    };
  });

  return monthData;
}

export async function loadZonesData(): Promise<ZonesData[]> {
  const csvLines = await loadCSV("by-zones.csv");

  const zoneData = csvLines.map((row: string) => {
    const [startZone, endZone, ...data] = row.split(",");
    return {
      startZone,
      endZone,
      ...parseData(data),
    };
  });

  return zoneData;
}

export function dataFilter<T extends Data>(filters: {
  weatherFilter: "any" | "sunny" | "rainy";
  seasonFilter: "any" | "winter" | "summer" | "spring" | "fall";
  dayTimeFilter: "any" | "day" | "night";
  areaFilter: "any" | "manhattan";
}) {
  return (row: T) => {
    if (
      filters.weatherFilter !== "any" &&
      row.weather !== filters.weatherFilter
    )
      return false;
    if (filters.seasonFilter !== "any" && row.season !== filters.seasonFilter)
      return false;
    if (filters.dayTimeFilter !== "any" && row.time !== filters.dayTimeFilter)
      return false;
    if (filters.areaFilter !== "any" && row.area !== filters.areaFilter)
      return false;

    return true;
  };
}

export function groupAverage<T extends Record<string, number>>(
  data: T[],
  getWeight: (item: T) => number,
  groupBy: (item: T) => string
): any {
  data.reduce<{
    [key: string]: {
      weight: number;
      data: T;
    };
  }>((acc, item) => {
    const group = groupBy(item);
    const weight = getWeight(item);
    if (group in acc) {
      for (const [key, value] of Object.entries(item)) {
        // @ts-ignore
        const weightedUpdate = (value * weight) / (weight + acc[group].weight);
        // @ts-ignore
        acc[group].data[key] += weightedUpdate;
      }
    } else {
      acc[group] = {
        data: item,
        weight,
      };
    }
    return acc;
  }, {});
}
