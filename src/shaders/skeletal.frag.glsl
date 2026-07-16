uniform float uSpecular;
uniform vec3  uColor;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform float uRigidity;
uniform float uTime;
uniform float uMorphCycle;

varying vec3  vNormal;
varying vec3  vPosition;
varying float vBone;
varying vec2  vUv;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vPosition);

  // Key light
  vec3 L1 = normalize(vec3(-1.0, 1.0, 0.5));
  vec3 H1 = normalize(L1 + V);
  float d1 = max(dot(N, L1), 0.0);
  float s1 = pow(max(dot(N, H1), 0.0), 16.0 + uSpecular * 120.0);

  // Soft back fill — very dim
  vec3 L2 = normalize(vec3(1.0, -0.5, -1.0));
  float d2 = max(dot(N, L2), 0.0) * 0.06;

  // Rim light — edge glow
  float rim = pow(1.0 - max(dot(N, V), 0.0), 5.0) * 0.3 * uSpecular;

  // Bone vs silk zones
  float bone = vBone * uRigidity;
  float silk = 1.0 - bone;

  // Silk iridescence — thin film on non-bone areas
  float cosTheta = dot(N, V);
  float t = cosTheta * 6.28318;
  vec3 ird = vec3(
    0.5 + 0.5 * cos(t + 0.0),
    0.5 + 0.5 * cos(t + 2.094),
    0.5 + 0.5 * cos(t + 4.189)
  );
  vec3 silkSheen = mix(vec3(1.0), ird, silk * uSpecular * 0.5);

  float morphA = smoothstep(0.0, 0.5, uMorphCycle);
  float morphB = smoothstep(0.5, 1.0, uMorphCycle);
  vec3 colorMix = mix(uColor, mix(uColor2, uColor3, morphB), morphA);

  // Color zones: bone → ivory, silk → colorMix with sheen
  vec3 boneColor = vec3(0.82, 0.79, 0.74);
  vec3 silkColor = colorMix * silkSheen;
  vec3 baseColor = mix(silkColor, boneColor, bone * 0.8);

  // Lighting assembly — keep shadows dark
  vec3 ambient = baseColor * 0.01;
  vec3 diffuse = baseColor * pow(d1, 1.8) * 0.5;
  vec3 fill    = baseColor * d2;
  vec3 spec    = mix(colorMix * 0.3 + 0.7, vec3(1.0), bone) * s1 * uSpecular * 0.8;
  vec3 rimCol  = mix(colorMix, vec3(0.9, 0.9, 1.0), 0.5) * rim;

  vec3 col = ambient + diffuse + fill + spec + rimCol;

  // Subtle time-based breathing on specular only
  col += spec * sin(uTime * 0.4) * 0.03;

  // Gamma
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));

  gl_FragColor = vec4(col, 1.0);
}
