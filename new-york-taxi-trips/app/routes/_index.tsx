import type {
  LinksFunction,
  LoaderArgs,
  LoaderFunction,
  V2_MetaFunction,
} from "@remix-run/node";
import { Content } from "~/components/content";
import { Navigation } from "~/components/navigation";
import globalStyles from "~/styles/global.css";

import mapboxLibreStyles from "maplibre-gl/dist/maplibre-gl.css";
import normalizeStyles from "~/styles/normalize.css";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Layer,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Map, { Marker, Source } from "react-map-gl";
import maplibregl from "maplibre-gl";
import { Toggle } from "~/components/toggle";
import { Form, Params, useLoaderData, useSearchParams } from "@remix-run/react";
import Lottie from "lottie-react";

import DeckGL from "@deck.gl/react/typed";

import fs from "fs";
import path from "path";

import rainAnimation from "~/animations/rain.json";
import { useRef } from "react";

export const meta: V2_MetaFunction = () => {
  return [{ title: "New Remix App" }];
};

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: normalizeStyles,
    },
    {
      rel: "stylesheet",
      href: globalStyles,
    },
    {
      rel: "stylesheet",
      href: mapboxLibreStyles,
    },
  ];
};

type WeekData = {
  avgDuration: number;
  avgDistance: number;
  avgFareAmount: number;
  avgTipAmount: number;
  avgTotalAmount: number;
  numberOfTrips: number;
};

type LoaderData = {
  week: {
    data: {
      day: string;
      value: number;
    }[];
    label: string;
    unit?: string;
  };
  taxiZonesGeoJSON: any;
};
export const loader: LoaderFunction = ({
  context,
  params,
  request,
}: LoaderArgs): LoaderData => {
  const { searchParams } = new URL(request.url);

  const taxiZonesGeoJSON = fs.readFileSync(
    path.join(__dirname, "..", "data", "nyc-taxi-zones.geojson"),
    "utf-8"
  );

  const rawData = fs.readFileSync(
    path.join(__dirname, "..", "data", "by-day.csv"),
    "utf-8"
  );

  const weekData = rawData
    .split("\n")
    .slice(1) // Don't include the header
    .map((row) => {
      const [
        day,
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
      ] = row.split(",");
      return {
        day,
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
    })
    .filter((row) => {
      const weatherFilter = searchParams.get("weather") ?? "any";
      if (weatherFilter !== "any" && row.weather !== weatherFilter)
        return false;

      const timeFilter = searchParams.get("time") ?? "all";
      if (timeFilter !== "any" && row.time !== timeFilter) return false;

      const areaFilter = searchParams.get("area") ?? "any";
      if (areaFilter !== "all" && row.area !== areaFilter) return false;

      const seasonFilter = searchParams.get("season") ?? "any";
      if (seasonFilter !== "any" && row.season !== seasonFilter) return false;

      return true;
    })
    .reduce(
      (acc, { day, numberOfTrips, ...data }) => {
        if (acc[day]) {
          for (const key in acc[day]) {
            if (key == "numberOfTrips") continue;
            // @ts-ignore
            const currentValue = acc[day][key];

            // @ts-ignore
            const newValue = data[key];

            // @ts-ignore
            acc[day][key] =
              (currentValue * acc[day].numberOfTrips +
                newValue * numberOfTrips) /
              (acc[day].numberOfTrips + numberOfTrips);
          }
          acc[day].numberOfTrips += numberOfTrips;
        } else {
          acc[day] = { numberOfTrips, ...data };
        }
        return acc;
      },
      {} as {
        [day: string]: {
          numberOfTrips: number;
          avgDistance: number;
          avgFareAmount: number;
          avgDuration: number;
          avgTipAmount: number;
          avgTotalAmount: number;
        };
      }
    );

  const weekMetric = searchParams.get("week-metric") ?? "avgDistance";

  const weekLabels: {
    // @ts-ignore
    [name: keyof WeekData]: string;
  } = {
    avgDistance: "Average Distance",
    avgDuration: "Average Duration",
    avgFareAmount: "Average Fare Amount",
    avgTipAmount: "Average Tip Amount",
    avgTotalAmount: "Average Total Amount",
    numberOfTrips: "Number of Trips",
  };

  const weekUnits: {
    // @ts-ignore
    [name: keyof WeekData]: string;
  } = {
    avgDistance: "mi",
    avgDuration: "min",
    avgFareAmount: "$",
    avgTipAmount: "$",
    avgTotalAmount: "$",
    numberOfTrips: "",
  };

  return {
    week: {
      data: Object.entries(weekData).map(([day, data]) => ({
        day,
        // @ts-ignore
        value: data[weekMetric],
      })),
      // @ts-ignore
      label: weekLabels[weekMetric],
      // @ts-ignore
      unit: weekUnits[weekMetric],
    },
    taxiZonesGeoJSON: JSON.parse(taxiZonesGeoJSON),
  };
};

export default function Index() {
  const { week, taxiZonesGeoJSON } = useLoaderData<LoaderData>();
  const form = useRef<HTMLFormElement>(null);

  const [searchParams] = useSearchParams();
  const isNight = searchParams.get("time") == "night";
  const isRainy = searchParams.get("weather") == "rainy";

  return (
    <div className={isNight ? "night" : ""}>
      <Navigation>
        <Form
          method="GET"
          ref={form}
          onChange={() => {
            if (form.current) {
              form.current.submit();
            }
          }}
        >
          <input
            type="hidden"
            name="week-metric"
            value={searchParams.get("week-metric") ?? "avgDistance"}
          />
          <Content>
            <Toggle
              name="weather"
              label="Weather"
              selected={searchParams.get("weather")}
              options={[
                {
                  key: "any",
                  label: "Any 🌤️",
                },
                {
                  key: "rainy",
                  label: "Rainy ☔️",
                },
                {
                  key: "sunny",
                  label: "Sunny ☀️",
                },
              ]}
            />
            <Toggle
              name="time"
              label="Time of day"
              selected={searchParams.get("time")}
              options={[
                {
                  key: "any",
                  label: "Any ☀️/🌙",
                },
                {
                  key: "day",
                  label: "Day ☀️",
                },
                {
                  key: "night",
                  label: "Night 🌙",
                },
              ]}
            />
            <Toggle
              name="season"
              label="Season"
              selected={searchParams.get("season")}
              options={[
                {
                  key: "any",
                  label: "Any 🌳",
                },
                {
                  key: "spring",
                  label: "Spring 🌱",
                },
                {
                  key: "summer",
                  label: "Summer 😎",
                },
                {
                  key: "fall",
                  label: "Fall 🍂",
                },
                {
                  key: "winter",
                  label: "Winter ❄️",
                },
              ]}
            />
            <Toggle
              name="area"
              label="New York Area"
              selected={searchParams.get("area")}
              options={[
                {
                  key: "all",
                  label: "All 🗽",
                },
                {
                  key: "manhattan",
                  label: "Manhattan 🏙️",
                },
              ]}
            />
          </Content>
        </Form>
      </Navigation>
      <main>
        <Content>
          <h1>New York Taxi Trips 🚖</h1>
          <p>
            A deep dive into the taxi habits of the New Yorker. Explore the data
            and find out interesting facts about the city that never sleeps. Use
            the toggles above to filter the data by weather, season, location
            and more.
          </p>
          <h2>Explore the patterns</h2>
          <p>Hej med dig! Det virker!</p>
          <div
            style={{
              position: "relative",
              paddingBottom: `${(9 / 16) * 100}%` /* 16:9 */,
            }}
          >
            <DeckGL
              initialViewState={{
                longitude: -122.4,
                latitude: 37.8,
                zoom: 14,
              }}
              controller={true}
            >
              <Map
                mapLib={maplibregl}
                mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              >
                <Marker longitude={-122.4} latitude={37.8} color="red" />
                <Source id="taxi-zones" type="geojson" data={taxiZonesGeoJSON}>
                  <Layer id="taxi-zones" type="layer" fill="blue" />
                </Source>
              </Map>
            </DeckGL>
          </div>

          <BarChart width={730} height={250} data={week.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="value"
              name={week.label}
              unit={week.unit}
              fill="#8884d8"
            />
          </BarChart>

          {/* <AreaChart
            width={720}
            height={250}
            data={data2}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="uv"
              stroke="#8884d8"
              fillOpacity={1}
              fill="url(#colorUv)"
            />
            <Area
              type="monotone"
              dataKey="pv"
              stroke="#82ca9d"
              fillOpacity={1}
              fill="url(#colorPv)"
            />
          </AreaChart> */}
        </Content>
      </main>
      {isRainy && (
        <Lottie className="rain-animation" animationData={rainAnimation} />
      )}
    </div>
  );
}
