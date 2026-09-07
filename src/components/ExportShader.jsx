import { useState, useCallback } from "react";
import { useStore, selectPrimary, hasReading } from "../store";
import { useInstrument } from "../store/instrument";
import vertGLSL from "../shaders/skeletal.vert.glsl?raw";
import fragGLSL from "../shaders/skeletal.frag.glsl?raw";

// What leaves the app: the shader source plus the uniform values Claude read
// for this material. Both are required to reproduce the look elsewhere — the
// shader alone is identical for every material, the numbers alone are inert.
function buildExport({ rigidity, flow, specular, color }, light, intensity) {
  const v3 = color.map((c) => c.toFixed(4)).join(", ");
  const params = JSON.stringify({ rigidity, flow, specular, color }, null, 2);
  return `/* ────────────────────────────────────────────────────────────────────
   Skeletal Silk — material export
   skeletal-silk.alilinlab.com

   The four values below came from Claude Vision's reading of your source
   image, plus any slider you moved afterwards. They are the whole payload:
   the GLSL underneath is fixed, and these numbers are what make it this
   material rather than another one.
   ──────────────────────────────────────────────────────────────────── */

/* 1. THE READING, as the tool is showing it now.
      rigidity, flow and specular are 0..1; color is linear-ish sRGB 0..1. */
const materialParams = ${params}

/* 2. USAGE — three.js. Paste the two shader sources below as strings
      (or keep them in .glsl files and import them raw).

   import * as THREE from 'three'

   const material = new THREE.ShaderMaterial({
     vertexShader:   SKELETAL_SILK_VERT,
     fragmentShader: SKELETAL_SILK_FRAG,
     uniforms,
     side: THREE.DoubleSide,
   })
   const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 64), material)
   scene.add(mesh)

   // per frame — uTime drives the surface motion:
   material.uniforms.uTime.value = clock.getElapsedTime()

   Geometry note: the shader displaces along the vertex normal, so it needs a
   reasonably dense mesh. The icosahedron above (64 subdivisions) is what the
   live tool uses; a low-poly mesh will look faceted.

   uMouse is optional — feed it normalised cursor coords (-1..1) to dent the
   surface, or leave it at 0 for a static sample. */

/* 3. UNIFORMS — ready to drop in. The three morph slots are pinned to this
      one material so the surface renders static rather than cross-fading. */
const uniforms = {
  uDim:         { value: 1 },
  uLight:       { value: new THREE.Vector3(${light.join(", ")}) },
  uLightIntensity: { value: ${intensity} },
  uTime:        { value: 0 },
  uRigidity:    { value: ${rigidity} },
  uFlow:        { value: ${flow} },
  uSpecular:    { value: ${specular} },
  uColor:       { value: new THREE.Vector3(${v3}) },
  uMouse:       { value: new THREE.Vector2(0, 0) },
  uMouseRadius: { value: 1.4 },
  uMorphCycle:  { value: 0 },
  uRigidity2:   { value: ${rigidity} },
  uFlow2:       { value: ${flow} },
  uColor2:      { value: new THREE.Vector3(${v3}) },
  uRigidity3:   { value: ${rigidity} },
  uFlow3:       { value: ${flow} },
  uColor3:      { value: new THREE.Vector3(${v3}) },
}

/* ═══════════════════════ 4. VERTEX SHADER ═══════════════════════ */
const SKELETAL_SILK_VERT = \`
${vertGLSL.trim()}
\`

/* ══════════════════════ 5. FRAGMENT SHADER ══════════════════════ */
const SKELETAL_SILK_FRAG = \`
${fragGLSL.trim()}
\`

export { materialParams, uniforms, SKELETAL_SILK_VERT, SKELETAL_SILK_FRAG }
`;
}

export default function ExportShader() {
  const [state, setState] = useState("idle");
  const primary = useStore(selectPrimary);
  // The export's own file says these values came from Claude's reading. Until
  // one has landed that is untrue, and on cold start it exported the opening
  // cotton set under exactly that sentence. The button is the honest place to
  // stop it, because the alternative is a file that lies about its contents
  // once it is out of the tool and nothing here can correct it.
  const read = hasReading(primary);
  const { rigidity, flow, specular, color } = primary.params;

  const handleExport = useCallback(async () => {
    const { light, intensity } = useInstrument.getState();
    const text = buildExport(
      { rigidity, flow, specular, color },
      light,
      intensity,
    );
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // Clipboard can be blocked (permissions, insecure context) — fall back
      // to a download so the export never silently fails.
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "skeletal-silk-material.glsl.js";
      a.click();
      URL.revokeObjectURL(url);
      setState("downloaded");
    }
    setTimeout(() => setState("idle"), 2200);
  }, [rigidity, flow, specular, color]);

  return (
    <div className="export-dock">
      <button className="export-btn" onClick={handleExport} disabled={!read}>
        {state === "copied"
          ? "Copied to clipboard"
          : state === "downloaded"
            ? "Downloaded"
            : "Export shader"}
      </button>
      <div className="export-hint">
        {read
          ? "Includes your material and lighting."
          : "Available after a material reading."}
      </div>
    </div>
  );
}
