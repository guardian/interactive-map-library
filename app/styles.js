import { groups as graphics } from "../src/basemaps/graphics/index.js"
import { groups as protomaps } from "../src/basemaps/protomaps/index.js"
import graphicsMapStyle from "./res/graphics-map-style.json"
import reutersStyle from "./res/reuters-style.json"

/**
 * Registry of complete style documents available to the comparison app.
 * Add an entry here to make a new style selectable in both dropdowns.
 *
 * `graphics (original)` is the unmodified reference GL style that `graphics`
 * was derived from, for side-by-side comparison.
 */
export const styles = {
  graphics: graphics.Graphics.toGlStyle(),
  protomaps: protomaps.Protomaps.toGlStyle(),
  "graphics (original)": graphicsMapStyle,
  reuters: reutersStyle,
}
