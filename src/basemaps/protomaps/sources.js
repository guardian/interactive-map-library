import { resources as makeResources } from "../../core/resources.js"

export const resources = makeResources({
  protomaps: {
    type: "vector",
    url: "pmtiles://https://gdn-cdn.s3.amazonaws.com/maptiles/pmtiles/2025/20251208.pmtiles",
    attribution: "© OpenStreetMap",
  },
})
