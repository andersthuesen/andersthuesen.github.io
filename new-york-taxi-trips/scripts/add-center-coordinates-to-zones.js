const fs = require("fs");

const content = fs.readFileSync("./data/nyc-taxi-zones.json", "utf8");
const data = JSON.parse(content);

const updatedData = {
  ...data,
  features: data.features.map((feature) => {
    const coords = feature.geometry.coordinates.flatMap((s) =>
      s.flatMap((s) => s)
    );

    const centerCoordinates = coords
      .reduce(
        (acc, curr) => {
          acc[0] += curr[0];
          acc[1] += curr[1];
          return acc;
        },
        [0, 0]
      )
      .map((c) => c / coords.length);

    return {
      ...feature,
      properties: {
        ...feature.properties,
        center: centerCoordinates,
      },
    };
  }),
};

fs.writeFileSync("./data/nyc-taxi-zones.json", JSON.stringify(updatedData));
