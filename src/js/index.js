import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import {
  setup,
  updateVelocities,
  boids,
  masterBoid,
  camera,
  fires,
} from "./boids";
import { setupEnv, boundLights } from "./env";
let Stats = require("stats.js");
let scene, renderer, composer, finalComposer, clock, stats;

init().then(() => {
  setupRenderer();
  animate();
  resize();
  d3.select(window).on("resize", resize);
});

function init() {
  // Setup scene
  scene = new THREE.Scene();
  const setupPromise = setup(20);
  setupEnv();

  // Setup audio
  let audioHandler = (e) => {
    document.removeEventListener(e.type, audioHandler);
    d3.select("#intro").classed("hide", true);
    let listener = new THREE.AudioListener();
    camera.add(listener);
    let sound = new THREE.Audio(listener);
    let audioLoader = new THREE.AudioLoader();
    audioLoader.load("./assets/sounds/ambient.mp3", function (buffer) {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setLoopEnd(66);
      sound.setVolume(1);
      sound.play();
    });
  };
  document.addEventListener("pointerdown", audioHandler);

  // Initialize clock for flame
  clock = new THREE.Clock();

  // Setup framerate stats
  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  // Setup bloom layer
  let bloomLayer = new THREE.Layers();
  bloomLayer.set(1);

  return setupPromise;
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, maxLights: 100 });
  document.body.appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.1
  );
  composer.addPass(bloomPass);
  const customPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        resolution: {
          value: [
            document.body.offsetWidth * window.devicePixelRatio,
            document.body.offsetHeight * window.devicePixelRatio,
          ],
        },
        baseTexture: { value: null },
        time: {value: 2.5}
      },
      vertexShader: `
      varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}
      `,
      fragmentShader: `
      uniform sampler2D baseTexture;
      uniform float time;
      uniform vec2 resolution;
			varying vec2 vUv;
      
      const float SAMPLES = 24.; 

      float hash( vec2 p ){ return fract(sin(dot(p, vec2(41, 289)))*45758.5453); }

      vec3 lOff(){    
          
          vec2 u = sin(vec2(1.57, 0));
          mat2 a = mat2(u, -u.y, u.x);
          
          vec3 l = normalize(vec3(1.5, 1., -0.5));
          l.xz = a * l.xz;
          l.xy = a * l.xy;
          
          return l;
          
      }

      void main(){
          
          // Screen coordinates.
          vec2 uv = vUv.xy / resolution.xy;

          // Radial blur factors.
          //
          // Falloff, as we radiate outwards.
          float decay = 0.97; 
          // Controls the sample density, which in turn, controls the sample spread.
          float density = 0.5; 
          // Sample weight. Decays as we radiate outwards.
          float weight = 0.1; 
          
          // Light offset. Kind of fake. See above.
          vec3 l = lOff();
          
          // Offset texture position (uv - .5), offset again by the fake light movement.
          // It's used to set the blur direction (a direction vector of sorts), and is used 
          // later to center the spotlight.
          //
          // The range is centered on zero, which allows the accumulation to spread out in
          // all directions. Ie; It's radial.
          vec2 tuv =  uv - .5 - l.xy*.45;
          
          // Dividing the direction vector above by the sample number and a density factor
          // which controls how far the blur spreads out. Higher density means a greater 
          // blur radius.
          vec2 dTuv = tuv*density/SAMPLES;
          
          // Grabbing a portion of the initial texture sample. Higher numbers will make the
          // scene a little clearer, but I'm going for a bit of abstraction.
          vec4 col = texture2D(baseTexture, uv.xy)*0.25;
          
          // Jittering, to get rid of banding. Vitally important when accumulating discontinuous 
          // samples, especially when only a few layers are being used.
          uv += dTuv*(hash(uv.xy + fract(time))*2. - 1.);
          
          // The radial blur loop. Take a texture sample, move a little in the direction of
          // the radial direction vector (dTuv) then take another, slightly less weighted,
          // sample, add it to the total, then repeat the process until done.
          for(float i=0.; i < SAMPLES; i++){
          
              uv -= dTuv;
              col += texture2D(baseTexture, uv.xy) * weight;
              weight *= decay;
              
          }
          
          // Multiplying the final color with a spotlight centered on the focal point of the radial
          // blur. It's a nice finishing touch... that Passion came up with. If it's a good idea,
          // it didn't come from me. :)
          col *= (1. - dot(tuv, tuv)*.75);
          
          // Smoothstepping the final color, just to bring it out a bit, then applying some 
          // loose gamma correction.
          gl_FragColor = sqrt(smoothstep(0., 1., col));
          
          // Bypassing the radial blur to show the raymarched scene on its own.
          //fragColor = sqrt(texture(iChannel0, fragCoord.xy / iResolution.xy));
      }
      `,
      defines: {},
    }),
    "baseTexture"
  );
  // composer.addPass(customPass);
}

function resize() {
  camera.aspect = document.body.offsetWidth / document.body.offsetHeight;
  camera.updateProjectionMatrix();
  [renderer, composer].forEach((forSizing) => {
    forSizing.setSize(
      document.body.offsetWidth * window.devicePixelRatio,
      document.body.offsetHeight * window.devicePixelRatio,
      false
    );
  });
}

function animate() {
  stats.begin();
  updateVelocities();
  [...boids, masterBoid].forEach((boid, index) => {
    let newPos = new THREE.Vector3().addVectors(
      boid.position,
      boid.userData.velocity
    );
    boid.lookAt(newPos);
    boid.position.add(boid.userData.velocity);
    // if (lights[index]) {
    //   lights[index].position.set(...boid.position.toArray());
    //   lights[index].target.position.set(
    //     ...new THREE.Vector3()
    //       .addVectors(
    //         boid.position,
    //         boid.userData.velocity.clone().multiplyScalar(20)
    //       )
    //       .toArray()
    //   );
    // }
  });

  fires.forEach((fire) => {
    clock.getDelta();
    fire.update(clock.elapsedTime * 10);
  });

  boundLights.forEach((light, i) => {
    light.intensity = Math.abs(Math.sin(10 * i + clock.elapsedTime));
  });

  composer.render();

  stats.end();

  requestAnimationFrame(animate);
}

export { scene };
