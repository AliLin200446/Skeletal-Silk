import SWATCH_PARAMS from './swatch-params.json'

// Three photographed fabrics plus one flat control. Cached params are real
// measurements of these exact files (see swatch-params.json) — applied
// instantly on click, then replaced by the live reading.
//
// The flat swatch is deliberate: it has no weave to read, so it shows what
// the tool returns when there is no material information in the image.
export const PRESETS = [
  { id: 'brocade', label: 'BROCADE', image: '/swatches/brocade.jpg', params: SWATCH_PARAMS.brocade },
  { id: 'knit',    label: 'KNIT',    image: '/swatches/knit.jpg',    params: SWATCH_PARAMS.knit },
  { id: 'cotton',  label: 'COTTON',  image: '/swatches/cotton.jpg',  params: SWATCH_PARAMS.cotton },
  { id: 'flat',    label: 'FLAT',    image: '/swatches/flat.png',    params: SWATCH_PARAMS.flat },
]
