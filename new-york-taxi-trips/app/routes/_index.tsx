import type {
  LinksFunction,
  LoaderFunction,
  V2_MetaFunction,
} from "@remix-run/node";
import { Content } from "~/components/content";
import { Navigation } from "~/components/navigation";
import globalStyles from "~/styles/global.css";

import mapboxLibreStyles from "maplibre-gl/dist/maplibre-gl.css";
import normalizeStyles from "~/styles/normalize.css";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Map from "react-map-gl";
import maplibregl from "maplibre-gl";
import { Toggle } from "~/components/toggle";
import { useLoaderData } from "@remix-run/react";
import Lottie from "lottie-react";

import DeckGL from "@deck.gl/react/typed";
import {
  GeoJsonLayer,
  ArcLayer,
  ScatterplotLayer,
} from "@deck.gl/layers/typed";
import type { PickingInfo, Position } from "@deck.gl/core/typed";

import { loadMonthData, loadWeekData, loadZonesData } from "~/data";

// import weekData from "../../data/by-day.json";
// import monthData from "../../data/by-month.json";
// import zonesData from "../../data/by-zones.json";

import type { WeekData, ZonesData, MonthData } from "~/data";

import rainAnimation from "~/animations/rain.json";
import { useMemo, useState } from "react";

import taxiZonesGeoJSON from "../../data/nyc-taxi-zones.json";

const taxiZonesGeoJSONMap: { [zone: string]: any } = {};
for (const feature of taxiZonesGeoJSON.features) {
  taxiZonesGeoJSONMap[feature.properties.objectid] = feature;
}

export const meta: V2_MetaFunction = () => {
  return [{ title: "New York Taxi Trips" }];
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

type LoaderData = {
  weekData: WeekData[];
  monthData: MonthData[];
  zonesData: {
    [zone: string]: {
      numberOfTrips: number;
      to: {
        [zone: string]: {
          numberOfTrips: number;
        };
      };
    };
  };
};
export const loader: LoaderFunction = async (): Promise<LoaderData> => {
  return {
    weekData: (await import("../../data/by-day.json")).default,
    monthData: (await import("../../data/by-month.json")).default,
    zonesData: (await import("../../data/by-zones.json")).default,
  };
};

export default function Index() {
  const {
    weekData,
    monthData,
    zonesData: filteredZonesMap,
  } = useLoaderData<LoaderData>();

  const [selectedObject, setSelectedObject] = useState<PickingInfo | undefined>(
    undefined
  );

  const [dayTimeFilter, setDayTimeFilter] = useState<"any" | "day" | "night">(
    "any"
  );

  const [seasonFilter, setSeasonFilter] = useState<
    "any" | "spring" | "summer" | "fall" | "winter"
  >("any");

  const [weatherFilter, setWeatherFilter] = useState<"any" | "sunny" | "rainy">(
    "any"
  );

  const [areaFilter, setAreaFilter] = useState<"any" | "manhattan">("any");

  const [feature, setFeature] = useState<"distance" | "duration" | "count">(
    "count"
  );

  const isNight = dayTimeFilter === "night";
  const isRainy = weatherFilter === "rainy";

  const filteredWeekData = useMemo(() => {
    const filtered = weekData
      .filter((row) => {
        if (weatherFilter !== "any" && row.weather !== weatherFilter)
          return false;
        if (seasonFilter !== "any" && row.season !== seasonFilter) return false;
        if (dayTimeFilter !== "any" && row.time !== dayTimeFilter) return false;
        if (areaFilter !== "any" && row.area !== areaFilter) return false;
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

              if (acc[day].numberOfTrips + numberOfTrips == 0) continue;

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

    return Object.entries(filtered).map(([day, data]) => ({
      day,
      ...data,
    }));
  }, [weekData, areaFilter, dayTimeFilter, seasonFilter, weatherFilter]);

  const filteredMonthData = useMemo(() => {
    const filtered = monthData
      .filter((row) => {
        if (weatherFilter !== "any" && row.weather !== weatherFilter)
          return false;
        if (seasonFilter !== "any" && row.season !== seasonFilter) return false;
        if (dayTimeFilter !== "any" && row.time !== dayTimeFilter) return false;
        if (areaFilter !== "any" && row.area !== areaFilter) return false;
        return true;
      })
      .reduce(
        (acc, { month, numberOfTrips, ...data }) => {
          if (acc[month]) {
            for (const key in acc[month]) {
              if (key == "numberOfTrips") continue;
              // @ts-ignore
              const currentValue = acc[month][key];

              // @ts-ignore
              const newValue = data[key];

              if (acc[month].numberOfTrips + numberOfTrips == 0) continue;

              // @ts-ignore
              acc[month][key] =
                (currentValue * acc[month].numberOfTrips +
                  newValue * numberOfTrips) /
                (acc[month].numberOfTrips + numberOfTrips);
            }
            acc[month].numberOfTrips += numberOfTrips;
          } else {
            acc[month] = { numberOfTrips, ...data };
          }
          return acc;
        },
        {} as {
          [month: string]: {
            numberOfTrips: number;
            avgDistance: number;
            avgFareAmount: number;
            avgDuration: number;
            avgTipAmount: number;
            avgTotalAmount: number;
          };
        }
      );

    return Object.entries(filtered).map(([month, data]) => ({
      month,
      ...data,
    }));
  }, [monthData, areaFilter, dayTimeFilter, seasonFilter, weatherFilter]);

  const filteredZonesList = useMemo(() => {
    return Object.entries(filteredZonesMap).flatMap(
      ([startZone, { to, ...fromData }]) => {
        return Object.entries(to).map(([endZone, data]) => {
          // These lookups should probably be a map for O(1) lookup.
          const startZoneFeature: any = taxiZonesGeoJSONMap[startZone];
          const endZoneFeature: any = taxiZonesGeoJSONMap[endZone];

          return {
            data,
            fromData,
            from: {
              zoneID: startZone,
              zoneName: startZoneFeature?.properties.zone,
              coordinates: startZoneFeature?.properties.center,
            },

            to: {
              zoneID: endZone,
              zoneName: endZoneFeature?.properties.zone,
              coordinates: endZoneFeature?.properties.center,
            },
          };
        });
      }
    );
  }, [filteredZonesMap]);

  const { min, max } = useMemo(() => {
    const values = filteredZonesList.map((row) => row.fromData.numberOfTrips);

    const min = Math.min(...values);
    const max = Math.max(...values);

    return { min, max };
  }, [filteredZonesList]);

  return (
    <div className={`content ${isNight ? "night" : ""}`}>
      <Navigation>
        <input type="hidden" name="week-metric" />
        <Content>
          <Toggle
            name="weather"
            label="Weather"
            value={weatherFilter}
            onValueChange={setWeatherFilter}
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
            onValueChange={setDayTimeFilter}
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
            value={seasonFilter}
            onValueChange={setSeasonFilter}
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
            label="Area"
            value={areaFilter}
            onValueChange={setAreaFilter}
            options={[
              {
                key: "any",
                label: "Any 🗽",
              },
              {
                key: "manhattan",
                label: "Manhattan 🏙️",
              },
            ]}
          />

          <Toggle
            name="feature"
            label="Feature"
            value={feature}
            onValueChange={setFeature}
            options={[
              {
                key: "distance",
                label: "↔️ Average distance",
              },
              {
                key: "duration",
                label: "⏳ Average duration",
              },
              {
                key: "count",
                label: "🚕 Number of trips",
              },
            ]}
          />
        </Content>
      </Navigation>
      <main>
        <Content>
          <h1>New York Taxi Trips 🚖</h1>
          <p>
            <i>New York, New York!</i> - Frank Sinatra
            <br />
            <br />
            In the city that never sleeps yellow taxis are a standard part of
            the cityscape and an important part of the infrastructure. The taxis
            bring the diligent businessman to work early Monday morning and
            bring the last bar guest safely home after a long night of fun while
            the sun is rising in the horizon. So whether you are an Englishman
            or an alien in New York this webpage can help you learn about the
            habits of the New Yorkers' use of taxis.
            <br />
            <br />
            The data is obtained from{" "}
            <a href="https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page">
              TLC New York
            </a>{" "}
            in the year 2022 and contains data from almost 40 mil taxi trips.
            Yes- that is a lot, but don't worry we will make it easy for you.
            Furthermore, we also consider{" "}
            <a href="https://data.cityofnewyork.us/Transportation/NYC-Taxi-Zones/d3c5-ddgc">
              weather data
            </a>{" "}
            and{" "}
            <a href="https://open-meteo.com/en/docs/historical-weather-api#latitude=40.71&longitude=-74.01&start_date=2023-04-14&end_date=2023-04-28&hourly=temperature_2m">
              geodata
            </a>
            .
            <br />
            <br />
            This webpage is made interactively such that you can explore and
            analyze across a wide range of features, specifications, and types
            of plots. The sky is the limit.
            <br />
            <br />
            Happy exploring!
            <br />
            <i>- Linea, Anne & Anders</i>
          </p>
          <h2>An (over)view from the top 🏙️</h2>
          <p>
            Now let's look at some visuals. The first plot is a map plot of New
            York. Try to hover your mouse over the different taxi zones of the
            city to reveal more information!
          </p>
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
                pitch: 45,
                zoom: 10,
              }}
              controller={true}
              onClick={(info) => {
                if (!info?.object?.properties) {
                  return setSelectedObject(undefined);
                }
                // Only set selected object if it's a zone
                setSelectedObject(info);
              }}
              getTooltip={(info) => {
                if (!info?.object) return null;

                if (info.object.properties) {
                  const zone =
                    filteredZonesMap[info.object.properties.objectid];
                  return `${zone.numberOfTrips.toLocaleString()} trips from ${
                    info.object.properties.zone
                  }`;
                }

                if (info.object.data && info.object.to) {
                  return `${info.object.data.numberOfTrips.toLocaleString()} trips from ${
                    info.object.from.zoneName
                  } to ${info.object.to.zoneName}`;
                }

                return null;
              }}
            >
              <Map
                mapLib={maplibregl}
                mapStyle={
                  isNight
                    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                }
              />
              {/* @ts-ignore */}
              <GeoJsonLayer
                id="geojson-layer"
                data={taxiZonesGeoJSON as any}
                pickable
                stroked
                filled
                autoHighlight
                highlightedObjectIndex={selectedObject?.index}
                highlightColor={[128, 128, 255, 128]}
                getFillColor={(feat) => {
                  if (!feat.properties) return [0, 0, 0, 0];
                  const zone = filteredZonesMap[feat.properties.objectid];
                  if (!zone) return [0, 0, 0, 0];

                  const normalized = (zone.numberOfTrips - min) / (max - min);

                  return [0, 128, 255, normalized * 220 + 25];
                }}
                getLineColor={[0, 128, 255]}
                getLineWidth={10}
              />
              {/* @ts-ignore */}
              <ArcLayer
                id="arc-layer"
                data={
                  selectedObject
                    ? filteredZonesList.filter(
                        (d) =>
                          d.from.zoneID ==
                          selectedObject?.object.properties.objectid
                      )
                    : []
                }
                pickable
                getSourcePosition={(d) => d.from.coordinates as Position}
                getTargetPosition={(d) => d.to.coordinates as Position}
                getSourceColor={[128, 128, 255]}
                getTargetColor={[0, 200, 200]}
                getWidth={1}
              />
              {/* @ts-ignore */}
              <ScatterplotLayer
                data={
                  selectedObject
                    ? filteredZonesList.filter(
                        (d) =>
                          d.from.zoneID ==
                            selectedObject?.object.properties.objectid &&
                          d.to.zoneID !==
                            selectedObject?.object.properties.objectid
                      )
                    : []
                }
                pickable
                filled
                opacity={0.5}
                getPosition={(d) => d.to.coordinates as Position}
                getRadius={(zone) => {
                  const normalized =
                    (zone.data.numberOfTrips - min) / (max - min);
                  const radius = Math.sqrt(normalized * 1e7) + 50;
                  return radius;
                }}
                getFillColor={[0, 200, 200]}
              />
            </DeckGL>
          </div>
          <p>
            Did you notice that besides inner Manhattan some areas in the
            suburbs are also popular for taxi trips? Imagine you just arrived at
            the JFK airport and want to go to your hotel in Manhattan - oh yeah
            right! You would probably take a taxi 😉
          </p>
          <p>
            But now... are you ready for something really cool? Try to click one
            of the zones and check out facts about trips between different
            zones. Wow, Manhattan seems to be a pretty popular destination! Can
            you find any other interesting destinations?
          </p>

          <p>
            Even though it does not look as cool, bar plots are very informative
            for investigating the temporal patterns in the data. In the bar plot
            below we can uncover many different patterns regarding the habits of
            the New Yorkers. Try to discover patterns in the data by using the
            filters in the menubar in the top of the page. When do the New
            Yorkers take the longest taxi trips? Are is it really the New
            Yorkers who take the taxis or might it be tourists?
          </p>

          <BarChart
            width={730}
            height={250}
            data={filteredWeekData}
            style={{ color: "black", margin: "0 auto" }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis
              width={80}
              tickFormatter={(v) => v.toLocaleString()}
              domain={
                feature === "distance"
                  ? [0, 5]
                  : feature == "duration"
                  ? [0, 1200]
                  : [0, 6e6]
              }
            />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Legend />
            <Bar
              dataKey={
                feature === "distance"
                  ? "avgDistance"
                  : feature == "duration"
                  ? "avgDuration"
                  : "numberOfTrips"
              }
              name={
                feature === "distance"
                  ? "Average distance"
                  : feature == "duration"
                  ? "Average duration"
                  : "Number of trips"
              }
              unit={
                feature === "distance"
                  ? " miles"
                  : feature == "duration"
                  ? " minutes"
                  : ""
              }
              fill="#8884d8"
            />
          </BarChart>

          <BarChart
            width={730}
            height={250}
            data={filteredMonthData}
            style={{ color: "black", margin: "0 auto" }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              textAnchor="start"
              angle={90}
              width={20}
              height={80}
              hide={false}
              minTickGap={-Infinity}
            />
            <YAxis
              width={80}
              tickFormatter={(v) => v.toLocaleString()}
              domain={
                feature === "distance"
                  ? [0, 5]
                  : feature == "duration"
                  ? [0, 1200]
                  : [0, 6e6]
              }
            />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Legend />
            <Bar
              dataKey={
                feature === "distance"
                  ? "avgDistance"
                  : feature == "duration"
                  ? "avgDuration"
                  : "numberOfTrips"
              }
              name={
                feature === "distance"
                  ? "Average distance"
                  : feature == "duration"
                  ? "Average duration"
                  : "Number of trips"
              }
              unit={
                feature === "distance"
                  ? " miles"
                  : feature == "duration"
                  ? " minutes"
                  : ""
              }
              fill="#443afa"
            />
          </BarChart>
        </Content>
      </main>
      {isRainy && (
        <Lottie
          style={{
            zIndex: 1000,
          }}
          className="rain-animation"
          animationData={rainAnimation}
        />
      )}
    </div>
  );
}
