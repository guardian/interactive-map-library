import { group } from "../../core/group.js"
import { resources } from "./sources.js"
import { styles as s } from "./styles.js"

const Land = group("Land", [s.LandResidential, s.LandIce, s.LandGrass, s.LandWood], { resources })

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

const Tunnels = group("Tunnels", [s.TunnelMinor, s.TunnelMajor, s.TunnelMotorway], { resources })

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
      // RoadService is a transparent structural casing drawn beneath every fill, so
      // it stays at the front; the paved roads that follow are partitioned
      // casings-first so a later road's casing never paints over an earlier road's
      // fill at a junction.
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

const Railways = group("Railways", [s.Rail, s.RailTransit], { resources })

const Roads = group("Roads", [s.LandPedestrian, Tunnels, SurfaceRoads, Railways], { resources })

const Buildings = group("Buildings", [s.Building], { resources })

const Bridges = group("Bridges", [s.BridgeWaterway], { resources })

const Boundaries = group("Boundaries", [s.BoundaryCountry, s.BoundaryDisputed], { resources })

const WaterLabels = group(
  "WaterLabels",
  [s.LabelWaterLineMinor, s.LabelWaterLineMajor, s.LabelWaterPoint],
  { resources },
)

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
    s.LabelPlaceCityMajor,
    s.LabelPlaceCapital,
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
  [s.Background, Land, Reliefs, Water, Roads, Buildings, Bridges, Boundaries, Labels],
  {
    resources,
    document: { name: "Graphics" },
  },
)

export { Land, Reliefs, Water, Roads, Buildings, Bridges, Boundaries, Labels, Basemap }
