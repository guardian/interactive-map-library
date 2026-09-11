import { merge, style } from "../core/style.js"
import { color } from "../tokens/colors.js"
import { font, fontSize, haloWidth, haloBlur } from "../tokens/typography.js"
import { pTextField, pFadeIn, pSize, pSwap, pFade } from "./utils/partials.js"
import { zInterp, zStep } from "./utils/zoom.js"

const { sm, md, lg } = fontSize

/** @import { Partial, PartialFn } from "./utils/partials.js" */

/** @type {Partial} */
const pPlaceLabel = {
  type: "symbol",
  layout: {
    "text-anchor": "center",
    "text-justify": "center",
    "text-max-width": 8,
    "symbol-spacing": 250,
  },
  paint: {
    "text-color": color.placeLabel,
    "text-halo-color": color.halo,
    "text-halo-width": haloWidth.thick,
  },
}

/** @type {PartialFn} */
const pRegularSans = (size = sm) =>
  merge(pPlaceLabel, {
    layout: {
      "text-font": font.sansRegular,
      "text-letter-spacing": 0.05,
      "text-size": size,
    },
  })

/** @type {PartialFn} */
const pBoldSans = (size = md) =>
  merge(pPlaceLabel, {
    layout: {
      "text-font": font.sansBold,
      "text-letter-spacing": 0.05,
      "text-size": size,
    },
  })

/** @type {PartialFn} */
const pHeadlineBold = (size = lg) =>
  merge(pPlaceLabel, {
    layout: {
      "text-font": font.headlineBold,
      "text-letter-spacing": 0.06,
      "text-size": size,
    },
  })

/** @type {PartialFn} */
const pEgyptianRegular = (size = sm) =>
  merge(pPlaceLabel, {
    layout: {
      "text-font": font.egyptianRegular,
      "text-letter-spacing": 0.1,
      "text-size": size,
    },
  })

/**
 * @param {string} iconImage
 * @param {number} iconSize
 * @param {{ min?: number, max?: number }} [options]
 * @returns {Partial}
 */
const pLabelPoint = (iconImage, iconSize, { min, max } = {}) => {
  const offset = [iconSize, iconSize * 0.4]

  const gate = (inside, outside) => {
    const stops = { [min ?? 0]: inside }

    if (max !== undefined) {
      stops[max] = outside
    }

    return zStep(outside, stops)
  }

  const gated = min !== undefined || max !== undefined

  return {
    type: "symbol",
    layout: {
      // The icon sits to the left of the text, so the label is left-anchored
      // while the icon shows and centred when it's hidden.
      "text-anchor": gated ? gate("left", "center") : "left",
      "text-justify": "center",
      "icon-image": gated ? gate(iconImage, "") : iconImage,
      "icon-size": iconSize,
      // Array values inside an expression must be wrapped as literals, else
      // the step's leading number reads as a (bogus) function name.
      "text-offset": gated ? gate(["literal", offset], ["literal", [0, 0]]) : offset,
    },
  }
}

/** @type {Partial} */
const pLineLabel = {
  type: "symbol",
  layout: {
    "text-font": font.sansRegular,
    "text-size": sm,
    "text-anchor": "center",
    "text-justify": "center",
    "text-letter-spacing": 0.15,
    "symbol-placement": "line-center",
    // TODO: why sin't this working?
    "symbol-spacing": 1000,
  },
  paint: {
    "text-halo-color": color.halo,
    "text-halo-width": haloWidth.thick,
    "text-halo-blur": haloBlur.default,
  },
}

export const LabelRoadOther = style("LabelRoadOther", (theme) => [
  merge(pLineLabel, pTextField(theme.textField), {
    id: "label_road_other",
    minzoom: 15,
    layout: {
      "text-offset": [0, 0.1],
    },
    paint: {
      "text-color": color.placeLabel,
    },
  }),
])

export const LabelRoadMotorway = style("LabelRoadMotorway", (theme) => [
  merge(pLineLabel, pTextField(theme.textField), {
    id: "label_road_motorway",
    minzoom: 13,
    paint: {
      "text-color": color.placeLabel,
    },
  }),
])

export const LabelPlacePark = style("LabelPlacePark", (theme) => [
  merge(pRegularSans(), pTextField(theme.textField), {
    id: "label_place_park",
    minzoom: 15,
    layout: {
      "symbol-spacing": 250,
      "symbol-placement": "point",
      "text-letter-spacing": 0.1,
    },
  }),
])

export const LabelPlaceOther = style("LabelPlaceOther", (theme) => [
  merge(
    pSwap({
      0: pRegularSans(),
      15: pBoldSans(),
    }),
    pTextField(theme.textField),
    {
      id: "label_place_other",
      minzoom: 14,
    },
  ),
])

export const LabelPlaceSuburb = style("LabelPlaceSuburb", (theme) => [
  merge(
    pSwap({
      0: pRegularSans(),
      14: pBoldSans(),
      15: pHeadlineBold(),
    }),
    pTextField(theme.textField),
    pFadeIn("text-opacity", 12, 13),
    {
      id: "label_place_suburb",
    },
  ),
])

export const LabelPlaceVillage = style("LabelPlaceVillage", (theme) => {
  const typography = pSwap({ 0: pRegularSans(), 14: pBoldSans() })

  return [
    merge(typography, pTextField(theme.textField), pFadeIn("text-opacity", 12, 14), {
      id: "label_place_village",
    }),
  ]
})

export const LabelPlaceTown = style("LabelPlaceTown", (theme) => [
  merge(
    pSwap({
      0: pRegularSans(),
      13: pBoldSans(),
      14: pHeadlineBold(),
    }),
    pTextField(theme.textField),
    pFadeIn("text-opacity", 10, 11),
    {
      id: "label_place_town",
    },
  ),
])

export const LabelWaterPoint = style("LabelWaterPoint", (theme) => [
  merge(pTextField(theme.textField), pFadeIn("text-opacity", 2, 4, { max: 0.75 }), {
    id: "label_water_point",
    type: "symbol",
    layout: {
      "text-font": font.sansRegularItalic,
      "text-rotation-alignment": "map",
      "text-size": sm,
      "text-letter-spacing": 0.1,
    },
    paint: {
      "text-color": color.blueWaterLabel,
      "text-halo-color": color.halo,
      "text-halo-width": haloWidth.thick,
    },
  }),
])

export const LabelWaterLineMinor = style("LabelWaterLineMinor", (theme) => [
  merge(pLineLabel, pTextField(theme.textField), pFadeIn("text-opacity", 10, 13, { min: 0.25 }), {
    id: "label_water_line_minor",
    paint: {
      "text-color": color.blueWaterLabel,
    },
  }),
])

export const LabelWaterLineMajor = style("LabelWaterLineMajor", (theme) => [
  merge(pLineLabel, pTextField(theme.textField), {
    id: "label_water_line_major",
    maxzoom: 14,
    minzoom: 5,
    paint: {
      "text-color": color.blueWaterLabel,
    },
  }),
])

export const LabelPlaceCityMinor = style("LabelPlaceCityMinor", (theme) => [
  merge(
    pSwap({
      0: pRegularSans(),
      11: pBoldSans(sm),
      12: pBoldSans(md),
      13: pHeadlineBold(),
    }),
    pTextField(theme.textField),
    pFadeIn("text-opacity", 6, 7),
    {
      maxzoom: 14,
      id: "label_place_city_minor",
    },
  ),
])

export const LabelPlaceState = style("LabelPlaceState", (theme) => [
  merge(
    pSwap({
      0: pEgyptianRegular(),
      6: pEgyptianRegular(sm + 1),
    }),
    pTextField(theme.textField),
    pFade("text-opacity", { in: [5, 7], out: [7, 8] }),
    {
      id: "label_place_state",
      maxzoom: 13,
      layout: {
        "text-letter-spacing": 0.12,
      },
    },
  ),
])

// TODO: is this actually used anywhere?
export const LabelPlaceIsland = style("LabelPlaceIsland", (theme) => [
  merge(pRegularSans(), pTextField(theme.textField), pSize({ 0: sm, 2: sm, 4: md }, 1.4), {
    id: "label_place_island",
    maxzoom: 10,
    paint: {
      "text-opacity": zInterp({ 2: 0.5, 4: 1, 8: 1, 10: 0 }),
    },
  }),
])

export const LabelPlaceCityMajor = style("LabelPlaceCityMajor", (theme) => [
  merge(
    pSwap({
      0: pRegularSans(),
      7: pBoldSans(sm),
      9: pBoldSans(md),
      12: pHeadlineBold(),
    }),
    pTextField(theme.textField),
    pLabelPoint("circle-12", 0.5, { max: 9 }),
    pFadeIn("text-opacity", 4, 5),
    {
      maxzoom: 13,
      id: "label_place_city_major",
    },
  ),
])

export const LabelPlaceCapital = style("LabelPlaceCapital", (theme) => [
  merge(
    pSwap({
      0: pBoldSans(),
      12: pHeadlineBold(),
    }),
    pTextField(theme.textField),
    pLabelPoint("square-12", 0.625, { max: 12 }),
    pFadeIn("text-opacity", 4, 5),
    pSize({ 4: sm, 8: md, 12: lg }),
    {
      maxzoom: 13,
      id: "label_place_capital",
    },
  ),
])

/** @type {Partial} */
const pLabelCountry = merge(
  pSwap({
    0: pRegularSans(sm),
    3: pEgyptianRegular(),
    6: pHeadlineBold(),
  }),
  pFade("text-opacity", { out: [8, 9] }),
  {
    layout: {
      "symbol-z-order": "auto",
    },
  },
)

export const LabelPlaceCountryMinor = style("LabelPlaceCountryMinor", (theme) => [
  merge(
    pLabelCountry,
    pTextField(theme.textField),
    pSize({ 0: sm, 4: sm + 1, 6: md, 7: lg }, 1.6),
    {
      id: "label_place_country_minor",
      maxzoom: 10,
    },
  ),
])

export const LabelPlaceCountryMajor = style("LabelPlaceCountryMajor", (theme) => [
  merge(
    pLabelCountry,
    pTextField(theme.textField),
    pSize({ 0: sm, 4: sm + 1, 6: md, 7: lg }, 1.2),
    {
      id: "label_place_country_major",
      maxzoom: 12,
      layout: {
        "text-allow-overlap": true,
      },
    },
  ),
])
