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
let Stats = require("stats.js");
let scene, renderer, composer, clock, stats;

init();
animate();
resize();
d3.select(window).on("resize", resize);

function init() {
  // Setup renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  document.body.appendChild(renderer.domElement);

  // Setup scene
  scene = new THREE.Scene();
  setup(10);

  // Setup audio
  let audioHandler = (e) => {
    document.removeEventListener(e.type, audioHandler);
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

  // Reference grid
  var gridHelper = new THREE.GridHelper(200, 200);
  scene.add(gridHelper);

  // Post processing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new AfterimagePass(0.6));
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5,
      0.1,
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

  [...boids, masterBoid].forEach((boid) => {
    let newPos = new THREE.Vector3().addVectors(
      boid.position,
      boid.userData.velocity
    );
    boid.lookAt(newPos);
    boid.position.add(boid.userData.velocity);
  });
  fires.forEach((fire) => {
    var delta = clock.getDelta();
    var t = clock.elapsedTime * 10;
    fire.update(t);
  });
  stats.end();

  composer.render();

  requestAnimationFrame(animate);
}

export { scene };