import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from './loadMixamoAnimation.js';

// Set up renderer with 1440 × 2560 resolution
const renderer = new THREE.WebGLRenderer();
const aspectRatio = 1440 / 2560;
let width = window.innerWidth;
let height = window.innerWidth / aspectRatio;

if (height > window.innerHeight) {
    height = window.innerHeight;
    width = window.innerHeight * aspectRatio;
}

renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 0); // Make renderer background transparent
document.body.appendChild(renderer.domElement);

// camera
const camera = new THREE.PerspectiveCamera(30.0, aspectRatio, 0.1, 20.0);
camera.position.set(0.0, 1.0, 2.73);

// scene
const scene = new THREE.Scene();

// Load background texture
const textureLoader = new THREE.TextureLoader();
textureLoader.load('background.jpg', (texture) => {
    const imageAspect = texture.image.width / texture.image.height;
    const planeAspect = aspectRatio;
    
    let scaleX, scaleY;
    if (imageAspect > planeAspect) {
        scaleY = 2;
        scaleX = scaleY * (imageAspect / planeAspect);
    } else {
        scaleX = 2 * planeAspect;
        scaleY = scaleX / imageAspect;
    }

    const bgGeometry = new THREE.PlaneGeometry(scaleX, scaleY);
    const bgMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.set(0, scaleY / 2, -1);
    scene.add(bgMesh);
});

// camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.screenSpacePanning = true;
controls.target.set(0.0, 1.0, 0.0);
controls.update();

// light
const light = new THREE.DirectionalLight(0xffffff, Math.PI);
light.position.set(1.0, 1.0, 1.0).normalize();
scene.add(light);

const defaultModelUrl = 'character.vrm';
const greetingAnimationUrl = 'animations/greeting.fbx';
const idleAnimationUrl = 'animations/idleFemale.fbx';

let currentVrm = undefined;
let currentAnimationUrl = undefined;
let currentMixer = undefined;
let currentAnimationName = 'idleFemale.fbx'; // Start with idle animation name

function loadVRM(modelUrl) {
    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';

    loader.register((parser) => {
        return new VRMLoaderPlugin(parser, { helperRoot: null, autoUpdateHumanBones: true });
    });

    loader.load(
        modelUrl,
        (gltf) => {
            const vrm = gltf.userData.vrm;

            if (currentVrm) {
                scene.remove(currentVrm.scene);
                VRMUtils.deepDispose(currentVrm.scene);
            }

            currentVrm = vrm;
            scene.add(vrm.scene);

            // Rotate the VRM model 180 degrees around the Y-axis
            vrm.scene.rotation.y = Math.PI;

            vrm.scene.traverse((obj) => {
                obj.frustumCulled = false;
            });

            console.log('VRM model loaded:', modelUrl);

            // Automatically load the idle animation after the VRM is loaded
            loadFBX(idleAnimationUrl);
        },
        (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
        (error) => console.error(error),
    );
}

loadVRM(defaultModelUrl);

// mixamo animation
function loadFBX(animationUrl, playOnce = false) {
    currentAnimationUrl = animationUrl;
    currentAnimationName = animationUrl.split('/').pop();

    if (currentVrm) {
        currentVrm.humanoid.resetNormalizedPose();
        currentMixer = new THREE.AnimationMixer(currentVrm.scene);

        loadMixamoAnimation(animationUrl, currentVrm).then((clip) => {
            const action = currentMixer.clipAction(clip);
            
            if (playOnce) {
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
                action.play();

                // Switch to idle animation when greeting finishes
                action.onFinished = () => {
                    loadFBX(idleAnimationUrl);
                };
            } else {
                action.play();
            }

            updateAnimationDropdown();
        });
    } else {
        console.warn('VRM not loaded yet. Animation will be applied when VRM is ready.');
    }
}

// Add this function to update the animation dropdown
function updateAnimationDropdown() {
    const select = document.getElementById('animationSelect');
    select.value = `animations/${currentAnimationName}`;
    
    // If the current animation is not in the list, add it as the first option
    if (select.value === '') {
        const option = document.createElement('option');
        option.value = `animations/${currentAnimationName}`;
        option.textContent = currentAnimationName.replace('.fbx', ''); // Remove .fbx extension
        select.insertBefore(option, select.firstChild);
        select.value = option.value;
    }
}

// helpers
const gridHelper = new THREE.GridHelper( 10, 10 );
scene.add( gridHelper );

const axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );

// animate
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    if (currentMixer) {
        currentMixer.update(deltaTime);
    }

    if (currentVrm) {
        currentVrm.update(deltaTime);
    }

    renderer.render(scene, camera);
}

animate();

// Resize handler
window.addEventListener('resize', () => {
    let width = window.innerWidth;
    let height = window.innerWidth / aspectRatio;

    if (height > window.innerHeight) {
        height = window.innerHeight;
        width = window.innerHeight * aspectRatio;
    }

    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    // Update background plane size if it exists
    const bgMesh = scene.getObjectByName('background');
    if (bgMesh) {
        const imageAspect = bgMesh.material.map.image.width / bgMesh.material.map.image.height;
        const planeAspect = aspectRatio;
        
        let scaleX, scaleY;
        if (imageAspect > planeAspect) {
            scaleY = 2;
            scaleX = scaleY * (imageAspect / planeAspect);
        } else {
            scaleX = 2 * planeAspect;
            scaleY = scaleX / imageAspect;
        }

        bgMesh.scale.set(scaleX, scaleY, 1);
        bgMesh.position.set(0, scaleY / 2, -1);
    }
});

// Add back the drag and drop functionality
window.addEventListener('dragover', function (event) {
    event.preventDefault();
});

window.addEventListener('drop', function (event) {
    event.preventDefault();

    // read given file then convert it to blob url
    const files = event.dataTransfer.files;
    if (!files) return;

    const file = files[0];
    if (!file) return;

    const fileType = file.name.split('.').pop();
    const blob = new Blob([file], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    if (fileType === 'fbx') {
        loadFBX(url);
    } else {
        loadVRM(url);
    }
});

// Update the populateAnimationDropdown function
function populateAnimationDropdown() {
    const select = document.getElementById('animationSelect');

    fetch('/animations')
        .then(response => response.json())
        .then(animations => {
            // Clear existing options
            select.innerHTML = '';
            
            animations.forEach(animation => {
                const option = document.createElement('option');
                option.value = `animations/${animation}`;
                option.textContent = animation.replace('.fbx', ''); // Remove .fbx extension
                select.appendChild(option);
            });
            
            // Set the current animation as selected
            updateAnimationDropdown();
        })
        .catch(error => console.error('Error fetching animations:', error));
}

// Call this function after the page loads
populateAnimationDropdown();

// Update the event listener for the dropdown
document.getElementById('animationSelect').addEventListener('change', (event) => {
    const selectedAnimation = event.target.value;
    if (selectedAnimation) {
        loadFBX(selectedAnimation, false);
    }
});
