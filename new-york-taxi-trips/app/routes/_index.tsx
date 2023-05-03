import type {
  LinksFunction,
  LoaderArgs,
  LoaderFunction,
  V2_MetaFunction,
} from "@remix-run/node";
import { Content } from "~/components/content";
import { Navigation } from "~/components/navigation";
import globalStyles from "~/styles/global.css";
import normalizeStyles from "~/styles/normalize.css";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Toggle } from "~/components/toggle";
import { Form, Params, useLoaderData, useSearchParams } from "@remix-run/react";
import Lottie from "lottie-react";

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
  ];
};

const data = [
  {
    name: "Monday",
    pickups: 12338,
  },
  {
    name: "Tuesday",
    pickups: 53901,
  },
  {
    name: "Wednesday",
    pickups: 42941,
  },
  {
    name: "Thursday",
    pickups: 23141,
  },
  {
    name: "Friday",
    pickups: 91283,
  },
  {
    name: "Saturday",
    pickups: 9043,
  },
  {
    name: "Sunday",
    pickups: 3051,
  },
];

const data2 = [
  {
    name: "Page A",
    uv: 4000,
    pv: 2400,
    amt: 2400,
  },
  {
    name: "Page B",
    uv: 3000,
    pv: 1398,
    amt: 2210,
  },
  {
    name: "Page C",
    uv: 2000,
    pv: 9800,
    amt: 2290,
  },
  {
    name: "Page D",
    uv: 2780,
    pv: 3908,
    amt: 2000,
  },
  {
    name: "Page E",
    uv: 1890,
    pv: 4800,
    amt: 2181,
  },
  {
    name: "Page F",
    uv: 2390,
    pv: 3800,
    amt: 2500,
  },
  {
    name: "Page G",
    uv: 3490,
    pv: 4300,
    amt: 2100,
  },
];

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
  const rawData = fs.readFileSync(
    path.join(__dirname, "..", "app", "data", "avg-duration_by-day.csv"),
    "utf-8"
  );

  const { searchParams } = new URL(request.url);

  const weekData = rawData
    .split("\n")
    .slice(1)
    .map((row) => {
      const [day, weather, season, time, area, avgDuration] = row.split(",");
      return { day, weather, season, time, area, avgDuration };
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
    .map((row) => {
      return {
        day: row.day,
        value: parseFloat(row.avgDuration),
      };
    })
    .reduce((acc, row) => {
      const day = row.day;
      const value = row.value;
      if (acc[day]) {
        acc[day] = (acc[day] + value) / 2;
      } else {
        acc[day] = value;
      }
      return acc;
    }, {} as { [key: string]: number });

  return {
    week: {
      data: Object.entries(weekData).map(([day, value]) => ({ day, value })),
      label: "Average Duration",
      unit: " minutes",
    },
  };
};

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
                  label: "Any 🌙/☀️",
                },
                {
                  key: "day",
                  label: "Day 🌙",
                },
                {
                  key: "night",
                  label: "Night ☀️",
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
                  key: "autumn",
                  label: "Autumn 🍂",
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

          <AreaChart
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
          </AreaChart>
        </Content>
      </main>
      {isRainy && (
        <Lottie className="rain-animation" animationData={rainAnimation} />
      )}
    </div>
  );
}
