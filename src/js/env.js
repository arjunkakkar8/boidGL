import * as THREE from "three";
import { scene } from "./index";
import { boundSize } from "./boids";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

let lights = [],
  boundLights = [];

const boundLightParams = [
  {
    color: 0xffffff,
    pos: [boundSize * 1.5, 0, 75],
    look: [0, 0, 75],
    size: [75, 175],
  },
  {
    color: 0xffffff,
    pos: [boundSize * 1.5, 0, -75],
    look: [0, 0, -75],
    size: [75, 175],
  },
  {
    color: 0xffffff,
    pos: [-boundSize * 1.5, 0, 75],
    look: [0, 0, 75],
    size: [75, 175],
  },
  {
    color: 0xffffff,
    pos: [-boundSize * 1.5, 0, -75],
    look: [0, 0, -75],
    size: [75, 175],
  },
  {
    color: 0xffffff,
    pos: [75, 0, boundSize * 1.5],
    look: [75, 0, 0],
    size: [75, 175],
  },
  {
    color: 0xffffff,
    pos: [-75, 0, boundSize * 1.5],
    look: [-75, 0, 0],
    size: [75, 175],
  },
  {
    color: 0xffffff,
    pos: [75, 0, -boundSize * 1.5],
    look: [75, 0, 0],
    size: [75, 175],
  },
  {
    color: 0xffffff,
    pos: [-75, 0, -boundSize * 1.5],
    look: [-75, 0, 0],
    size: [75, 175],
  },
  {
    color: 0x7eb0ff,
    pos: [0, boundSize * 1.5, 0],
    look: [0, 0, 0],
    size: [150, 150],
  },
  {
    color: 0xed9898,
    pos: [0, -boundSize * 1.5, 0],
    look: [0, 0, 0],
    size: [150, 150],
  },
];

function setupEnv() {
  let ambiLight = new THREE.AmbientLight(0xe8e8e8, 1);
  scene.add(ambiLight);
  //   boidLights();
  boundaryLights();
}

function boundaryLights() {
  RectAreaLightUniformsLib.init();
  for (let i = 0; i < 10; i++) {
    let boundLight = new THREE.RectAreaLight(
      boundLightParams[i].color,
      0.3,
      ...boundLightParams[i].size
    );
    let position = [];
    boundLight.position.set(...boundLightParams[i].pos);
    boundLight.lookAt(...boundLightParams[i].look);
    boundLight.userData.velocity = new THREE.Vector3();
    let rectLightMesh = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide })
    );
    rectLightMesh.scale.x = boundLight.width;
    rectLightMesh.scale.y = boundLight.height;
    rectLightMesh.material.color
      .copy(boundLight.color)
      .multiplyScalar(boundLight.intensity);
    boundLight.add(rectLightMesh);
    scene.add(boundLight);
    boundLights.push(boundLight);
  }
}

// function boidLights() {
//   for (let i = 0; i < 2; i++) {
//     var light = new THREE.SpotLight(0xff4ec8, 0.5);
//     light.angle = Math.PI;
//     light.penumbra = 1;
//     light.decay = 0.2;
//     light.distance = 50;
//     light.position.set(0, 0, 0);
//     light.target.position.set(0, 0, 0);
//     scene.add(light);
//     scene.add(light.target);
//     lights.push(light);
//   }
// }

export { setupEnv, boundLights };
