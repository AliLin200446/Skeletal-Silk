// fBm silk flow + Ridged Multifractal bone structure

uniform float uTime;
uniform float uRigidity;
uniform float uFlow;
uniform float uRigidity2;
uniform float uFlow2;
uniform float uRigidity3;
uniform float uFlow3;
uniform float uMorphCycle;
uniform vec2  uMouse;
uniform float uMouseRadius;

varying vec3  vNormal;
varying vec3  vPosition;
varying float vBone;
varying vec2  vUv;

vec3 hash3(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yxz + 19.31);
  return fract((p.xxy + p.yxx) * p.zyx);
}

float valueNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = hash3(i               ).x;
  float b = hash3(i + vec3(1,0,0) ).x;
  float c = hash3(i + vec3(0,1,0) ).x;
  float d = hash3(i + vec3(1,1,0) ).x;
  float e = hash3(i + vec3(0,0,1) ).x;
  float f1= hash3(i + vec3(1,0,1) ).x;
  float g = hash3(i + vec3(0,1,1) ).x;
  float h = hash3(i + vec3(1,1,1) ).x;
  return mix(
    mix(mix(a,b,u.x), mix(c,d,u.x), u.y),
    mix(mix(e,f1,u.x), mix(g,h,u.x), u.y),
    u.z
  );
}

float fbm(vec3 p, int octaves) {
  float val=0.0, amp=0.5, freq=1.0, total=0.0;
  for (int i=0;i<8;i++) {
    if (i>=octaves) break;
    val += valueNoise(p*freq)*amp;
    total += amp; amp*=0.5; freq*=2.13;
  }
  return val/total;
}

float ridgedMF(vec3 p, int octaves) {
  float val=0.0, amp=0.5, freq=1.0, total=0.0, prev=1.0;
  for (int i=0;i<6;i++) {
    if (i>=octaves) break;
    float n = 1.0 - abs(valueNoise(p*freq)*2.0-1.0);
    n = n*n*prev; prev=n;
    val+=n*amp; total+=amp; amp*=0.55; freq*=2.07;
  }
  return val/total;
}

float mouseBend(vec3 pos) {
  float dist = length(pos.xy - uMouse*uMouseRadius);
  return (1.0 - smoothstep(0.0, uMouseRadius, dist)) * 0.12;
}

// Cloth reads as two scales at once: broad soft folds that catch the light,
// and a fine weave over the top. One low-frequency fbm plus one high.
float silkHeight(vec3 p, float t, float flowMix) {
  vec3 pFold  = p*1.7 + vec3(t*0.40, t*0.25, t*0.15);
  vec3 pWeave = p*7.5 + vec3(t*0.50, t*0.30, t*0.20);
  float fold  = (fbm(pFold, 4) - 0.5) * 0.115;
  float weave = (fbm(pWeave, 3) - 0.5) * 0.020;
  return (fold + weave) * flowMix;
}

// The ridged term is the rigid structure. Gated on rigidity so soft
// materials stay smooth and only stiff ones crust up — the parameter
// response stays visible without rendering silk as cratered rock.
float boneSharpness(vec3 p, float t, float rigidMix) {
  vec3 pBone = p*5.0 + vec3(t*0.1, -t*0.08, t*0.2);
  return pow(ridgedMF(pBone, 5), 1.5 + rigidMix*2.0);
}

// Displacement and its finite-difference normals must use identical maths,
// so both go through this one function.
float surfaceHeight(vec3 p, float t, float flowMix, float rigidMix) {
  float gate = smoothstep(0.35, 0.90, rigidMix);
  return silkHeight(p, t, flowMix)
       + boneSharpness(p, t, rigidMix) * gate * 0.16
       + mouseBend(p);
}

void main() {
  vUv = uv;
  vec3 pos = position;
  // Interpolate flow across 3 states based on morph cycle
  float morphA = smoothstep(0.0, 0.5, uMorphCycle);
  float morphB = smoothstep(0.5, 1.0, uMorphCycle);
  float flowMix    = mix(uFlow,    mix(uFlow2,    uFlow3,    morphB), morphA);
  float rigidMix   = mix(uRigidity,mix(uRigidity2,uRigidity3,morphB), morphA);
  float t = uTime*(0.3+flowMix*0.7);

  pos += normal * surfaceHeight(position, t, flowMix, rigidMix);

  vBone = boneSharpness(position, t, rigidMix);
  vPosition = pos;

  float eps = 0.008;
  vec3 px = position+vec3(eps,0,0);
  vec3 py = position+vec3(0,eps,0);
  vec3 dispX = px + normal*surfaceHeight(px, t, flowMix, rigidMix);
  vec3 dispY = py + normal*surfaceHeight(py, t, flowMix, rigidMix);
  vNormal = normalize(cross(dispX-pos, dispY-pos));

  gl_Position = projectionMatrix*modelViewMatrix*vec4(pos,1.0);
}
