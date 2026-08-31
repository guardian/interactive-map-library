import { group } from "../../core/group.js"
import { resources } from "./sources.js"
import { styles as s } from "./styles.js"

const Landcover = group(
  "Landcover",
  [s.LanduseResidential, s.LandcoverIce, s.LandcoverGrass, s.LanduseGrass, s.LanduseWood],
  { resources },
)

const Water = group("Water", [s.Waterway, s.Water, s.Ocean], { resources })

const Aeroways = group("Aeroways", [s.AerowayArea, s.AerowayTaxiway, s.AerowayRunway], { resources })

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
      // RoadService is a transparent structural casing with no fill and no "-casing"
      // suffix, so it stays pinned at the front to sit beneath every fill; the paved
      // roads that follow are partitioned casings-first so a later road's casing
      // never paints over an earlier road's fill at a junction.
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

const Railways = group("Railways", [s.RailwayTransit, s.Railway], { resources })

const Roads = group(
  "Roads",
  [s.LandusePedestrian, s.Path, Aeroways, Tunnels, SurfaceRoads, Railways],
  { resources },
)

const Buildings = group("Buildings", [s.Building], { resources })

const Bridges = group("Bridges", [s.BridgeWaterway], { resources })

const Boundaries = group("Boundaries", [s.BoundaryState, s.BoundaryCountry], { resources })

const WaterLabels = group(
  "WaterLabels",
  [s.WaterNameLineMajor, s.WaterNameLineMinor, s.WaterName],
  { resources },
)

const HighwayLabels = group("HighwayLabels", [s.HighwayNameOther, s.HighwayNameMotorway], {
  resources,
})

const PlaceLabels = group(
  "PlaceLabels",
  [
    s.PlaceSuburb,
    s.PlaceOther,
    s.PlaceVillage,
    s.PlaceTown,
    s.PlaceCity,
    s.PlaceCapital,
    s.PlaceCityLarge,
    s.PlaceState,
    s.PlaceCountryMinor,
    s.PlaceCountryMajor,
  ],
  { resources },
)

const Labels = group("Labels", [WaterLabels, HighwayLabels, PlaceLabels], {
  resources,
  theme: { textField: ["name:en", "name"] },
})

const Protomaps = group(
  "Protomaps",
  [s.Background, Landcover, Water, Roads, Buildings, Bridges, Boundaries, Labels],
  {
    resources,
    document: {
      name: "Graphics (Protomaps)",
      metadata: {
        copyright:
          "Basemap data © OpenStreetMap contributors, served via Protomaps. Positron design derived from 'CartoDB Basemaps' designed by Stamen and Paul Norman for CartoDB Inc., licensed under CC-BY 3.0.",
      },
    },
  },
)

export const groups = {
  Landcover,
  Water,
  Roads,
  Buildings,
  Bridges,
  Boundaries,
  Labels,
  Protomaps,
}
