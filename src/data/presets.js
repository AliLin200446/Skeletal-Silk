import SWATCH_PARAMS from './swatch-params.json'

// Fabric presets: one-click closed loop for visitors without a photo.
// Cached params (swatch-params.json, same shape as the API response) are
// applied instantly and kept as the fallback if the live call fails.
// TODO: /swatches/*.png are solid-colour placeholders — replace with real
// fabric photos (1024px, <300KB each), same filenames.
export const PRESETS = [
  { id: 'silk',    label: 'SILK',    image: '/swatches/silk.png',    params: SWATCH_PARAMS.silk },
  { id: 'denim',   label: 'DENIM',   image: '/swatches/denim.png',   params: SWATCH_PARAMS.denim },
  { id: 'leather', label: 'LEATHER', image: '/swatches/leather.png', params: SWATCH_PARAMS.leather },
  { id: 'linen',   label: 'LINEN',   image: '/swatches/linen.png',   params: SWATCH_PARAMS.linen },
]
