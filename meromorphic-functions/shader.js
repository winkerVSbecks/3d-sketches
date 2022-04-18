const glsl = require('glslify');

export const vert = glsl(/* glsl */ `#version 300 es
  precision highp float;
  in vec3 position;

  void main () {
    gl_Position = vec4(position.xyz, 1.0);
  }
`);

export const frag = glsl(/* glsl */ `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_col_1;
  uniform vec3 u_col_2;
  uniform vec3 u_col_3;
  uniform vec3 u_col_4;
  // Define our points
  uniform vec2 u_a0;
  uniform vec2 u_a1;
  uniform vec2 u_a2;
  uniform vec2 u_a3;
  uniform vec2 u_b0;
  uniform vec2 u_b1;
  uniform vec2 u_b2;
  uniform vec2 u_b3;

  uniform int u_colorMode;

  #define PI 3.1415926535897932384626433832795

  #define cx_mul(a, b) vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x)
  #define cx_div(a, b) vec2(((a.x*b.x + a.y*b.y)/(b.x*b.x + b.y*b.y)),((a.y*b.x - a.x*b.y)/(b.x*b.x + b.y*b.y)))
  #define cx_sin(a) vec2(sin(a.x) * cosh(a.y), cos(a.x) * sinh(a.y))
  #define cx_cos(a) vec2(cos(a.x) * cosh(a.y), -sin(a.x) * sinh(a.y))

  vec2 cx_tan(vec2 a) {return cx_div(cx_sin(a), cx_cos(a)); }
  vec2 cx_log(vec2 a) {
      float rpart = sqrt((a.x*a.x)+(a.y*a.y));
      float ipart = atan(a.y,a.x);
      if (ipart > PI) ipart=ipart-(2.0*PI);
      return vec2(log(rpart),ipart);
  }

  vec2 as_polar(vec2 z) {
    return vec2(
      length(z),
      atan(z.y, z.x)
    );
  }
  vec2 cx_pow(vec2 v, float p) {
    vec2 z = as_polar(v);
    return pow(z.x, p) * vec2(cos(z.y * p), sin(z.y * p));
  }

  float im(vec2 z) {
    return ((atan(z.y, z.x) / PI) + 1.0) * 0.5;
  }

  vec3 blend( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return mix(mix(a, b, t), mix(c, d, t), t);
  }

  vec3 soft( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return a*sin(2.*PI*(c*t)) + b*cos(2.*PI*(d*t));
  }

  vec3 tangent( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return a + b*tan(2.*PI*(c*t+d));
  }

  vec3 ntsc( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    vec3 k1 = b * cos(2.* PI * (c * t + d));
    vec3 k2 = b * sin(2.* PI * (c * t + d));
    vec3 k3 = b * tan(2.* PI * (c * t + d));
    return a + vec3(k1.x, k2.y, k3.z);
  }

  vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return mix(a, b, t);
  }

  void main() {
      // Set up our imaginary plane
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
      vec2 z = uv * 2.;

      // Calculate the sum of our first polynomial
      vec2 polyA = u_a0
          + cx_mul(u_a1, z)
          + cx_mul(u_a2, cx_pow(z, 2.0))
          + cx_mul(u_a3, cx_pow(z, 3.0));

      // Calculate the sum of our second polynomial
      vec2 polyB = u_b0
          + cx_mul(u_b1, z)
          + cx_mul(u_b2, cx_pow(z, 2.))
          + cx_mul(u_b3, cx_pow(z, 3.));

      // Calculate the ratio of our complex polynomials
      vec2 result = cx_div(polyA, polyB);

      float imaginary = cx_log(result).y;
      float col = (imaginary / PI);

      if (u_colorMode == 0) {
        fragColor = vec4(pal(col, u_col_1, u_col_2, u_col_3, u_col_4),1.0);
      } else if (u_colorMode == 1) {
        fragColor = vec4(blend(col, u_col_1, u_col_2, u_col_3, u_col_4),1.0);
      } else if (u_colorMode == 2) {
        fragColor = vec4(ntsc(col, u_col_1, u_col_2, u_col_3, u_col_4),1.0);
      } else if (u_colorMode == 3) {
        fragColor = vec4(soft(col, u_col_1, u_col_2, u_col_3, u_col_4),1.0);
      } else if (u_colorMode == 4) {
        fragColor = vec4(tangent(col, u_col_1, u_col_2, u_col_3, u_col_4),1.0);
      }
  }
`);
