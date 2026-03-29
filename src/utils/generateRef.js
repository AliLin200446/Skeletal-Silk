export function buildRefPrompt(analysisResult, description) {
  const mat = description?.trim() || 'fabric'
  if (!analysisResult) return `Macro photography of ${mat}: biomorphic bone structure emerging from textile, editorial fashion, black background, ultra detailed`
  const { rigidity, flow, specular } = analysisResult
  const structure = rigidity > 0.7 ? 'skeletal bone-like lattice' : rigidity > 0.4 ? 'semi-rigid structural mesh' : 'fluid membrane'
  const gloss = specular > 0.6 ? 'high-gloss mirror sheen' : specular > 0.3 ? 'satin lustre' : 'matte texture'
  const motion = flow > 0.6 ? 'billowing liquid motion' : flow > 0.3 ? 'gentle undulation' : 'static rigid form'
  return `Macro photography of ${mat}: ${structure} emerging from textile, ${gloss}, ${motion}, editorial fashion photography, extreme close-up, black studio background, ultra detailed 8k`
}

export async function generateRefImage(analysisResult, description) {
  const key = import.meta.env.VITE_FAL_API_KEY
  if (!key) throw new Error('VITE_FAL_API_KEY not set')
  const prompt = buildRefPrompt(analysisResult, description)
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${key}` },
    body: JSON.stringify({ prompt, image_size: 'square_hd', num_images: 1, num_inference_steps: 4 }),
  })
  if (!res.ok) { const e = await res.json().catch(()=>{}); throw new Error(e?.detail ?? `Fal.ai ${res.status}`) }
  const data = await res.json()
  const url = data?.images?.[0]?.url
  if (!url) throw new Error('No image URL in response')
  return url
}
