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
      // avgDuration: parseFloat(avgDuration) || 0,
      // avgDistance: parseFloat(avgDistance) || 0,
      // avgFareAmount: parseFloat(avgFareAmount) || 0,
      // avgTipAmount: parseFloat(avgTipAmount) || 0,
      // avgTotalAmount: parseFloat(avgTotalAmount) || 0,
      numberOfTrips: parseInt(numberOfTrips) || 0,
    };
  });

const out2 = out
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
  .reduce(
    (
      acc,
      {
        startZone,
        endZone,
        numberOfTrips,
        weather,
        season,
        time,
        area,
        ...data
      }
    ) => {
      if (startZone in acc) {
        if (endZone in acc[startZone].to) {
          for (const key in acc[startZone].to[endZone]) {
            if (key == "numberOfTrips") continue;
            // @ts-ignore
            const currentValue = acc[startZone].to[endZone][key];

            // @ts-ignore
            const newValue = data[key];

            if (acc[startZone].to[endZone].numberOfTrips + numberOfTrips == 0)
              continue;

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
    {}
  );

console.log(JSON.stringify(out2, null, 2));

// const out3 = Object.entries(out2).flatMap(
//   ([startZone, { to, ...fromData }]) => {
//     return Object.entries(to).map(([endZone, data]) => {
//       return {
//         startZone,
//         endZone,
//         ...fromData,
//         ...data,
//       };
//     });
//   }
// );

// console.log(out3);
fs.writeFileSync(
  path.resolve(__dirname, "../data/by-zones.json"),
  JSON.stringify(out2)
);
