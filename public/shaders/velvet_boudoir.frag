// VelvetMotion 3D Penthouse Suite — Boudoir Silk & Neon Rim Fragment Shader
precision highp float;

uniform float uTime;
uniform float uIntimacy;
uniform vec3 uPrimaryColor;
uniform vec3 uAccentColor;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // Velvet Fresnel rim glow
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.6);

  // Subtle silk wave modulation driven by time and intimacy (0..1)
  float heat = clamp(uIntimacy / 100.0, 0.15, 1.0);
  float shimmer = 0.5 + 0.5 * sin(vUv.x * 14.0 + vUv.y * 9.0 + uTime * (1.2 + heat));

  vec3 baseSheen = mix(uPrimaryColor, uAccentColor, shimmer * 0.45);
  vec3 rimGlow = mix(uPrimaryColor, vec3(0.96, 0.45, 0.71), heat) * fresnel * (1.1 + heat * 0.6);

  vec3 finalColor = baseSheen * 0.55 + rimGlow;
  gl_FragColor = vec4(finalColor, 1.0);
}
