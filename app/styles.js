import { Graphics } from "../src/basemaps/graphics.js"
import { Protomaps } from "../src/basemaps/protomaps.js"
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
  graphics: Graphics.toGlStyle(),
  protomaps: Protomaps.toGlStyle(),
  "graphics (original)": graphicsMapStyle,
  reuters: reutersStyle,
}
