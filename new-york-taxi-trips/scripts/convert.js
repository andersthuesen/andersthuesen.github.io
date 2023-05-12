const fs = require("fs");
const path = require("path");

const data = fs.readFileSync(
  path.resolve(__dirname, "../data/by-zones.csv"),
  "utf-8"
);

const out = data
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [
      startZone,
      endZone,
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
    ] = line.split(",").map((s) => s.trim());

    return {
      startZone,
      endZone,
      weather,
      season,
      time,
      area,
      avgDuration: parseFloat(avgDuration) || 0,
      avgDistance: parseFloat(avgDistance) || 0,
      avgFareAmount: parseFloat(avgFareAmount) || 0,
      avgTipAmount: parseFloat(avgTipAmount) || 0,
      avgTotalAmount: parseFloat(avgTotalAmount) || 0,
      numberOfTrips: parseInt(numberOfTrips) || 0,
    };
  });

fs.writeFileSync(
  path.resolve(__dirname, "../data/by-zones.json"),
  JSON.stringify(out)
);
