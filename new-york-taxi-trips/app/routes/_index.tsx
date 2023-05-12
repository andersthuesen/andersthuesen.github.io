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

import { dataFilter, loadMonthData, loadWeekData, loadZonesData } from "~/data";
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
  zonesData: ZonesData[];
};
export const loader: LoaderFunction = async (): Promise<LoaderData> => {
  const [weekData, monthData, zonesData] = await Promise.all([
    loadWeekData(),
    loadMonthData(),
    loadZonesData(),
  ]);

  return {
    weekData,
    monthData,
    zonesData,
  };
};

export default function Index() {
  const { weekData, zonesData } = useLoaderData<LoaderData>();

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

  const { filteredZonesList, filteredZonesMap } = useMemo(() => {
    const filteredZonesMap = zonesData
      .filter((row) => {
        // Skip any unknown start and destination zones.
        if (
          row.startZone == "265" ||
          row.startZone == "264" ||
          row.endZone == "265" ||
          row.endZone == "264"
        ) {
          return false;
        }
        return true;
      })
      .filter((row) => {
        if (weatherFilter !== "any" && row.weather !== weatherFilter)
          return false;
        if (seasonFilter !== "any" && row.season !== seasonFilter) return false;
        if (dayTimeFilter !== "any" && row.time !== dayTimeFilter) return false;
        return true;
      })
      .reduce(
        (acc, { startZone, endZone, numberOfTrips, ...data }) => {
          if (startZone in acc) {
            if (endZone in acc[startZone].to) {
              for (const key in acc[startZone].to[endZone]) {
                if (key == "numberOfTrips") continue;
                // @ts-ignore
                const currentValue = acc[startZone].to[endZone][key];

                // @ts-ignore
                const newValue = data[key];

                // @ts-ignore
                acc[startZone].to[endZone][key] =
                  (currentValue * acc[startZone].to[endZone].numberOfTrips +
                    newValue * numberOfTrips) /
                  (acc[startZone].to[endZone].numberOfTrips + numberOfTrips);
              }
              acc[startZone].numberOfTrips += numberOfTrips;
              acc[startZone].to[endZone].numberOfTrips += numberOfTrips;
            } else {
              acc[startZone].numberOfTrips += numberOfTrips;
              acc[startZone].to[endZone] = { numberOfTrips, ...data };
            }
          } else {
            acc[startZone] = {
              numberOfTrips,
              ...data,
              to: { [endZone]: { numberOfTrips, ...data } },
            };
          }
          return acc;
        },
        {} as {
          [startZone: string]: {
            numberOfTrips: number;
            avgDistance: number;
            avgFareAmount: number;
            avgDuration: number;
            avgTipAmount: number;
            avgTotalAmount: number;

            to: {
              [endZone: string]: {
                numberOfTrips: number;
                avgDistance: number;
                avgFareAmount: number;
                avgDuration: number;
                avgTipAmount: number;
                avgTotalAmount: number;
              };
            };
          };
        }
      );

    const filteredZonesList = Object.entries(filteredZonesMap).flatMap(
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

    return { filteredZonesList, filteredZonesMap };
  }, [zonesData, dayTimeFilter, seasonFilter, weatherFilter]);

  const { min, max } = useMemo(() => {
    const values = filteredZonesList.map((row) => {
      switch (feature) {
        case "count":
          return row.fromData.numberOfTrips;
        case "distance":
          return row.fromData.avgDistance;
        case "duration":
          return row.fromData.avgDuration;
      }
    });

    const min = Math.min(...values);
    const max = Math.max(...values);

    return { min, max };
  }, [filteredZonesList, feature]);

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
                pitch: 45,
                zoom: 9,
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
                if (!info?.object) return;

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

                  const value =
                    feature == "count"
                      ? zone.numberOfTrips
                      : feature == "distance"
                      ? zone.avgDistance
                      : zone.avgDuration;

                  const normalized = (value - min) / (max - min);

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
                  console.log(zone);
                  const value =
                    feature == "count"
                      ? zone.data.numberOfTrips
                      : feature == "distance"
                      ? zone.data.avgDistance
                      : zone.data.avgDuration;

                  const normalized = (value - min) / (max - min);
                  const radius = Math.sqrt(normalized * 1e7) + 50;
                  return radius;
                }}
                getFillColor={[0, 200, 200]}
              />
            </DeckGL>
          </div>

          <BarChart width={730} height={250} data={filteredWeekData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis
              domain={
                feature === "distance"
                  ? [0, 5]
                  : feature == "duration"
                  ? [0, 1200]
                  : [0, 6e6]
              }
            />
            <Tooltip />
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
                  ? " seconds"
                  : ""
              }
              fill="#8884d8"
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
