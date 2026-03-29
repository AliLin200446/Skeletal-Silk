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

void main() {
  vUv = uv;
  vec3 pos = position;
  // Interpolate flow across 3 states based on morph cycle
  float morphA = smoothstep(0.0, 0.5, uMorphCycle);
  float morphB = smoothstep(0.5, 1.0, uMorphCycle);
  float flowMix    = mix(uFlow,    mix(uFlow2,    uFlow3,    morphB), morphA);
  float rigidMix   = mix(uRigidity,mix(uRigidity2,uRigidity3,morphB), morphA);
  float t = uTime*(0.3+flowMix*0.7);
  vec3 pFlow = pos*2.2 + vec3(t*0.4, t*0.25, t*0.15);
  vec3 pBone = pos*5.0 + vec3(t*0.1, -t*0.08, t*0.2);

  float silk = fbm(pFlow, 5);
  float silkDisplace = (silk-0.5)*flowMix*0.10;
  float boneRaw = ridgedMF(pBone, 5);
  float boneSharp = pow(boneRaw, 1.5+rigidMix*2.0);
  float boneDisplace = boneSharp*rigidMix*0.14;
  float bend = mouseBend(pos);
  float totalD = silkDisplace + boneDisplace + bend;
  pos += normal*totalD;

  vBone = boneSharp;
  vPosition = pos;

  float eps = 0.008;
  vec3 px = position+vec3(eps,0,0);
  vec3 py = position+vec3(0,eps,0);
  vec3 pxFlow=px*2.2+vec3(t*0.4,t*0.25,t*0.15);
  vec3 pyFlow=py*2.2+vec3(t*0.4,t*0.25,t*0.15);
  vec3 pxBone=px*5.0+vec3(t*0.1,-t*0.08,t*0.2);
  vec3 pyBone=py*5.0+vec3(t*0.1,-t*0.08,t*0.2);
  float silkX=(fbm(pxFlow,5)-0.5)*flowMix*0.10;
  float silkY=(fbm(pyFlow,5)-0.5)*flowMix*0.10;
  float boneX=pow(ridgedMF(pxBone,5),1.5+rigidMix*2.0)*rigidMix*0.14;
  float boneY=pow(ridgedMF(pyBone,5),1.5+rigidMix*2.0)*rigidMix*0.14;
  vec3 dispX=px+normal*(silkX+boneX+mouseBend(px));
  vec3 dispY=py+normal*(silkY+boneY+mouseBend(py));
  vNormal = normalize(cross(dispX-pos, dispY-pos));

  gl_Position = projectionMatrix*modelViewMatrix*vec4(pos,1.0);
}
