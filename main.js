import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from './loadMixamoAnimation.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// Set up renderer to use full screen
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 0); // Make renderer background transparent
document.body.appendChild(renderer.domElement);

// Update camera
const camera = new THREE.PerspectiveCamera(30.0, window.innerWidth / window.innerHeight, 0.1, 20.0);
camera.position.set(0.0, 1.0, 2.73);

// scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#efead7');

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

// Create a group to hold all the sparkles
const sparklesGroup = new THREE.Group();
scene.add(sparklesGroup);

// Load the SVG
const loader = new SVGLoader();
loader.load('icons/sparkles.svg', (data) => {
    const paths = data.paths;
    const sparkleColor = new THREE.Color('#bfbbac');

    // Create sparkles and add them to the group
    const rows = 20;
    const cols = 20;
    const sparkleSize = 0.02; // Reduced size further
    const wallDepth = -15; // Position even further back
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const sparkleGroup = new THREE.Group();
            
            for (let path of paths) {
                const material = new THREE.MeshBasicMaterial({
                    color: sparkleColor,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.5, // Reduced opacity
                    depthWrite: false
                });
                
                const shapes = path.toShapes(true);
                for (let shape of shapes) {
                    const geometry = new THREE.ShapeGeometry(shape);
                    const mesh = new THREE.Mesh(geometry, material);
                    sparkleGroup.add(mesh);
                }
            }
            
            sparkleGroup.scale.set(sparkleSize, sparkleSize, sparkleSize);
            sparkleGroup.position.set(
                (j - cols / 2) * 1, // Increased spacing
                (i - rows / 2) * 1, // Increased spacing
                wallDepth + Math.random() * 2 - 1 // Add some depth variation
            );
            
            // Add random rotation
            sparkleGroup.rotation.z = Math.random() * Math.PI * 2;
            
            sparklesGroup.add(sparkleGroup);
        }
    }
});

// Add this function to create a custom curve for the rounded rectangle
function createRoundedRectangleCurve(width, height, radius) {
    const curve = new THREE.CurvePath();
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Helper function to create a smooth corner
    const createCorner = (startX, startY, midX, midY, endX, endY) => {
        return new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(startX, startY, 0),
            new THREE.Vector3(midX, midY, 0),
            new THREE.Vector3(endX, endY, 0)
        );
    };

    // Top right corner
    curve.add(createCorner(halfWidth - radius, halfHeight, halfWidth, halfHeight, halfWidth, halfHeight - radius));

    // Right side
    curve.add(new THREE.LineCurve3(
        new THREE.Vector3(halfWidth, halfHeight - radius, 0),
        new THREE.Vector3(halfWidth, -halfHeight + radius, 0)
    ));

    // Bottom right corner
    curve.add(createCorner(halfWidth, -halfHeight + radius, halfWidth, -halfHeight, halfWidth - radius, -halfHeight));

    // Bottom side
    curve.add(new THREE.LineCurve3(
        new THREE.Vector3(halfWidth - radius, -halfHeight, 0),
        new THREE.Vector3(-halfWidth + radius, -halfHeight, 0)
    ));

    // Bottom left corner
    curve.add(createCorner(-halfWidth + radius, -halfHeight, -halfWidth, -halfHeight, -halfWidth, -halfHeight + radius));

    // Left side
    curve.add(new THREE.LineCurve3(
        new THREE.Vector3(-halfWidth, -halfHeight + radius, 0),
        new THREE.Vector3(-halfWidth, halfHeight - radius, 0)
    ));

    // Top left corner
    curve.add(createCorner(-halfWidth, halfHeight - radius, -halfWidth, halfHeight, -halfWidth + radius, halfHeight));

    // Top side
    curve.add(new THREE.LineCurve3(
        new THREE.Vector3(-halfWidth + radius, halfHeight, 0),
        new THREE.Vector3(halfWidth - radius, halfHeight, 0)
    ));

    return curve;
}

// Update these values for better visibility and more rounded corners
const outlineWidth = 0.75;
const outlineHeight = 1.5;
const cornerRadius = 0.1;
const outlineColor = new THREE.Color('#71c5e8');
const tubeRadius = 0.005;

const roundedRectangleCurve = createRoundedRectangleCurve(outlineWidth, outlineHeight, cornerRadius);
const tubeGeometry = new THREE.TubeGeometry(roundedRectangleCurve, 200, tubeRadius, 8, false);
const tubeMaterial = new THREE.MeshBasicMaterial({ color: outlineColor });
const outline = new THREE.Mesh(tubeGeometry, tubeMaterial);

outline.position.set(0, outlineHeight / 2 + 0.3, -0.5);
scene.add(outline);

// Keep the original outline dimensions
const greenRectWidth = outlineWidth * 0.9; // Reduced by 10%
const greenRectHeight = outlineHeight / 4; // Half the height of the outline

const roundedCorners = new THREE.Shape();
roundedCorners.moveTo(-greenRectWidth / 2 + cornerRadius, -greenRectHeight / 2);
roundedCorners.lineTo(greenRectWidth / 2 - cornerRadius, -greenRectHeight / 2);
roundedCorners.quadraticCurveTo(greenRectWidth / 2, -greenRectHeight / 2, greenRectWidth / 2, -greenRectHeight / 2 + cornerRadius);
roundedCorners.lineTo(greenRectWidth / 2, greenRectHeight / 2 - cornerRadius);
roundedCorners.quadraticCurveTo(greenRectWidth / 2, greenRectHeight / 2, greenRectWidth / 2 - cornerRadius, greenRectHeight / 2);
roundedCorners.lineTo(-greenRectWidth / 2 + cornerRadius, greenRectHeight / 2);
roundedCorners.quadraticCurveTo(-greenRectWidth / 2, greenRectHeight / 2, -greenRectWidth / 2, greenRectHeight / 2 - cornerRadius);
roundedCorners.lineTo(-greenRectWidth / 2, -greenRectHeight / 2 + cornerRadius);
roundedCorners.quadraticCurveTo(-greenRectWidth / 2, -greenRectHeight / 2, -greenRectWidth / 2 + cornerRadius, -greenRectHeight / 2);

const roundedRectGeometry = new THREE.ShapeGeometry(roundedCorners);
const roundedRectMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x1d3c34,
    side: THREE.DoubleSide
});
const roundedRect = new THREE.Mesh(roundedRectGeometry, roundedRectMaterial);
roundedRect.position.set(0, outlineHeight / 2 + -0.18, 0.25); // Kept at the same vertical position as the outline
scene.add(roundedRect);

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

    // Move sparkles
    sparklesGroup.children.forEach((sparkle) => {
        sparkle.position.y -= 0.0005; // Even slower vertical movement
        sparkle.position.x += 0.00025; // Even slower horizontal movement

        // Rotate the sparkle
        sparkle.rotation.z += 0.002;

        if (sparkle.position.y < -10) {
            sparkle.position.y = 10;
        }
        if (sparkle.position.x > 10) {
            sparkle.position.x = -10;
        }
    });

    renderer.render(scene, camera);
}

animate();

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
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
