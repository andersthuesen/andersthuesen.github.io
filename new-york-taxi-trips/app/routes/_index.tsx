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
import { GeoJsonLayer, ArcLayer } from "@deck.gl/layers/typed";
import { Position } from "@deck.gl/core/typed";

import fs from "fs";
import path from "path";

import rainAnimation from "~/animations/rain.json";
import { useMemo, useRef } from "react";

import taxiZonesGeoJSON from "../../data/nyc-taxi-zones.json";

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
};
export const loader: LoaderFunction = ({
  context,
  params,
  request,
}: LoaderArgs): LoaderData => {
  const { searchParams } = new URL(request.url);

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
  };
};

// const layers = [
//   new ,
// ];

export default function Index() {
  const { week } = useLoaderData<LoaderData>();
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
                longitude: -73.935242,
                latitude: 40.73061,
                zoom: 9,
              }}
              controller={true}
            >
              <Map
                mapLib={maplibregl}
                mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              />
              {/* @ts-ignore */}
              <GeoJsonLayer
                id="geojson-layer"
                data={taxiZonesGeoJSON as any}
                stroked
                filled
                opacity={0.5}
                getLineColor={[60, 60, 60]}
                getFillColor={(data: any) => {
                  const shapeArea = parseFloat(data.properties.shape_area);

                  return [255, 0, 0, (shapeArea / 1e-3) * 255];
                }}
              />
              {/* @ts-ignore */}
              <ArcLayer
                id="arc-layer"
                data={[
                  {
                    inbound: 72633,
                    outbound: 74735,
                    from: {
                      name: "19th St. Oakland (19TH)",
                      coordinates: [-73.935242, 40.73061],
                    },
                    to: {
                      name: "12th St. Oakland City Center (12TH)",
                      coordinates: [-73.945242, 40.71061],
                    },
                  },
                ]}
                getSourcePosition={(d) => d.from.coordinates as Position}
                getTargetPosition={(d) => d.to.coordinates as Position}
                getSourceColor={[0, 128, 255]}
                getWidth={2}
              />
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
