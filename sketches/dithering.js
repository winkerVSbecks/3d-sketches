// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');
const load = require('load-asset');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const Random = require('canvas-sketch-util/random');
const canvasSketch = require('canvas-sketch');
const packSpheres = require('pack-spheres');
const glslify = require('glslify');

const settings = {
  scaleToView: true,
  dimensions: [1080, 1080],
  context: 'webgl2',
  animate: true,
  duration: 6,
};

const sketch = ({ context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas,
  });

  const background = new THREE.Color('#fff');

  // WebGL background color
  renderer.setClearColor(background, 1);

  // Setup a camera
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(2, 2, -2);
  camera.lookAt(new THREE.Vector3());

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas);

  // Setup your scene
  const scene = new THREE.Scene();

  // Setup a geometry
  const geometry = new THREE.IcosahedronBufferGeometry(1, 3);

  const bounds = 1.5;
  const spheres = packSpheres({
    sample: () => Random.insideSphere(),
    outside: (position, radius) => {
      return (
        new THREE.Vector3().fromArray(position).length() + radius >= bounds
      );
    },
    minRadius: () =>
      Math.max(0.05, 0.05 + Math.min(1.0, Math.abs(Random.gaussian(0, 0.1)))),
    maxCount: 20,
    packAttempts: 4000,
    bounds,
    maxRadius: 1.5,
    minRadius: 0.05,
  });

  const meshes = spheres.map((sphere) => {
    // Setup a material
    const material = new THREE.ShaderMaterial({
      transparent: true,
      extensions: {
        derivatives: true,
      },
      glslVersion: THREE.GLSL3,
      uniforms: {
        resolution: { type: 'v2', value: new THREE.Vector2() },
        bgl_RenderedTexture: {
          type: 't',
          value: new THREE.TextureLoader().load('textures/texture.png'),
        },
        bayerTexture: { type: 't', value: getBayerTexture() },
        time: { type: 'f', value: 1.0 },
        // time: { value: 0 },
      },
      vertexShader: /*glsl*/ `
      varying vec2 vUv;

      void main () {
        // vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vUv = gl_Position.xy * 0.5 + 0.5;
      }
      `,
      fragmentShader: glslify(/* glsl */ `
        float luma(vec3 color) {
          return dot(color, vec3(0.299, 0.587, 0.114));
        }

        float luma(vec4 color) {
          return dot(color.rgb, vec3(0.299, 0.587, 0.114));
        }

        // from https://github.com/hughsk/glsl-dither
        float dither8x8(vec2 position, float brightness) {
          int x = int(mod(position.x, 8.0));
          int y = int(mod(position.y, 8.0));
          int index = x + y * 8;
          float limit = 0.0;


          if (x &lt; 8) {
            if (index == 0) limit = 0.015625;
            if (index == 1) limit = 0.515625;
            if (index == 2) limit = 0.140625;
            if (index == 3) limit = 0.640625;
            if (index == 4) limit = 0.046875;
            if (index == 5) limit = 0.546875;
            if (index == 6) limit = 0.171875;
            if (index == 7) limit = 0.671875;
            if (index == 8) limit = 0.765625;
            if (index == 9) limit = 0.265625;
            if (index == 10) limit = 0.890625;
            if (index == 11) limit = 0.390625;
            if (index == 12) limit = 0.796875;
            if (index == 13) limit = 0.296875;
            if (index == 14) limit = 0.921875;
            if (index == 15) limit = 0.421875;
            if (index == 16) limit = 0.203125;
            if (index == 17) limit = 0.703125;
            if (index == 18) limit = 0.078125;
            if (index == 19) limit = 0.578125;
            if (index == 20) limit = 0.234375;
            if (index == 21) limit = 0.734375;
            if (index == 22) limit = 0.109375;
            if (index == 23) limit = 0.609375;
            if (index == 24) limit = 0.953125;
            if (index == 25) limit = 0.453125;
            if (index == 26) limit = 0.828125;
            if (index == 27) limit = 0.328125;
            if (index == 28) limit = 0.984375;
            if (index == 29) limit = 0.484375;
            if (index == 30) limit = 0.859375;
            if (index == 31) limit = 0.359375;
            if (index == 32) limit = 0.0625;
            if (index == 33) limit = 0.5625;
            if (index == 34) limit = 0.1875;
            if (index == 35) limit = 0.6875;
            if (index == 36) limit = 0.03125;
            if (index == 37) limit = 0.53125;
            if (index == 38) limit = 0.15625;
            if (index == 39) limit = 0.65625;
            if (index == 40) limit = 0.8125;
            if (index == 41) limit = 0.3125;
            if (index == 42) limit = 0.9375;
            if (index == 43) limit = 0.4375;
            if (index == 44) limit = 0.78125;
            if (index == 45) limit = 0.28125;
            if (index == 46) limit = 0.90625;
            if (index == 47) limit = 0.40625;
            if (index == 48) limit = 0.25;
            if (index == 49) limit = 0.75;
            if (index == 50) limit = 0.125;
            if (index == 51) limit = 0.625;
            if (index == 52) limit = 0.21875;
            if (index == 53) limit = 0.71875;
            if (index == 54) limit = 0.09375;
            if (index == 55) limit = 0.59375;
            if (index == 56) limit = 1.0;
            if (index == 57) limit = 0.5;
            if (index == 58) limit = 0.875;
            if (index == 59) limit = 0.375;
            if (index == 60) limit = 0.96875;
            if (index == 61) limit = 0.46875;
            if (index == 62) limit = 0.84375;
            if (index == 63) limit = 0.34375;
          }


          return brightness &lt; limit ? 0.0 : 1.0;
        }


        vec3 dither8x8(vec2 position, vec3 color) {
          return color * dither8x8(position, luma(color));
        }


        vec4 dither8x8(vec2 position, vec4 color) {
          return vec4(color.rgb * dither8x8(position, luma(color)), 1.0);
        }
        //


        uniform sampler2D bgl_RenderedTexture;


        void main(void)
        {
            vec4 color = texture2D(bgl_RenderedTexture, gl_TexCoord[0].st);
            float avg = (color.r + color.g + color.b) / 3.0;

            vec4 tint = vec4(avg, avg, avg, color.a) * vec4(0.716, 0.8909, 0.1675, 1.0);
            vec4 final = dither8x8(gl_FragCoord.xy, tint);
            gl_FragColor = final;
        }
      `),
    });

    // Setup a mesh with geometry + material
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(sphere.position);
    mesh.scale.setScalar(sphere.radius);
    mesh.quaternion.fromArray(Random.quaternion());
    mesh.rotationSpeed = Random.rangeFloor(1, 2) * (Math.PI * 2);
    scene.add(mesh);
    return mesh;
  });

  // draw each frame
  return {
    // Handle resize events here
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight, false);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },
    // Update & render your scene here
    render({ playhead, duration, deltaTime }) {
      // meshes.forEach((mesh) => {
      //   mesh.material.uniforms.time.value = playhead;
      // });

      scene.rotation.y = playhead * Math.PI * 2;
      controls.update();
      renderer.render(scene, camera);
    },
    // Dispose of events & renderer for cleaner hot-reloading
    unload() {
      controls.dispose();
      renderer.dispose();
    },
  };
};

canvasSketch(sketch, settings);

function getBayerTexture() {
  var canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 4;

  var context = canvas.getContext('2d');
  var image = context.getImageData(0, 0, canvas.width, canvas.height);

  var data = [
    [1, 9, 3, 11],
    [13, 5, 15, 7],
    [4, 12, 2, 10],
    [16, 8, 14, 6],
  ];

  var x = 0,
    y = -1;

  for (var i = 0, j = 0, l = image.data.length; i < l; i += 4, j++) {
    x = j % canvas.width;
    y = x == 0 ? y + 1 : y;

    var norm = Math.floor((255.0 * data[y][x]) / 17.0);

    image.data[i] = norm;
    image.data[i + 1] = norm;
    image.data[i + 2] = norm;
    image.data[i + 3] = norm;
  }

  context.putImageData(image, 0, 0);
  var texture = new THREE.Texture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;

  return texture;
}
