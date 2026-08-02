import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec"

/**
 * @param {object} doc
 */
export function validateGlDocument(doc) {
  return [...validateStyleMin(doc), ...symbolTextErrors(doc)]
}

/**
 * @param {object} doc
 */
function symbolTextErrors(doc) {
  if (!doc.layers) {
    return []
  }

  return doc.layers
    .filter(
      (layer) =>
        layer.type === "symbol" &&
        layer.layout?.["text-field"] === undefined &&
        layer.layout?.["icon-image"] === undefined,
    )
    .map((layer) => ({
      message: `symbol layer "${layer.id}" has no text-field or icon-image — set theme.textField on its binding or group`,
    }))
}
