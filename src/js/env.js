import * as THREE from "three";
import { scene } from "./index";
import { boids } from "./boids";

let lights = [];

function setupEnv() {
  var light = new THREE.AmbientLight(0x404040, 3);
  scene.add(light);
  boidLights();
}

function boidLights() {
  for (let i = 0; i < 14; i++) {
    var light = new THREE.SpotLight(0xff4ec8, 1);
    light.angle = Math.PI;
    light.penumbra = 1;
    light.decay = 0.2;
    light.distance = 50;
    light.position.set(0, 0, 0);
    light.target.position.set(0, 0, 0);
    scene.add(light);
    scene.add(light.target);
    lights.push(light);
  }
}

export { setupEnv, lights };
