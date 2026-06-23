import maplibregl from "maplibre-gl"
import { createFunction, createPropertyExpression, v8 } from "@maplibre/maplibre-gl-style-spec"
import { Protocol } from "pmtiles"
import { styles } from "./styles.js"

// The Protomaps style loads a .pmtiles archive over the pmtiles:// protocol,
// which MapLibre doesn't know natively — register the handler once at startup.
const pmtilesProtocol = new Protocol()
maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile)

const styleNames = Object.keys(styles)

// --- Selection state ------------------------------------------------------

// The user's stylesheet, inspect, and diff choices, kept in one place and
// mirrored to the URL so a shared/reloaded link restores them. `left` feeds
// both the compare 'a' panel and the single-view panel; `right` feeds the
// compare 'b' panel. Camera, view, and debug are persisted separately below.
const INSPECT_MODES = ["data", "style", "off"]

function pickStyle(name, fallback) {
  return styleNames.includes(name) ? name : fallback
}

// Meaningful defaults: the derived style vs. the original it came from.
const DEFAULT_LEFT = pickStyle("graphics", styleNames[0])
const DEFAULT_RIGHT = pickStyle("graphics (original)", styleNames[1] ?? styleNames[0])

function readState() {
  const params = new URL(window.location).searchParams
  const inspect = params.get("inspect")
  return {
    left: pickStyle(params.get("left"), DEFAULT_LEFT),
    right: pickStyle(params.get("right"), DEFAULT_RIGHT),
    inspect: INSPECT_MODES.includes(inspect) ? inspect : "data",
    // Diff defaults on; only an explicit "0" turns it off.
    diff: params.get("diff") !== "0",
  }
}

const state = readState()

function writeStateToUrl() {
  const url = new URL(window.location)
  url.searchParams.set("left", state.left)
  url.searchParams.set("right", state.right)
  url.searchParams.set("inspect", state.inspect)
  url.searchParams.set("diff", state.diff ? "1" : "0")
  window.history.replaceState(null, "", url)
}

// Shared camera carried across tab switches (and across the maps within a
// tab). Maps for the inactive tab are destroyed to free GPU/network
// resources, so this is the single source of truth for where we're looking.
let camera = { center: [-0.1, 51.5], zoom: 10, bearing: 0, pitch: 0 }

// Seed the camera position from the URL, so a shared/reloaded link reopens
// where it was left. Only lat/long/zoom are persisted; bearing and pitch keep
// their defaults.
function readCameraFromUrl() {
  const params = new URL(window.location).searchParams
  const lat = Number(params.get("lat"))
  const lng = Number(params.get("lng"))
  const zoom = Number(params.get("zoom"))
  if ([lat, lng, zoom].some(Number.isNaN) || !params.has("lat")) {
    return
  }
  camera = { ...camera, center: [lng, lat], zoom }
}
readCameraFromUrl()

let cameraUrlDebounce
function scheduleWriteCameraToUrl() {
  clearTimeout(cameraUrlDebounce)
  cameraUrlDebounce = setTimeout(() => {
    // camera.center is a LngLat object here (from map.getCenter via
    // readCamera), so read its named fields rather than array indices.
    const url = new URL(window.location)
    url.searchParams.set("lat", camera.center.lat.toFixed(5))
    url.searchParams.set("lng", camera.center.lng.toFixed(5))
    url.searchParams.set("zoom", camera.zoom.toFixed(2))
    window.history.replaceState(null, "", url)
  }, 250)
}

const selects = {
  a: document.getElementById("style-a"),
  b: document.getElementById("style-b"),
  single: document.getElementById("style-single"),
}

for (const select of Object.values(selects)) {
  for (const name of styleNames) {
    const option = document.createElement("option")
    option.value = name
    option.textContent = name
    select.append(option)
  }
}

// `a` and `single` both render the "left" style, so their selects share one
// value; `b` renders "right". Reflect the current state onto all three.
function syncSelectValues() {
  selects.a.value = state.left
  selects.single.value = state.left
  selects.b.value = state.right
}
syncSelectValues()

function makeMap(containerId, styleName) {
  return new maplibregl.Map({
    container: containerId,
    style: styles[styleName],
    center: camera.center,
    zoom: camera.zoom,
    bearing: camera.bearing,
    pitch: camera.pitch,
    // Needed so the canvas can be read back for pixel comparison.
    preserveDrawingBuffer: true,
    attributionControl: false,
    // fadeDuration: 0,
  })
}

function readCamera(map) {
  return {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  }
}

// --- Debug layers ---------------------------------------------------------

// A global toggle that draws every source-layer present in a style's vector
// sources, regardless of what the style itself renders — the fast way to see
// data (e.g. boundaries) that the hand-authored layers filter out or miss.
//
// This adds no tile-server traffic: a vector tile is fetched once and carries
// all its layers, so the debug layers just tell the renderer to additionally
// draw source-layers it already has in memory.
//
// Enumerating those source-layers is the catch: our tiles are configured with
// an inline `tiles: [...]` template (or a pmtiles:// archive) and no TileJSON,
// so the client never receives a `vector_layers` manifest —
// `source.vectorLayerIds` is undefined and there's no public API to list what a
// decoded tile contains. We therefore probe a known, fixed schema per tileset
// (OpenMapTiles v8 or Protomaps basemaps) and rely on the fact that a debug
// layer bound to an absent source-layer simply draws nothing.
const debugToggle = document.getElementById("debug-toggle")
let debugOn = new URL(window.location).searchParams.get("debug") === "1"
debugToggle.dataset.on = String(debugOn)

const DEBUG_PREFIX = "__debug__"

// Debug layer ids encode `__debug__<source>__<sourceLayer>__<geom>` for the
// add/remove logic, but that's noise in the tooltip — the source and
// source-layer already show on the feature's source line. Reduce a debug id to
// just its geometry role (eg. "debug line"); pass real layer ids through.
function prettifyLayerId(id) {
  if (!id.startsWith(DEBUG_PREFIX)) {
    return id
  }
  const geom = id.slice(id.lastIndexOf("__") + 2)
  return `debug ${geom}`
}

// Loud, translucent fills/lines/circles so overlapping geometry types stay
// legible over each other and the basemap.
const debugColors = {
  fill: "rgba(255, 0, 128, 0.15)",
  fillOutline: "rgba(255, 0, 128, 0.6)",
  line: "rgba(0, 128, 255, 0.7)",
  circle: "rgba(255, 128, 0, 0.8)",
}

// Distinct line colours per source-layer so the line-heavy layers can be told
// apart — boundaries in particular shouldn't read the same as roads. Names from
// both the OpenMapTiles and Protomaps schemas are listed; layers not listed
// fall back to `debugColors.line`.
const debugLineColors = {
  // OpenMapTiles
  boundary: "rgba(160, 32, 240, 0.8)", // purple
  transportation: "rgba(0, 128, 255, 0.7)", // blue
  transportation_name: "rgba(0, 128, 255, 0.7)",
  waterway: "rgba(0, 200, 200, 0.8)", // cyan
  // Protomaps
  boundaries: "rgba(160, 32, 240, 0.8)", // purple
  roads: "rgba(0, 128, 255, 0.7)", // blue
}

// The OpenMapTiles v8 schema layers. Fixed and well-documented, so we can
// enumerate them without a TileJSON manifest. A debug layer bound to a
// source-layer the tileset lacks simply draws nothing.
const OPENMAPTILES_LAYERS = [
  "water",
  "waterway",
  "landcover",
  "landuse",
  "mountain_peak",
  "park",
  "boundary",
  "aeroway",
  "transportation",
  "building",
  "water_name",
  "transportation_name",
  "place",
  "housenumber",
  "poi",
  "aerodrome_label",
]

// The Protomaps basemaps schema layers, per
// https://docs.protomaps.com/basemaps/layers — likewise fixed, so enumerable
// without a manifest.
const PROTOMAPS_LAYERS = [
  "earth",
  "landuse",
  "natural",
  "landcover",
  "water",
  "physical_line",
  "physical_point",
  "roads",
  "transit",
  "boundaries",
  "buildings",
  "places",
  "pois",
]

// The source-layer schema to probe, keyed by the source id used in our style
// documents. A source not listed here falls back to the OpenMapTiles schema.
const SCHEMAS = {
  protomaps: PROTOMAPS_LAYERS,
  openmaptiles: OPENMAPTILES_LAYERS,
  terrain: OPENMAPTILES_LAYERS,
}

// The vector sources of a loaded style, as [sourceId, sourceLayerIds[]] pairs.
// Each source is paired with its tileset's known schema: a debug layer pointing
// at a source-layer that happens to be absent from a tile simply draws nothing,
// so declaring the whole set is harmless and — unlike a per-viewport presence
// check — keeps coverage independent of where we look.
function vectorSourceLayers(map) {
  const sources = map.getStyle().sources || {}
  const result = []
  for (const [sourceId, def] of Object.entries(sources)) {
    if (def.type === "vector") {
      result.push([sourceId, SCHEMAS[sourceId] ?? OPENMAPTILES_LAYERS])
    }
  }
  return result
}

function addDebugLayers(map) {
  for (const [sourceId, layerIds] of vectorSourceLayers(map)) {
    for (const sourceLayer of layerIds) {
      const base = `${DEBUG_PREFIX}${sourceId}__${sourceLayer}`
      map.addLayer({
        id: `${base}__fill`,
        type: "fill",
        source: sourceId,
        "source-layer": sourceLayer,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": debugColors.fill,
          "fill-outline-color": debugColors.fillOutline,
        },
      })
      map.addLayer({
        id: `${base}__line`,
        type: "line",
        source: sourceId,
        "source-layer": sourceLayer,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": debugLineColors[sourceLayer] || debugColors.line,
          "line-width": 1.5,
        },
      })
      map.addLayer({
        id: `${base}__circle`,
        type: "circle",
        source: sourceId,
        "source-layer": sourceLayer,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": debugColors.circle,
          "circle-radius": 3,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 0.5,
        },
      })
    }
  }
}

function removeDebugLayers(map) {
  for (const layer of map.getStyle().layers) {
    if (layer.id.startsWith(DEBUG_PREFIX)) {
      map.removeLayer(layer.id)
    }
  }
}

// Apply the current debug state to one map. addLayer needs the style in
// place, so defer to `idle` if it isn't loaded yet.
function applyDebug(map) {
  if (!debugOn) {
    return
  }
  if (map.isStyleLoaded()) {
    removeDebugLayers(map)
    addDebugLayers(map)
  } else {
    map.once("idle", () => applyDebug(map))
  }
}

function setDebug(on) {
  debugOn = on
  debugToggle.dataset.on = String(on)
  for (const map of Object.values(maps)) {
    if (on) {
      applyDebug(map)
    } else {
      removeDebugLayers(map)
    }
  }
  const url = new URL(window.location)
  if (on) {
    url.searchParams.set("debug", "1")
  } else {
    url.searchParams.delete("debug")
  }
  window.history.replaceState(null, "", url)
}

debugToggle.addEventListener("click", () => setDebug(!debugOn))
window.addEventListener("keydown", (event) => {
  const typingInto = event.target.matches("input, select, textarea")
  if (event.key === "d" && !typingInto && !event.metaKey && !event.ctrlKey) {
    setDebug(!debugOn)
  }
})

// --- View lifecycle -------------------------------------------------------

// Live maps for the currently active view, keyed by panel id. Rebuilt on
// every tab switch; the previous view's maps are removed first.
let maps = {}
let currentView = "compare"

const mapsEl = document.getElementById("maps")
const diffPanel = document.getElementById("diff-panel")
const zoomReadout = document.getElementById("zoom-readout")

function updateZoomReadout() {
  // camera.center may be a [lng, lat] array (default) or a LngLat object
  // (from map.getCenter via readCamera); normalise before reading.
  const center = maplibregl.LngLat.convert(camera.center)
  zoomReadout.textContent = `${center.lat.toFixed(3)}, ${center.lng.toFixed(3)} · z ${camera.zoom.toFixed(2)}`
}
updateZoomReadout()

// --- Map size -------------------------------------------------------------

// Optional fixed pixel dimensions for the map canvases. Either axis can be
// left blank to keep its auto (fill-the-panel) sizing; a value pins that axis.
// Mirrored to the URL so a shared link reproduces the same framing — useful
// for matching a target render or export size.
const sizeInputs = {
  w: document.getElementById("size-w"),
  h: document.getElementById("size-h"),
}
let size = readSizeFromUrl()

function readSizeFromUrl() {
  const params = new URL(window.location).searchParams
  const parse = (key) => {
    const value = Number(params.get(key))
    return params.has(key) && Number.isFinite(value) && value > 0 ? value : null
  }
  return { w: parse("w"), h: parse("h") }
}

// Push the current size onto the #maps element (as CSS vars + a data flag the
// stylesheet keys off) and tell every live map to re-read its container box.
function applySize() {
  const sized = size.w !== null || size.h !== null
  mapsEl.dataset.sized = String(sized)
  // Remove (not blank) an unset axis so the CSS `var(..., 100%)` fallback
  // applies and that dimension fills the panel instead of collapsing to 0.
  for (const axis of ["w", "h"]) {
    if (size[axis] !== null) {
      mapsEl.style.setProperty(`--map-${axis}`, `${size[axis]}px`)
    } else {
      mapsEl.style.removeProperty(`--map-${axis}`)
    }
  }
  for (const map of Object.values(maps)) {
    map.resize()
  }
}

function writeSizeToUrl() {
  const url = new URL(window.location)
  for (const axis of ["w", "h"]) {
    if (size[axis] !== null) {
      url.searchParams.set(axis, String(size[axis]))
    } else {
      url.searchParams.delete(axis)
    }
  }
  window.history.replaceState(null, "", url)
}

function syncSizeInputs() {
  sizeInputs.w.value = size.w !== null ? String(size.w) : ""
  sizeInputs.h.value = size.h !== null ? String(size.h) : ""
}
syncSizeInputs()

for (const axis of ["w", "h"]) {
  sizeInputs[axis].addEventListener("input", () => {
    const value = Number(sizeInputs[axis].value)
    size[axis] = sizeInputs[axis].value !== "" && Number.isFinite(value) && value > 0 ? value : null
    applySize()
    writeSizeToUrl()
  })
}

// The tooltip shows either raw feature data or the resolved map style for the
// features under the cursor. The last hover is remembered so toggling the mode
// re-renders the tooltip in place, without needing to move the mouse.
// Cycles data → style → off. In "off" the feature tooltip is suppressed
// entirely; the ghost cursor still tracks the pointer across panels.
const inspectToggle = document.getElementById("inspect-toggle")
let lastHover = null

// A pinned tooltip freezes at a clicked point, staying put as the cursor moves
// away so its contents can be read and scrolled. `pinned` holds the map-relative
// point (shared across the synced panels) while pinned, else null. Hover updates
// are suppressed while pinned; a click toggles it off, or onto a new point.
let pinned = null

// Pin or unpin the tooltip. Pinning renders all panels at the pinned point (the
// synced camera makes it the same place on every map, so both compare panels
// pin together); unpinning clears the frozen tooltips.
function setPinned(next) {
  pinned = next
  if (pinned) {
    renderHover(pinned.hoveredKey, pinned.point)
  } else {
    hideTooltip()
  }
}

// Reflect the current inspect mode onto its toggle, without advancing it.
function syncInspectToggle() {
  inspectToggle.dataset.mode = state.inspect
  inspectToggle.textContent = state.inspect === "off" ? "no inspect" : `inspect ${state.inspect}`
}
syncInspectToggle()

function toggleInspectMode() {
  const next = (INSPECT_MODES.indexOf(state.inspect) + 1) % INSPECT_MODES.length
  state.inspect = INSPECT_MODES[next]
  syncInspectToggle()
  writeStateToUrl()
  if (pinned) {
    renderHover(pinned.hoveredKey, pinned.point)
  } else if (lastHover) {
    renderHover(lastHover.hoveredKey, lastHover.point)
  }
}

inspectToggle.addEventListener("click", toggleInspectMode)
window.addEventListener("keydown", (event) => {
  const typingInto = event.target.matches("input, select, textarea")
  if (event.key === "i" && !typingInto && !event.metaKey && !event.ctrlKey) {
    toggleInspectMode()
  }
  if (event.key === "Escape" && pinned) {
    setPinned(null)
  }
})

// The pixel diff overlay is only meaningful in the compare view (it needs two
// maps), so its visibility is the user toggle ANDed with the current view.
const diffToggle = document.getElementById("diff-toggle")

function syncDiffPanel() {
  const show = state.diff && currentView === "compare"
  diffPanel.style.display = show ? "" : "none"
}

function setDiff(on) {
  state.diff = on
  diffToggle.dataset.on = String(on)
  syncDiffPanel()
  writeStateToUrl()
}
setDiff(state.diff)

diffToggle.addEventListener("click", () => setDiff(!state.diff))
window.addEventListener("keydown", (event) => {
  const typingInto = event.target.matches("input, select, textarea")
  if (event.key === "p" && !typingInto && !event.metaKey && !event.ctrlKey) {
    setDiff(!state.diff)
  }
})

// View-state sync: when one live map moves, mirror its camera onto the
// others. A guard flag prevents the echoed move from bouncing back.
let syncing = false

function syncFrom(source) {
  if (syncing) {
    return
  }
  syncing = true
  camera = readCamera(source)
  for (const map of Object.values(maps)) {
    if (map !== source) {
      map.jumpTo(camera)
    }
  }
  syncing = false
  updateZoomReadout()
  scheduleWriteCameraToUrl()
}

function destroyMaps() {
  // Snapshot the camera from any live map before tearing them down, so the
  // next view opens exactly where we left off.
  const anyMap = Object.values(maps)[0]
  if (anyMap) {
    camera = readCamera(anyMap)
  }
  for (const map of Object.values(maps)) {
    map.remove()
  }
  maps = {}
}

// The style each panel renders: `a` and `single` show "left", `b` shows
// "right".
function panelStyle(key) {
  return key === "b" ? state.right : state.left
}

function buildView(view) {
  const panels =
    view === "compare"
      ? [
          ["a", "map-a"],
          ["b", "map-b"],
        ]
      : [["single", "map-single"]]

  for (const [key, containerId] of panels) {
    const map = makeMap(containerId, panelStyle(key))
    map.on("move", () => syncFrom(map))
    attachTooltip(map, key)
    map.on("load", () => applyDebug(map))
    maps[key] = map
  }

  if (view === "compare") {
    attachCompare()
  }

  // Freshly built maps size themselves to their container; re-assert any
  // fixed dimensions so a tab switch preserves the chosen framing.
  applySize()
}

function setView(view) {
  if (view === currentView && Object.keys(maps).length) {
    return
  }
  destroyMaps()
  currentView = view
  mapsEl.dataset.view = view
  syncDiffPanel()
  // The pinned point belongs to the maps we just tore down; drop it.
  pinned = null
  lastHover = null
  hideTooltip()

  for (const tab of document.querySelectorAll(".tab")) {
    tab.setAttribute("aria-selected", String(tab.dataset.view === view))
  }

  const url = new URL(window.location)
  url.searchParams.set("view", view)
  window.history.replaceState(null, "", url)

  buildView(view)
}

for (const tab of document.querySelectorAll(".tab")) {
  tab.addEventListener("click", () => setView(tab.dataset.view))
}

// Swap one live map's style. Reloading resets the camera, so restore it.
function applyStyleToMap(map, styleName) {
  const restore = readCamera(map)
  map.setStyle(styles[styleName])
  map.once("styledata", () => map.jumpTo(restore))
  // A style swap wipes any added layers. Re-apply the debug overlay once the
  // new style has settled; `idle` is the reliable post-swap signal, since
  // isStyleLoaded() can still report the old style immediately after setStyle.
  if (debugOn) {
    map.once("idle", () => applyDebug(map))
  }
}

// A select changed. `a`/`single` set the left style, `b` sets the right; in
// both cases update state, keep the paired selects in sync, and reload any
// live map showing that side.
function setStyle(key, styleName) {
  const side = key === "b" ? "right" : "left"
  state[side] = styleName
  syncSelectValues()
  writeStateToUrl()
  // Reload every live map showing the side that changed. `b` is the only
  // right-hand panel; `a`/`single` are both left-hand (and only one is live
  // at a time).
  for (const [panelKey, map] of Object.entries(maps)) {
    const panelSide = panelKey === "b" ? "right" : "left"
    if (panelSide === side) {
      applyStyleToMap(map, styleName)
    }
  }
}

for (const [key, select] of Object.entries(selects)) {
  select.addEventListener("change", () => setStyle(key, select.value))
}

document.getElementById("randomise").addEventListener("click", () => {
  const lng = -180 + Math.random() * 360
  const lat = -60 + Math.random() * 120
  const zoom = 2 + Math.random() * 12
  camera = { center: [lng, lat], zoom, bearing: 0, pitch: 0 }
  const anyMap = Object.values(maps)[0]
  if (anyMap) {
    anyMap.jumpTo(camera)
  }
})

// --- Feature tooltip ------------------------------------------------------

// Each panel owns a tooltip and a cursor marker layered over its map, looked
// up by panel key so a hover on one map can update every panel.
function panelEl(key, selector) {
  return document.querySelector(`[data-panel="${key}"] ${selector}`)
}

function hideTooltip() {
  for (const el of document.querySelectorAll("[data-tooltip]")) {
    el.hidden = true
  }
  for (const el of document.querySelectorAll("[data-cursor]")) {
    el.hidden = true
  }
}

function renderProps(properties) {
  const entries = Object.entries(properties)
  if (!entries.length) {
    return ""
  }
  return entries
    .map(
      ([key, value]) =>
        `<div class="prop"><span class="key">${escapeHtml(key)}</span> ${escapeHtml(String(value))}</div>`,
    )
    .join("")
}

function renderFeatures(features) {
  if (!features.length) {
    return `<div class="empty">no features</div>`
  }
  // A single point often hits the same feature in several layers; show each
  // rendered layer, but cap the list so the tooltip stays legible.
  return features
    .slice(0, 8)
    .map(
      (feature) =>
        `<div class="feature">` +
        `<div class="layer">${escapeHtml(prettifyLayerId(feature.layer.id))}</div>` +
        `<div class="source">${escapeHtml(feature.source)}${feature.sourceLayer ? " · " + escapeHtml(feature.sourceLayer) : ""}</div>` +
        renderProps(feature.properties) +
        `</div>`,
    )
    .join("")
}

// --- Resolved-style inspection --------------------------------------------

// Resolve one paint/layout value (constant or expression) to its concrete
// value for a given feature and zoom, using the reference spec that governs
// the property's type and interpolation. Returns undefined if the spec is
// unknown or the expression fails to compile, so callers can skip it.
const GEOMETRY_TYPE_ID = { Point: 1, LineString: 2, Polygon: 3 }

// Legacy stop functions are plain objects carrying a `stops` array, e.g.
// { base: 1.4, stops: [[0, 10], [4, 14]] }. Modern expressions are arrays.
function isLegacyFunction(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Array.isArray(value.stops)
  )
}

function compileExpression(value, propSpec) {
  const compiled = createPropertyExpression(value, propSpec)
  return compiled.result === "error" ? undefined : compiled.value
}

function resolveStyleValue(specKey, propName, value, feature, zoom) {
  const propSpec = v8[specKey] && v8[specKey][propName]
  if (!propSpec) {
    return undefined
  }
  // Values may be modern expressions or legacy stop functions
  // ({ base/property, stops }); the two compile through different helpers.
  const evaluator = isLegacyFunction(value)
    ? createFunction(value, propSpec)
    : compileExpression(value, propSpec)
  if (!evaluator) {
    return undefined
  }
  // Data-driven evaluators read feature.type as a numeric geometry id, but a
  // queried GeoJSON feature carries the string form ("Point", …). Pass a
  // normalised feature so those evaluate instead of throwing.
  const evalFeature = {
    ...feature,
    type: GEOMETRY_TYPE_ID[feature.type] ?? feature.type,
  }
  try {
    return evaluator.evaluate({ zoom }, evalFeature)
  } catch {
    return undefined
  }
}

// Colors resolve to a Color object whose toString() yields rgba(...). Show
// them as hex instead: #rrggbb, or #rrggbbaa when not fully opaque. We parse
// the rgba() string rather than reading the Color's channels directly, since
// those are premultiplied and un-premultiplying is version-dependent — the
// toString() output is already the correct, un-premultiplied form.
function rgbaToHex(rgba) {
  const match = rgba.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  )
  if (!match) {
    return undefined
  }
  const channel = (n) => Math.round(Number(n)).toString(16).padStart(2, "0")
  const alpha = match[4] === undefined ? 1 : Number(match[4])
  const hex = `#${channel(match[1])}${channel(match[2])}${channel(match[3])}`
  if (alpha >= 1) {
    return hex
  }
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`
}

// A resolved value can be a Color, Padding, array, etc. Render each as a
// short, readable string rather than "[object Object]".
function formatStyleValue(value) {
  if (value === null || value === undefined) {
    return "—"
  }
  if (typeof value === "object" && typeof value.toString === "function") {
    const string = value.toString()
    return rgbaToHex(string) ?? string
  }
  return String(value)
}

// The paint/layout keys a layer actually declares, read from its serialized
// form. Everything else falls back to spec defaults, which we deliberately
// don't show.
function declaredStyle(layer) {
  const serialized = typeof layer.serialize === "function" ? layer.serialize() : layer
  return {
    type: serialized.type,
    // Layer-level visibility range. Unset means the spec defaults of 0/24,
    // i.e. the full zoom range.
    minzoom: serialized.minzoom ?? 0,
    maxzoom: serialized.maxzoom ?? 24,
    paint: serialized.paint || {},
    layout: serialized.layout || {},
  }
}

function renderResolvedStyle(map, feature, zoom) {
  const layer = map.getLayer(feature.layer.id)
  if (!layer) {
    return ""
  }
  const { type, minzoom, maxzoom, paint, layout } = declaredStyle(layer)

  const rows = [`<div class="prop"><span class="key">zoom range</span> ${minzoom}–${maxzoom}</div>`]
  for (const [group, specPrefix] of [
    [layout, "layout_"],
    [paint, "paint_"],
  ]) {
    for (const [propName, value] of Object.entries(group)) {
      const resolved = resolveStyleValue(specPrefix + type, propName, value, feature, zoom)
      if (resolved === undefined) {
        continue
      }
      rows.push(
        `<div class="prop"><span class="key">${escapeHtml(propName)}</span> ${escapeHtml(formatStyleValue(resolved))}</div>`,
      )
    }
  }

  return rows.join("")
}

function renderFeatureStyles(features, map, zoom) {
  if (!features.length) {
    return `<div class="empty">no features</div>`
  }
  return features
    .slice(0, 8)
    .map(
      (feature) =>
        `<div class="feature">` +
        `<div class="layer">${escapeHtml(prettifyLayerId(feature.layer.id))}</div>` +
        `<div class="source">${escapeHtml(feature.layer.type)}</div>` +
        renderResolvedStyle(map, feature, zoom) +
        `</div>`,
    )
    .join("")
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// Position a tooltip near a point within its panel, flipping to the other
// side near the panel edges so it stays within the map. `point` and the
// panel rect are both in viewport coordinates; the tooltip is absolutely
// positioned within the panel, so we subtract the panel origin.
function placeTooltip(tooltip, panelRect, point) {
  const pad = 14
  const tipRect = tooltip.getBoundingClientRect()

  let x = point.x + pad
  if (x + tipRect.width > panelRect.width) {
    x = point.x - pad - tipRect.width
  }
  let y = point.y + pad
  if (y + tipRect.height > panelRect.height) {
    y = point.y - pad - tipRect.height
  }
  tooltip.style.left = `${Math.max(0, x)}px`
  tooltip.style.top = `${Math.max(0, y)}px`
}

// The maps share a synced camera, so `point` (map-relative pixels) is the
// same geographic location on every live map. On a hover we update all
// panels: each shows its own map's features, the hovered panel keeps the real
// OS cursor, and the others get a ghost cursor marker at the mirrored point.
// The tooltip content depends on state.inspect: raw feature data or resolved
// style — or, in "off", it's suppressed entirely while the ghost cursor still
// tracks the pointer. `hoveredKey` is the panel physically under the OS cursor.
function renderHover(hoveredKey, point) {
  for (const key of Object.keys(maps)) {
    const tooltip = panelEl(key, "[data-tooltip]")
    const cursor = panelEl(key, "[data-cursor]")
    const panelRect = tooltip.parentElement.getBoundingClientRect()

    if (state.inspect === "off") {
      tooltip.hidden = true
    } else {
      const features = maps[key].queryRenderedFeatures(point)
      tooltip.innerHTML =
        state.inspect === "style"
          ? renderFeatureStyles(features, maps[key], maps[key].getZoom())
          : renderFeatures(features)
      tooltip.hidden = false
      // A pinned tooltip becomes interactive (pointer-events + native
      // scrollbar); a hovering one stays click-through so it doesn't block the
      // map beneath it.
      tooltip.dataset.pinned = String(pinned !== null)
      placeTooltip(tooltip, panelRect, point)
    }

    if (key === hoveredKey) {
      cursor.hidden = true
    } else {
      cursor.style.left = `${point.x}px`
      cursor.style.top = `${point.y}px`
      cursor.hidden = false
    }
  }
}

function attachTooltip(map, hoveredKey) {
  map.on("mousemove", (event) => {
    // While pinned the tooltip is frozen; ignore hover so it stays put and
    // stays interactive.
    if (pinned) {
      return
    }
    lastHover = { hoveredKey, point: event.point }
    renderHover(hoveredKey, event.point)
  })

  map.on("mouseout", () => {
    if (pinned) {
      return
    }
    lastHover = null
    hideTooltip()
  })

  // A click pins the current tooltip in place, or — if one is already pinned —
  // clears it. MapLibre fires `click` only on a genuine press (not a drag), so
  // this doesn't fight panning.
  map.on("click", (event) => {
    if (pinned) {
      setPinned(null)
    } else {
      setPinned({ hoveredKey, point: event.point })
    }
  })

  // Resolved style is zoom-dependent, and the features under a fixed screen
  // point change as the map zooms beneath it. Re-render on move so a parked
  // cursor — or a pinned tooltip — keeps showing current values without a
  // mouse wiggle.
  map.on("move", () => {
    if (pinned) {
      renderHover(pinned.hoveredKey, pinned.point)
    } else if (lastHover) {
      renderHover(lastHover.hoveredKey, lastHover.point)
    }
  })
}

// --- Pixel comparison -----------------------------------------------------

const diffCanvas = document.getElementById("diff-canvas")
const diffMatch = document.getElementById("diff-match")
const diffSwatch = document.getElementById("diff-swatch")

// Compare at a fixed, modest resolution: cheap, and sidesteps any
// sub-pixel size mismatch between the two live canvases.
const SAMPLE_W = 320
const SAMPLE_H = 240

// Per-channel tolerance — GPU rasterisation differs slightly between draws.
const CHANNEL_TOLERANCE = 0

const scratch = document.createElement("canvas")
scratch.width = SAMPLE_W
scratch.height = SAMPLE_H
const scratchCtx = scratch.getContext("2d", { willReadFrequently: true })

diffCanvas.width = SAMPLE_W
diffCanvas.height = SAMPLE_H
const diffCtx = diffCanvas.getContext("2d")

// Even with preserveDrawingBuffer, the GL back-buffer is only reliably
// readable in the same tick as a paint; a deferred read returns a cleared
// (all-zero) buffer. Forcing a synchronous redraw immediately before the
// drawImage guarantees there's a fresh frame to copy out.
function sample(map) {
  map.redraw()
  scratchCtx.clearRect(0, 0, SAMPLE_W, SAMPLE_H)
  scratchCtx.drawImage(map.getCanvas(), 0, 0, SAMPLE_W, SAMPLE_H)
  return scratchCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data
}

function compare() {
  if (!maps.a || !maps.b) {
    return
  }
  const a = sample(maps.a)
  const b = sample(maps.b)
  const out = diffCtx.createImageData(SAMPLE_W, SAMPLE_H)
  let mismatched = 0
  const pixels = SAMPLE_W * SAMPLE_H

  for (let i = 0; i < pixels; i++) {
    const o = i * 4
    const dr = Math.abs(a[o] - b[o])
    const dg = Math.abs(a[o + 1] - b[o + 1])
    const db = Math.abs(a[o + 2] - b[o + 2])
    const differs = dr > CHANNEL_TOLERANCE || dg > CHANNEL_TOLERANCE || db > CHANNEL_TOLERANCE

    if (differs) {
      mismatched++
      out.data[o] = 255
      out.data[o + 1] = 0
      out.data[o + 2] = 0
      out.data[o + 3] = 255
    } else {
      // Faded greyscale of the matching pixel for context.
      const grey = (a[o] + a[o + 1] + a[o + 2]) / 3
      out.data[o] = grey
      out.data[o + 1] = grey
      out.data[o + 2] = grey
      out.data[o + 3] = 60
    }
  }

  diffCtx.putImageData(out, 0, 0)

  const match = (1 - mismatched / pixels) * 100
  diffMatch.textContent = `${match.toFixed(2)}% match`
  diffSwatch.style.background = mismatched === 0 ? "#22a722" : "#d33"
}

let debounce
function scheduleCompare() {
  clearTimeout(debounce)
  debounce = setTimeout(compare, 250)
}

// Wire pixel comparison onto the compare view's two maps. Called each time
// the compare view is (re)built, since those maps are freshly created.
function attachCompare() {
  for (const map of [maps.a, maps.b]) {
    map.on("moveend", scheduleCompare)
    map.on("idle", scheduleCompare)
  }
}

const initialView = new URL(window.location).searchParams.get("view")
setView(initialView === "single" ? "single" : "compare")
