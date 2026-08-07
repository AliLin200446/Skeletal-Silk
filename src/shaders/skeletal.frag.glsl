uniform float uSpecular;
uniform vec3  uColor;
uniform float uRigidity;
uniform float uTime;
uniform float uDim;

varying vec3  vNormal;
varying vec3  vPosition;
varying float vBone;
varying vec2  vUv;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vPosition);

  // Key light. Wrapped diffuse rather than plain Lambert: a hard terminator
  // is how a planet lit by a sun reads. Cloth in a studio falls off softly.
  vec3 L1 = normalize(vec3(-0.95, 0.55, 0.30));
  vec3 H1 = normalize(L1 + V);
  float wrap = 0.18;
  float d1 = max((dot(N, L1) + wrap) / (1.0 + wrap), 0.0);
  // Satin reads as a broad sheen band, not a pinpoint.
  float s1 = pow(max(dot(N, H1), 0.0), 8.0 + uSpecular * 46.0);

  // Opposing fill, strong enough that the far side stays a material rather
  // than falling to black like a crescent moon.
  vec3 L2 = normalize(vec3(0.9, -0.35, -0.4));
  float d2 = max((dot(N, L2) + wrap) / (1.0 + wrap), 0.0) * 0.20;

  // Sheen at grazing angles — the second half of how silk announces itself.
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.2) * (0.14 + 0.30 * uSpecular);

  // Bone vs silk zones. Gated on rigidity to match the vertex displacement,
  // so a soft material keeps its own colour instead of going chalky ivory.
  float bone = vBone * uRigidity * smoothstep(0.35, 0.90, uRigidity);
  float silk = 1.0 - bone;

  // Silk iridescence — thin film on non-bone areas
  float cosTheta = dot(N, V);
  float t = cosTheta * 6.28318;
  vec3 ird = vec3(
    0.5 + 0.5 * cos(t + 0.0),
    0.5 + 0.5 * cos(t + 2.094),
    0.5 + 0.5 * cos(t + 4.189)
  );
  // Kept to a whisper. At half strength this dominated the surface and
  // turned every material grey-purple regardless of its detected colour.
  vec3 silkSheen = mix(vec3(1.0), ird, silk * uSpecular * 0.10);

  vec3 colorMix = uColor;
  // The detected colour arrives in sRGB. Lighting happens in linear space and
  // the result is gamma-encoded on the way out, so using it raw brightened
  // every material twice — oxblood leather rendered as pale grey-pink.
  colorMix = pow(colorMix, vec3(2.2));

  // Rigidity changes the surface relief, not the material's colour. This
  // previously blended toward a hardcoded ivory "bone" tone, which washed
  // oxblood leather out to near-white as rigidity rose — a leftover from the
  // bone-through-silk concept, and wrong for a tool that reports a colour.
  // Ridge crests just catch slightly more light, in the detected hue.
  vec3 silkColor = colorMix * silkSheen;
  vec3 baseColor = silkColor * (1.0 + bone * 0.30);

  // Lighting assembly — keep shadows dark
  vec3 ambient = baseColor * 0.05;
  vec3 diffuse = baseColor * pow(d1, 1.25) * 1.00;
  vec3 fill    = baseColor * d2;
  // Highlight no longer whitens with rigidity (another bone-era leftover): a
  // crusty surface catches the key on every ridge, so that turned dark
  // materials into white rock. Damped on rough surfaces for the same reason.
  vec3 spec    = mix(colorMix * 0.3 + 0.7, vec3(1.0), 0.35)
                 * s1 * uSpecular * 0.60 * (1.0 - bone * 0.55);
  vec3 rimCol  = mix(colorMix, vec3(0.9, 0.9, 1.0), 0.35) * rim;

  vec3 col = ambient + diffuse + fill + spec + rimCol;

  // Subtle time-based breathing on specular only
  col += spec * sin(uTime * 0.4) * 0.03;

  // Gamma
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));

  // Unselected layers fall back rather than disappear. Applied after gamma so
  // it reads as a display-space fade, and multiplied toward black instead of
  // using alpha, which would need transparency sorting across six meshes.
  col *= uDim;

  gl_FragColor = vec4(col, 1.0);
}
