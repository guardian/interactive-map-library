import { group } from "../../core/group.js"
import { adaptForDatawrapper } from "./util.js"
import { resources } from "./sources.js"
import { styles as s } from "./styles.js"

const Land = group("Land", [s.LandResidential, s.LandIce, s.LandGrass, s.LandPark, s.LandWood], { resources })

const Reliefs = group(
  "Reliefs",
  [
    s.TerrainMountain1,
    s.TerrainMountain2,
    s.TerrainMountain3,
    s.TerrainMountain4,
    s.TerrainMountain5,
    s.TerrainMountain6,
  ],
  { resources },
)

const Water = group("Water", [s.WaterWaterway, s.WaterBody, s.WaterOcean], { resources })

const Aeroways = group("Aeroways", [s.AerowayArea, s.AerowayTaxiway, s.AerowayRunway], {
  resources,
})

const SurfaceRoads = group(
  "SurfaceRoads",
  [
    s.RoadService,
    s.RoadMinor,
    s.RoadSecondaryTertiary,
    s.RoadPrimary,
    s.RoadTrunk,
    s.RoadMotorwayRamp,
    s.RoadMotorway,
  ],
  {
    resources,
    post: [
      // Re-arrange road layers so all casings are drawn first, then all fill layers are drawn.
      // This makes the different road types appear conjoined at junctions.
      // Service roads are excluded from this effect, and always drawn underneath.
      (layers) => {
        const isService = (layer) => layer.metadata?.iml?.style === "RoadService"
        const isCasing = (layer) => layer.id.endsWith("_casing")

        const service = layers.filter(isService)
        const paved = layers.filter((layer) => !isService(layer))

        return [...service, ...paved.sort((a, b) => Number(isCasing(b)) - Number(isCasing(a)))]
      },
    ],
  },
)

const Railways = group("Railways", [s.Rail], { resources })

const Roads = group(
  "Roads",
  [
    s.RoadPath,
    s.TunnelMinor,
    Aeroways,
    SurfaceRoads,
    s.TunnelMajor,
    s.TunnelMotorway,
    Railways,
  ],
  { resources },
)

const Buildings = group("Buildings", [s.Building], { resources })

const Bridges = group("Bridges", [s.BridgeWaterway], { resources })

const Boundaries = group("Boundaries", [s.BoundaryState, s.BoundaryCountry, s.BoundaryDisputed], { resources })

const WaterLabels = group("WaterLabels", [s.LabelWaterPoint], { resources })

const HighwayLabels = group("HighwayLabels", [s.LabelRoadOther, s.LabelRoadMotorway], {
  resources,
})

const PlaceLabels = group(
  "PlaceLabels",
  [
    s.LabelPlaceOther,
    s.LabelPlaceSuburb,
    s.LabelPlaceVillage,
    s.LabelPlaceTown,
    s.LabelPlaceCityMinor,
    s.LabelPlaceCapital,
    s.LabelPlaceCityMajor,
    s.LabelPlaceState,
    s.LabelPlaceCountryMinor,
    s.LabelPlaceCountryMajor,
  ],
  { resources },
)

const Labels = group("Labels", [WaterLabels, HighwayLabels, PlaceLabels], {
  resources,
  theme: { textField: ["name:en", "name_en", "name"] },
})

const Basemap = group(
  "Graphics",
  [
    s.Background,
    Land,
    Reliefs,
    Water,
    Roads,
    Buildings,
    Bridges,
    Boundaries,
    Labels,
    s.Building3D,
  ],
  {
    resources,
    document: {
      name: "Graphics",
      // The style library's layers were derived from the GL style doc provided by
      // Datawrapper (see `app/res/graphics-map-style.json`), so we should preserve
      // its copyright statement.
      metadata: {
        copyright:
          "Copyright (c) 2016, KlokanTech.com & OpenMapTiles contributors. " +
          "Copyright (c) 2015, CartoDB Inc. All rights reserved. " +
          "Derived from 'CartoDB Basemaps' (https://github.com/CartoDB/CartoDB-basemaps) " +
          "designed by Stamen and Paul Norman for CartoDB Inc., licensed under CC-BY 3.0.",
      },
    },
    post: [adaptForDatawrapper],
  },
)

export { Land, Reliefs, Water, Roads, Buildings, Bridges, Boundaries, Labels, Basemap }
