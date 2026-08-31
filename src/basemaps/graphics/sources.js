import { resources as makeResources } from "../../core/resources.js"

export const resources = makeResources({
  openmaptiles: {
    type: "vector",
    tiles: ["https://tiles-stg.dwcdn.net/no-cache/openmaptiles/v8/{z}/{x}/{y}.pbf"],
    minzoom: 0,
    maxzoom: 14,
  },
  terrain: {
    type: "vector",
    tiles: ["https://tiles-stg.dwcdn.net/no-cache/terrain/v8/{z}/{x}/{y}.pbf"],
    minzoom: 3,
    maxzoom: 10,
  },
})
