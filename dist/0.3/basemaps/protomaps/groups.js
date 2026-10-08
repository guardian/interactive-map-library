import { group } from "../../core/group.js"
import { resources } from "./sources.js"
import { styles as s } from "./styles.js"

const Land = group(
  "Land",
  [s.LandResidential, s.LandIce, s.LandGrass, s.LandGrassPark, s.LandWood],
  { resources },
)

const Water = group("Water", [s.WaterWaterway, s.WaterBody, s.WaterOcean], { resources })

const Aeroways = group("Aeroways", [s.AerowayArea, s.AerowayTaxiway, s.AerowayRunway], {
  resources,
})

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
      // RoadService is a transparent structural casing with no fill, so it stays
      // pinned at the front to sit beneath every fill; the paved roads that follow
      // are partitioned casings-first so a later road's casing never paints over an
      // earlier road's fill at a junction.
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

const Railways = group("Railways", [s.RailTransit, s.Rail], { resources })

const Roads = group(
  "Roads",
  [s.LandPedestrian, s.RoadPath, Aeroways, Tunnels, SurfaceRoads, Railways],
  { resources },
)

const Buildings = group("Buildings", [s.Building], { resources })

const Bridges = group("Bridges", [s.BridgeWaterway], { resources })

const Boundaries = group("Boundaries", [s.BoundaryState, s.BoundaryCountry], { resources })

const WaterLabels = group(
  "WaterLabels",
  [s.LabelWaterLineMajor, s.LabelWaterLineMinor, s.LabelWaterPoint],
  { resources },
)

const HighwayLabels = group("HighwayLabels", [s.LabelRoadOther, s.LabelRoadMotorway], {
  resources,
})

const PlaceLabels = group(
  "PlaceLabels",
  [
    s.LabelPlaceSuburb,
    s.LabelPlaceOther,
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
  theme: { textField: ["name:en", "name"] },
})

const Basemap = group(
  "Protomaps",
  [s.Background, Land, Water, Roads, Buildings, Bridges, Boundaries, Labels],
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

export { Land, Water, Roads, Buildings, Bridges, Boundaries, Labels, Basemap }
