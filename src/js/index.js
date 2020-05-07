import * as THREE from "three";
import { setup, updateVelocities, boids, masterBoid, camera } from "./boids";
let Stats = require("stats.js");

var scene, renderer;

let stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

init();
animate();
resize();
d3.select(window).on("resize", resize);

function init() {
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ antialias: true });
  setup(100);
  document.body.appendChild(renderer.domElement);

  var gridHelper = new THREE.GridHelper(200, 200);
  scene.add(gridHelper);
}

function resize() {
  camera.aspect = document.body.offsetWidth / document.body.offsetHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(
    document.body.offsetWidth * window.devicePixelRatio,
    document.body.offsetHeight * window.devicePixelRatio,
    false
  );
}

function animate() {
  stats.begin();

  [...boids, masterBoid].forEach((boid) => {
    let newPos = new THREE.Vector3().addVectors(
      boid.position,
      boid.userData.velocity
    );
    boid.lookAt(newPos);
    boid.position.add(boid.userData.velocity);
  });
  renderer.render(scene, camera);
  updateVelocities();

  stats.end();


  requestAnimationFrame(animate);
}


export { scene };
