import * as THREE from "three";
import { scene } from "./index";
import { Fire } from "./fire";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import cloneGltf from "./cloneGLTF";
import { Layers } from "three";

let camera, cameraVel;
let boids = [],
  fires = [],
  masterBoid,
  control = { horz: 0, vert: 0 },
  lag = { horz: 0, vert: 0 },
  pressed = false;

const boundSize = 100,
  initSpread = 100,
  minDist = 10,
  maxDist = 20,
  centroidAttr = 0.0005,
  velAttr = 0.05,
  repelAttr = 0.0005,
  controlSensitivity = 0.001,
  masterWeight = 25,
  maxVel = 0.5;

const gltfLoader = new GLTFLoader();

let loader = new THREE.TextureLoader();
loader.crossOrigin = "";
let fireTex = loader.load("./assets/images/flame.png");

function setup(count) {
  return new Promise((resolve) => {
    gltfLoader.load("./assets/models/spaceship.gltf", (ship) => {
      setupMaster(ship);
      for (let i = 0; i < count; i++) {
        let fire = new Fire(fireTex);
        fire.position.set(0, 0, -8.5);
        fire.rotateX(-Math.PI / 2);
        fire.scale.set(2, 10, 2);
        let boid = new THREE.Object3D();
        let drone = cloneGltf(ship);
        drone.scene.rotateY(-Math.PI / 2);
        boid.position
          .random()
          .multiplyScalar(initSpread)
          .sub(new THREE.Vector3().random().multiplyScalar(initSpread));
        boid.scale.set(0.3, 0.3, 0.3);
        boid.rotation.set(0, 0, Math.PI / 2);
        boid.userData.velocity = new THREE.Vector3().random();
        boid.userData.weight = 1;
        boid.userData.index = i;
        boid.add(fire);
        boid.add(drone.scene);
        scene.add(boid);
        boids.push(boid);
        fires.push(fire);
      }
      resolve(ship);
    });
  });
}

function setupMaster(ship) {
  let fire = new Fire(fireTex);
  fire.position.set(0, 0, -14.8);
  fire.rotateX(-Math.PI / 2);
  fire.scale.set(1.5, 20, 1.5);
  masterBoid = new THREE.Object3D();
  let drone = cloneGltf(ship);
  drone.scene.rotateY(-Math.PI / 2);
  masterBoid.position
    .random()
    .multiplyScalar(initSpread)
    .sub(new THREE.Vector3().random().multiplyScalar(initSpread));
  masterBoid.userData.velocity = new THREE.Vector3(0.1, 0, 0);
  masterBoid.userData.weight = masterWeight;
  masterBoid.userData.index = "master";
  camera = new THREE.PerspectiveCamera(70, 2, 1, 500);
  camera.position.y = 10;
  camera.position.z = -20;
  camera.up.set(0, 1, 0);
  camera.lookAt(new THREE.Vector3(0, 0, 20));
  masterBoid.add(camera);
  masterBoid.add(fire);
  masterBoid.add(drone.scene);
  scene.add(masterBoid);
  fires.push(fire);
  document.addEventListener(
    "pointerdown",
    () => {
      pressed = true;
    },
    false
  );
  document.addEventListener("pointermove", controlMaster, false);
  document.addEventListener(
    "pointerup",
    () => {
      pressed = false;
    },
    false
  );
}

function updateCameraAngle() {
  let camDirection = new THREE.Vector3()
    .copy(masterBoid.userData.velocity)
    .normalize();
  camDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), lag.horz);
  camDirection.applyAxisAngle(
    new THREE.Vector3(0, 1, 0).cross(masterBoid.userData.velocity).normalize(),
    lag.vert
  );
  camera.lookAt(
    new THREE.Vector3().addVectors(masterBoid.position, camDirection)
  );
  if (!pressed) {
    lag.horz = decayToZero(lag.horz, 0.1);
    lag.vert = decayToZero(lag.vert, 0.1);
  }
}

function updateVelocities() {
  masterBoid.userData.velocity.applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    control.horz * controlSensitivity
  );
  masterBoid.userData.velocity.applyAxisAngle(
    new THREE.Vector3(0, 1, 0).cross(masterBoid.userData.velocity).normalize(),
    control.vert * controlSensitivity
  );
  masterBoid.userData.velocity.add(boundary(masterBoid));
  velocityLimiter(masterBoid);

  [...boids].forEach((boid) => {
    boid.userData.velocity.add(boidAlg(boid));
    boid.userData.velocity.add(boundary(boid));
    velocityLimiter(boid);
  });
  if (!pressed) {
    control.horz = decayToZero(control.horz, 2);
    control.vert = decayToZero(control.vert, 2);
  }
}

function boidAlg(el) {
  let posAttract = new THREE.Vector3(),
    posRepel = new THREE.Vector3(),
    velocityAdj = new THREE.Vector3();
  let velCount = 0,
    posCount = 0;
  [masterBoid, ...boids].forEach((boid) => {
    const dist = Math.round(
      new THREE.Vector3().subVectors(el.position, boid.position).length()
    );
    if (el.userData.index != boid.userData.index) {
      if (dist < maxDist) {
        posCount += boid.userData.weight;
        posAttract.addScaledVector(boid.position, boid.userData.weight);
      }
      if (dist < minDist) {
        posRepel
          .addScaledVector(el.position, (minDist - dist) ** 2)
          .addScaledVector(boid.position, -((minDist - dist) ** 2));
      }
      if (dist < maxDist) {
        velCount += boid.userData.weight;
        velocityAdj.addScaledVector(
          boid.userData.velocity,
          boid.userData.weight
        );
      }
    }
  });

  posAttract
    .divideScalar(posCount == 0 ? 1 : posCount)
    .addScaledVector(el.position, -1)
    .multiplyScalar(centroidAttr);
  velocityAdj
    .divideScalar(velCount == 0 ? 1 : velCount)
    .sub(el.userData.velocity)
    .multiplyScalar(velAttr);
  posRepel.multiplyScalar(repelAttr);

  const outVec = new THREE.Vector3()
    .add(posAttract)
    .add(posRepel)
    .add(velocityAdj);

  return outVec;
}

function velocityLimiter(el) {
  if (el.userData.velocity.length() > maxVel) {
    el.userData.velocity.normalize().multiplyScalar(maxVel);
  }
}

function boundary(el) {
  let boundVel = new THREE.Vector3();
  if (el.position.x > boundSize) {
    boundVel.x = -Math.sqrt(el.position.x - boundSize);
  }
  if (el.position.x < -boundSize) {
    boundVel.x = Math.sqrt(-el.position.x - boundSize);
  }
  if (el.position.y > boundSize) {
    boundVel.y = -Math.sqrt(el.position.y - boundSize);
  }
  if (el.position.y < -boundSize) {
    boundVel.y = Math.sqrt(-el.position.y - boundSize);
  }
  if (el.position.z > boundSize) {
    boundVel.z = -Math.sqrt(el.position.z - boundSize);
  }
  if (el.position.z < -boundSize) {
    boundVel.z = Math.sqrt(-el.position.z - boundSize);
  }
  return boundVel.multiplyScalar(0.001);
}

function controlMaster(event) {
  if (pressed) {
    const xamount =
        (100 * (window.innerWidth / 2 - event.offsetX)) / window.innerWidth,
      yamount =
        (-100 * ((2 * window.innerHeight) / 3 - event.offsetY)) /
        window.innerHeight;

    control.horz = xamount;
    control.vert = yamount;
    lag.horz -= 0.001 * xamount;
    lag.vert += 0.002 * yamount;
    lag.horz = Math.min(1000, Math.max(-1000, lag.horz));
    lag.vert = Math.min(1000, Math.max(-1000, lag.vert));
  }
}

function decayToZero(current, speed) {
  let retval = 0;
  if (current > 0) {
    retval = current - speed;
    retval = Math.max(retval, 0);
  } else if (current < 0) {
    retval = current + speed;
    retval = Math.min(retval, 0);
  }
  return retval;
}

export {
  setup,
  updateVelocities,
  updateCameraAngle,
  boids,
  masterBoid,
  fires,
  camera,
  boundSize,
};
