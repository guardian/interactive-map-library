import { group } from "../../core/group.js"
import { resources } from "./sources.js"
import { styles as s } from "./styles.js"

const Landcover = group(
  "Landcover",
  [s.LanduseResidential, s.LandcoverIce, s.LandcoverGrass, s.LandcoverWood],
  { resources },
)

const Reliefs = group(
  "Reliefs",
  [s.Mountains1, s.Mountains2, s.Mountains3, s.Mountains4, s.Mountains5, s.Mountains6],
  { resources },
)

const Water = group("Water", [s.Waterway, s.Water, s.Ocean], { resources })

const Tunnels = group("Tunnels", [s.TunnelMinor, s.TunnelMajor, s.TunnelMotorway], { resources })

const SurfaceRoads = group(
  "SurfaceRoads",
  [
    s.RoadService,
    s.RoadMinor,
    s.RoadSecondaryTertiary,
    s.RoadPrimary,
    s.RoadTrunk,
    s.MotorwayRamp,
    s.Motorway,
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
        const isCasing = (layer) => layer.id.endsWith("-casing")
        const service = layers.filter(isService)
        const paved = layers.filter((layer) => !isService(layer))

        return [...service, ...paved.sort((a, b) => Number(isCasing(b)) - Number(isCasing(a)))]
      },
    ],
  },
)

const Railways = group("Railways", [s.Railway, s.RailwayTransit], { resources })

const Roads = group("Roads", [s.BridgePlatform, Tunnels, SurfaceRoads, Railways], { resources })

const Buildings = group("Buildings", [s.Building], { resources })

const Bridges = group("Bridges", [s.BridgeWaterway], { resources })

const Boundaries = group("Boundaries", [s.BoundaryCountry], { resources })

const WaterLabels = group(
  "WaterLabels",
  [s.WaterNameLineMinor, s.WaterNameLineMajor, s.WaterName],
  { resources },
)

const HighwayLabels = group("HighwayLabels", [s.HighwayNameOther, s.HighwayNameMotorway], {
  resources,
})

const PlaceLabels = group(
  "PlaceLabels",
  [
    s.PlaceOther,
    s.PlaceSuburb,
    s.PlaceVillage,
    s.PlaceTown,
    s.PlaceCity,
    s.PlaceCityLarge,
    s.PlaceCapital,
    s.PlaceState,
    s.PlaceCountryMinor,
    s.PlaceCountryMajor,
  ],
  { resources },
)

const Labels = group("Labels", [WaterLabels, HighwayLabels, PlaceLabels], {
  resources,
  theme: { textField: ["name:en", "name_en", "name"] },
})

const Graphics = group(
  "Graphics",
  [s.Background, Landcover, Reliefs, Water, Roads, Buildings, Bridges, Boundaries, Labels],
  { resources, document: { name: "Graphics" } },
)

export const groups = {
  Landcover,
  Reliefs,
  Water,
  Roads,
  Buildings,
  Bridges,
  Boundaries,
  Labels,
  Graphics,
}
