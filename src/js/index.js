import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  setup,
  updateVelocities,
  boids,
  masterBoid,
  camera,
  fires,
} from "./boids";
import { setupEnv, lights } from "./env";
let Stats = require("stats.js");
let scene, renderer, composer, clock, stats;

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

  //   // Reference grid
  //   var gridHelper = new THREE.GridHelper(200, 200);
  //   scene.add(gridHelper);

  return setupPromise;
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, maxLights: 100 });
  document.body.appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new AfterimagePass(0.6));
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.2,
      1,
      0.6
    )
  );
}

function resize() {
  camera.aspect = document.body.offsetWidth / document.body.offsetHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(
    document.body.offsetWidth * window.devicePixelRatio,
    document.body.offsetHeight * window.devicePixelRatio,
    false
  );
  composer.setSize(
    document.body.offsetWidth * window.devicePixelRatio,
    document.body.offsetHeight * window.devicePixelRatio,
    false
  );
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
    if (lights[index]) {
      lights[index].position.set(...boid.position.toArray());
      lights[index].target.position.set(
        ...new THREE.Vector3()
          .addVectors(
            boid.position,
            boid.userData.velocity.clone().multiplyScalar(20)
          )
          .toArray()
      );
    }
  });

  fires.forEach((fire) => {
    clock.getDelta();
    fire.update(clock.elapsedTime * 10);
  });

  composer.render();

  stats.end();

  requestAnimationFrame(animate);
}

export { scene };
