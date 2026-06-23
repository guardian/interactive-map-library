import { compose } from "../core/style.js"
import { color } from "../tokens/colors.js"
import { font, fontSize, haloWidth, haloBlur } from "../tokens/typography.js"
import { tTextField, tFadeIn, tSize, tSwap, tFade } from "./utils/traits.js"
import { zInterp, zStep } from "./utils/zoom.js"

const { sm, md, lg } = fontSize

/**
 * @import { Trait, TraitFn } from "./utils/traits.js"
 * @import { StyleFn } from "../core/style.js"
 */

/** @type {Trait} */
const tPlaceLabel = {
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

/** @type {TraitFn} */
const tRegularSans = (size = sm) =>
  compose(tPlaceLabel, {
    layout: {
      "text-font": font.sansRegular,
      "text-letter-spacing": 0.05,
      "text-size": size,
    },
  })

/** @type {TraitFn} */
const tBoldSans = (size = md) =>
  compose(tPlaceLabel, {
    layout: {
      "text-font": font.sansBold,
      "text-letter-spacing": 0.05,
      "text-size": size,
    },
  })

/** @type {TraitFn} */
const tHeadlineBold = (size = lg) =>
  compose(tPlaceLabel, {
    layout: {
      "text-font": font.headlineBold,
      "text-letter-spacing": 0.08,
      "text-size": size,
    },
  })

/** @type {TraitFn} */
const tEgyptianRegular = (size = sm) =>
  compose(tPlaceLabel, {
    layout: {
      "text-font": font.egyptianRegular,
      "text-letter-spacing": 0.12,
      "text-size": size,
    },
  })

/**
 * @param {string} iconImage
 * @param {number} iconSize
 * @param {{ min?: number, max?: number }} [options]
 * @returns {Trait}
 */
const tLabelPoint = (iconImage, iconSize, { min, max } = {}) => {
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

/** @type {Trait} */
const tLineLabel = {
  type: "symbol",
  layout: {
    "text-font": font.sansRegular,
    "text-size": sm,
    "text-anchor": "center",
    "text-justify": "center",
    "text-letter-spacing": 0.2,
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

/** @type {StyleFn} */
export const HighwayNameOther = (theme) =>
  compose(tLineLabel, tTextField(theme.textField), {
    id: "highway_name_other",
    minzoom: 15,
    layout: {
      "text-offset": [0, 0.1],
    },
    paint: {
      "text-color": color.placeLabel,
    },
  })

/** @type {StyleFn} */
export const HighwayNameMotorway = (theme) =>
  compose(tLineLabel, tTextField(theme.textField), {
    id: "highway_name_motorway",
    minzoom: 13,
    paint: {
      "text-color": color.placeLabel,
    },
  })

/** @type {StyleFn} */
export const PlaceParkLabel = (theme) =>
  compose(tRegularSans(), tTextField(theme.textField), {
    id: "label_place_park",
    minzoom: 15,
    layout: {
      "symbol-spacing": 250,
      "symbol-placement": "point",
      "text-letter-spacing": 0.1,
    },
  })

/** @type {StyleFn} */
export const PlaceOther = (theme) =>
  compose(
    tSwap({
      0: tRegularSans(),
      15: tBoldSans(),
    }),
    tTextField(theme.textField),
    {
      id: "label_place_other",
      minzoom: 14,
    },
  )

/** @type {StyleFn} */
export const PlaceSuburb = (theme) =>
  compose(
    tSwap({
      0: tRegularSans(),
      14: tBoldSans(),
      15: tHeadlineBold(),
    }),
    tTextField(theme.textField),
    tFadeIn("text-opacity", 12, 13),
    {
      id: "label_place_suburb",
    },
  )

/** @type {StyleFn} */
export const PlaceVillage = (theme) => {
  const typography = tSwap({ 0: tRegularSans(), 14: tBoldSans() })

  return compose(typography, tTextField(theme.textField), tFadeIn("text-opacity", 12, 14), {
    id: "label_place_village",
  })
}

/** @type {StyleFn} */
export const PlaceTown = (theme) => {
  return compose(
    tSwap({
      0: tRegularSans(),
      13: tBoldSans(),
      14: tHeadlineBold(),
    }),
    tTextField(theme.textField),
    tFadeIn("text-opacity", 10, 11),
    {
      id: "label_place_town",
    },
  )
}

/** @type {StyleFn} */
export const WaterName = (theme) =>
  compose(tTextField(theme.textField), tFadeIn("text-opacity", 2, 4, { max: 0.75 }), {
    id: "label_water_name",
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
  })

/** @type {StyleFn} */
export const WaterNameLineMinor = (theme) =>
  compose(tLineLabel, tTextField(theme.textField), tFadeIn("text-opacity", 10, 13, { min: 0.25 }), {
    id: "label_water_name_line_minor",
    paint: {
      "text-color": color.blueWaterLabel,
    },
  })

/** @type {StyleFn} */
export const WaterNameLineMajor = (theme) =>
  compose(tLineLabel, tTextField(theme.textField), {
    id: "label_water_name_line_major",
    maxzoom: 14,
    minzoom: 5,
    paint: {
      "text-color": color.blueWaterLabel,
    },
  })

/** @type {StyleFn} */
export const PlaceCity = (theme) =>
  compose(
    tSwap({
      0: tRegularSans(),
      11: tBoldSans(sm),
      12: tBoldSans(md),
      13: tHeadlineBold(),
    }),
    tTextField(theme.textField),
    tFadeIn("text-opacity", 6, 7),
    {
      maxzoom: 14,
      id: "label_place_city",
    },
  )

/** @type {StyleFn} */
export const PlaceState = (theme) =>
  compose(
    tSwap({
      0: tEgyptianRegular(),
      6: tEgyptianRegular(sm + 1),
    }),
    tTextField(theme.textField),
    tFade("text-opacity", { in: [5, 7], out: [7, 8] }),
    {
      id: "label_place_state",
      maxzoom: 13,
      layout: {
        "text-letter-spacing": 0.12,
      },
    },
  )

// TODO: is this actually used anywhere?
/** @type {StyleFn} */
export const PlaceIsland = (theme) =>
  compose(tRegularSans(), tTextField(theme.textField), tSize({ 0: sm, 2: sm, 4: md }, 1.4), {
    id: "label_place_island",
    maxzoom: 10,
    paint: {
      "text-opacity": zInterp({ 2: 0.5, 4: 1, 8: 1, 10: 0 }),
    },
  })

/** @type {StyleFn} */
export const PlaceCityLarge = (theme) =>
  compose(
    tSwap({
      0: tRegularSans(),
      9: tBoldSans(md),
      12: tHeadlineBold(),
    }),
    tTextField(theme.textField),
    tLabelPoint("circle-12", 0.5, { max: 9 }),
    tFadeIn("text-opacity", 4, 5),
    {
      maxzoom: 13,
      id: "label_place_city_large",
    },
  )

/** @type {StyleFn} */
export const PlaceCapital = (theme) =>
  compose(
    tSwap({
      0: tBoldSans(),
      12: tHeadlineBold(),
    }),
    tTextField(theme.textField),
    tLabelPoint("square-12", 0.625, { max: 12 }),
    tFadeIn("text-opacity", 4, 5),
    tSize({ 4: sm, 8: md, 12: lg }),
    {
      maxzoom: 13,
      id: "label_place_capital",
    },
  )

/** @type {Trait} */
const tLabelCountry = compose(
  tSwap({ 0: tEgyptianRegular(), 6: tHeadlineBold() }),
  tFade("text-opacity", { out: [8, 9] }),
  {
    layout: {
      "symbol-z-order": "auto",
    },
  },
)

/** @type {StyleFn} */
export const PlaceCountryOther = (theme) =>
  compose(tLabelCountry, tTextField(theme.textField), tSize({ 0: sm, 4: sm, 6: md }, 2), {
    id: "label_place_country_other",
    maxzoom: 8,
  })

/** @type {StyleFn} */
export const PlaceCountryMinor = (theme) =>
  compose(
    tLabelCountry,
    tTextField(theme.textField),
    tSize({ 0: sm, 4: sm + 1, 6: md, 7: lg }, 1.6),
    {
      id: "label_place_country_minor",
      maxzoom: 10,
    },
  )

/** @type {StyleFn} */
export const PlaceCountryMajor = (theme) =>
  compose(
    tLabelCountry,
    tTextField(theme.textField),
    tSize({ 0: sm, 4: sm + 1, 6: md, 7: lg }, 1.2),
    {
      id: "label_place_country_major",
      maxzoom: 12,
      layout: {
        "text-allow-overlap": true,
      },
    },
  )
