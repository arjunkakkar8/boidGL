import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import {
  setup,
  updateVelocities,
  updateCameraAngle,
  boids,
  masterBoid,
  camera,
  fires,
} from "./boids";
import { setupEnv, boundLights } from "./env";

let Stats = require("stats.js");

let scene, renderer, composer, depthRenderTarget, shaderPass, clock, stats;

let previousMatrixWorldInverse = new THREE.Matrix4(),
  previousProjectionMatrix = new THREE.Matrix4();

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

  depthRenderTarget = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight
  );
  depthRenderTarget.depthBuffer = true;
  depthRenderTarget.depthTexture = new THREE.DepthTexture();
  renderer.setRenderTarget(depthRenderTarget);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.1
  );
  composer.addPass(bloomPass);
  shaderPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        depthTexture: { value: null },
        cameraNear: { value: 0 },
        cameraFar: { value: 0 },
        clipToWorldMatrix: { type: "m4", value: new THREE.Matrix4() },
        previousWorldToClipMatrix: { type: "m4", value: new THREE.Matrix4() },
      },
      vertexShader: `
      varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}
      `,
      fragmentShader: `
      #include <packing>
      #define VELOCITY_FACTOR .4
      varying vec2 vUv;
      
      uniform sampler2D baseTexture;
      uniform sampler2D depthTexture;
      uniform float cameraNear;
      uniform float cameraFar;
      uniform mat4 clipToWorldMatrix;
      uniform mat4 previousWorldToClipMatrix;
    
			void main() {
        float zOverW = texture2D( depthTexture, vUv ).x ;
        vec4 clipPosition = vec4(vUv.x * 2.0 - 1.0, vUv.y * 2.0 - 1.0, zOverW * 2.0 - 1.0, 1.0);

        vec4 worldPosition = clipToWorldMatrix * clipPosition;
        worldPosition /= worldPosition.w;

        vec4 previousClipPosition = previousWorldToClipMatrix * worldPosition;
        previousClipPosition /= previousClipPosition.w;

        vec2 velocity = VELOCITY_FACTOR * (clipPosition - previousClipPosition).xy;
        vec4 finalColor = vec4(0.);
        
        vec2 offset = vec2(0.);
        const int samples = 10;
        for(int i = 0; i < samples; i++) {
          offset = velocity * (float(i) / (float(samples) - 1.) - .5);
          finalColor += texture2D(baseTexture, vUv + offset);
        }
        finalColor /= float(samples);
        gl_FragColor = vec4(finalColor.rgb, 1.);
			}
      `,
    })
  );
  shaderPass.uniforms.cameraNear.value = camera.near;
  shaderPass.uniforms.cameraFar.value = camera.far;
  shaderPass.uniforms.baseTexture.value = composer.renderTarget1.texture;
  shaderPass.uniforms.depthTexture.value = depthRenderTarget.depthTexture;
  shaderPass.renderToScreen = false;
  composer.addPass(shaderPass);
}

function resize() {
  camera.aspect = document.body.offsetWidth / document.body.offsetHeight;
  camera.updateProjectionMatrix();
  [renderer, composer, depthRenderTarget].forEach((forSizing) => {
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
  updateCameraAngle();
  [...boids, masterBoid].forEach((boid, index) => {
    let newPos = new THREE.Vector3().addVectors(
      boid.position,
      boid.userData.velocity
    );
    boid.lookAt(newPos);
    boid.position.add(boid.userData.velocity);
  }); 

  fires.forEach((fire) => {
    clock.getDelta();
    fire.update(clock.elapsedTime * 10);
  });

  boundLights.forEach((light, i) => {
    light.intensity = Math.abs(Math.sin(10 * i + clock.elapsedTime));
  });

  renderer.render(scene, camera);

  shaderPass.uniforms.clipToWorldMatrix.value
    .getInverse(camera.matrixWorldInverse)
    .multiply(new THREE.Matrix4().getInverse(camera.projectionMatrix));
  shaderPass.uniforms.previousWorldToClipMatrix.value.copy(
    previousProjectionMatrix.multiply(previousMatrixWorldInverse)
  );

  composer.render();

  previousMatrixWorldInverse.copy(camera.matrixWorldInverse);
  previousProjectionMatrix.copy(camera.projectionMatrix);

  stats.end();

  requestAnimationFrame(animate);
}

export { scene };
