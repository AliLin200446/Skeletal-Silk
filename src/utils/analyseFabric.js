const SYSTEM_PROMPT = `
You are a material analysis engine for a biomorphic textile simulation.
Return ONLY a JSON object:
{ "rigidity": 0.0-1.0, "flow": 0.0-1.0, "specular": 0.0-1.0, "color": [r,g,b] }
Heuristics:
- Silk/satin: rigidity 0.1-0.25, flow 0.75-0.95, specular 0.75-0.95
- Chiffon: rigidity 0.05-0.15, flow 0.85-1.0, specular 0.5-0.75
- Linen/cotton: rigidity 0.40-0.60, flow 0.30-0.50, specular 0.05-0.25
- Velvet: rigidity 0.30-0.50, flow 0.40-0.60, specular 0.02-0.15
- Brocade: rigidity 0.70-0.90, flow 0.15-0.35, specular 0.40-0.65
- Leather: rigidity 0.65-0.85, flow 0.05-0.20, specular 0.45-0.75
- Bone: rigidity 0.88-1.0, flow 0.02-0.15, specular 0.30-0.60
Output ONLY valid JSON. No markdown.
`.trim()

export async function analyseFabric({ imageBase64, mediaType='image/jpeg', description }) {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY not set')
  const userContent = []
  if (imageBase64) userContent.push({ type:'image', source:{ type:'base64', media_type:mediaType, data:imageBase64 }})
  userContent.push({ type:'text', text: description ? `Analyse fabric: "${description}". Return JSON.` : 'Analyse this fabric image. Return JSON.' })
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-key': key,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true',
    },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:256, system:SYSTEM_PROMPT, messages:[{role:'user',content:userContent}] }),
  })
  if (!res.ok) { const e=await res.json().catch(()=>{}); throw new Error(e?.error?.message??`API ${res.status}`) }
  const data = await res.json()
  const raw = data.content?.find(b=>b.type==='text')?.text??'{}'
  let parsed
  try { parsed = JSON.parse(raw.replace(/```json|```/g,'').trim()) }
  catch { throw new Error('Invalid JSON: '+raw.slice(0,80)) }
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number(v)||0))
  return {
    rigidity: clamp(parsed.rigidity,0,1), flow: clamp(parsed.flow,0,1),
    specular: clamp(parsed.specular,0,1),
    color: Array.isArray(parsed.color) ? parsed.color.map(c=>clamp(c,0,1)) : [0.72,0.60,0.52],
  }
}

export function fileToBase64(file) {
  return new Promise((res,rej)=>{
    const r=new FileReader()
    r.onload=()=>{ const [h,d]=r.result.split(','); res({ base64:d, mediaType:h.match(/:(.*?);/)?.[1]??'image/jpeg' }) }
    r.onerror=()=>rej(new Error('read failed'))
    r.readAsDataURL(file)
  })
}
