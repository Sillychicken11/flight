import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer;
let airplane;
let throttle = 0;
let pitch = 0, roll = 0, yaw = 0;

const maxThrottle = 100;

// Physical constants
const mass = 1000; // kg
const wingArea = 16.2; // m²
const airDensity = 1.225; // kg/m³
const dragCoefficient = 0.03;
const liftCoefficientSlope = 5.7;
const gravity = 9.81;

let velocity = new THREE.Vector3(0, 0, 0);
let acceleration = new THREE.Vector3(0, 0, 0);

const keys = {};

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  // Load airplane model
  const loader = new GLTFLoader();
  loader.load(
    'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumAir/glTF/CesiumAir.gltf',
    function (gltf) {
      airplane = gltf.scene;
      airplane.scale.set(1, 1, 1);
      scene.add(airplane);
    },
    undefined,
    function (error) {
      console.error('Error loading model:', error);
    }
  );

  camera.position.set(0, 5, 15);
  camera.lookAt(0, 0, 0);

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

function onKeyDown(e) {
  keys[e.key.toLowerCase()] = true;
}

function onKeyUp(e) {
  keys[e.key.toLowerCase()] = false;
}

function processInput(delta) {
  if (keys['w']) pitch -= 0.5 * delta;
  if (keys['s']) pitch += 0.5 * delta;
  if (keys['a']) roll += 0.5 * delta;
  if (keys['d']) roll -= 0.5 * delta;
  if (keys['q']) yaw += 0.5 * delta;
  if (keys['e']) yaw -= 0.5 * delta;
  if (keys['arrowup']) throttle = Math.min(maxThrottle, throttle + 30 * delta);
  if (keys['arrowdown']) throttle = Math.max(0, throttle - 30 * delta);

  // Clamp pitch and roll
  pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 4, Math.PI / 4);
  roll = THREE.MathUtils.clamp(roll, -Math.PI / 4, Math.PI / 4);
}

function updatePhysics(delta) {
  if (!airplane) return;

  let forward = new THREE.Vector3(0, 0, -1).applyEuler(airplane.rotation);
  let speed = velocity.length();

  // Simplified AOA as pitch angle (can improve later)
  let aoa = pitch;

  // Calculate lift and drag coefficients
  let cl = liftCoefficientSlope * aoa;
  let liftMag = 0.5 * airDensity * speed * speed * wingArea * cl;
  let dragMag = 0.5 * airDensity * speed * speed * wingArea * dragCoefficient;

  // Thrust force magnitude
  let maxThrust = 15000; // Newtons
  let thrustMag = (throttle / maxThrottle) * maxThrust;

  acceleration.set(0, 0, 0);

  // Gravity (downward)
  acceleration.y -= gravity;

  // Thrust forward
  let thrustForce = forward.clone().multiplyScalar(thrustMag / mass);

  // Lift force (upward)
  let liftForce = new THREE.Vector3(0, liftMag / mass, 0);

  // Drag force opposite velocity
  let dragForce = velocity.clone().normalize().multiplyScalar(-dragMag / mass);

  acceleration.add(thrustForce);
  acceleration.add(liftForce);
  acceleration.add(dragForce);

  velocity.add(acceleration.clone().multiplyScalar(delta));
  airplane.position.add(velocity.clone().multiplyScalar(delta));

  // Update airplane rotation based on controls
  airplane.rotation.x = pitch;
  airplane.rotation.z = roll;
  airplane.rotation.y = yaw;

  // Smooth camera follow
  camera.position.lerp(
    new THREE.Vector3(
      airplane.position.x,
      airplane.position.y + 5,
      airplane.position.z + 15
    ),
    0.1
  );
  camera.lookAt(airplane.position);

  // Update cockpit UI if present
  const uiThrottle = document.getElementById('throttle');
  const uiPitch = document.getElementById('pitch');
  const uiRoll = document.getElementById('roll');
  const uiYaw = document.getElementById('yaw');

  if (uiThrottle) uiThrottle.textContent = throttle.toFixed(0);
  if (uiPitch) uiPitch.textContent = (pitch * 180 / Math.PI).toFixed(1);
  if (uiRoll) uiRoll.textContent = (roll * 180 / Math.PI).toFixed(1);
  if (uiYaw) uiYaw.textContent = (yaw * 180 / Math.PI).toFixed(1);
}

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  let now = performance.now();
  let delta = (now - lastTime) / 1000;
  lastTime = now;

  processInput(delta);
  updatePhysics(delta);

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}// Calculate airspeed (speed magnitude)
let airspeed = velocity.length();

// Calculate altitude from airplane Y position
let altitude = airplane.position.y;

document.getElementById('airspeed').textContent = airspeed.toFixed(1);
document.getElementById('pitch-display').textContent = (pitch * 180 / Math.PI).toFixed(1);
document.getElementById('roll-display').textContent = (roll * 180 / Math.PI).toFixed(1);
document.getElementById('throttle-display').textContent = throttle.toFixed(0);
document.getElementById('altitude-display').textContent = altitude.toFixed(1);

