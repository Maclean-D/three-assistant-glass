import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from './loadMixamoAnimation.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { LookingGlassWebXRPolyfill, LookingGlassConfig } from "@lookingglass/webxr"
import { VRButton } from "three/addons/webxr/VRButton.js";

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
scene.add(camera)
// helperRoot

const helperRoot = new THREE.Group();

helperRoot.renderOrder = 10000;

scene.add( helperRoot );

// UI Root
const uiRoot = new THREE.Group();
uiRoot.renderOrder = 99999;
camera.add( uiRoot );

// camera controls
let controls;

// light
const light = new THREE.DirectionalLight(0xffffff, Math.PI);
light.position.set(1.0, 1.0, 1.0).normalize();
scene.add(light);

let defaultModelUrl = 'characters/Character.vrm';
let currentSettings = {};

let currentVrm = undefined;
let currentAnimationUrl = undefined;
let currentMixer = undefined;
let currentAnimationName = 'idleFemale.fbx'; // Start with idle animation name

let currentVrmName = 'Loading VRM...';
let vrmNameMesh;

let currentSpeaker = 'Character';

let lastBlinkTime = 0;
const blinkInterval = 4; // Average time between blinks in seconds
const blinkDuration = 0.17; // Duration of a blink in seconds

let vapi; // Declare vapi at the top level

// Add this function to fetch settings
async function fetchSettings() {
    try {
        const response = await fetch('/api/settings');
        currentSettings = await response.json();
        if (currentSettings.characterName) {
            defaultModelUrl = `characters/${currentSettings.characterName}.vrm`;
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
    }
}

// Add this function to check for settings changes
function checkSettingsChanges() {
  fetch('/api/settings')
    .then(response => response.json())
    .then(newSettings => {
      if (JSON.stringify(newSettings) !== JSON.stringify(currentSettings)) {
        console.log('Settings have changed. Reloading page...');
        location.reload();
      }
    })
    .catch(error => console.error('Error checking settings:', error));
}

// Add this function to get the vrmDebug setting
async function getVrmDebugSetting() {
  try {
    const response = await fetch('/api/settings');
    const settings = await response.json();
    return settings.vrmDebug || false;
  } catch (error) {
    console.error('Error fetching vrmDebug setting:', error);
    return false;
  }
}

// Add this function to get the current idle animation from settings
async function getCurrentIdleAnimation() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        return settings.idleAnimation ? `animations/${settings.idleAnimation}` : 'animations/idleFemale.fbx';
    } catch (error) {
        console.error('Error fetching idle animation from settings:', error);
        return 'animations/idleFemale.fbx'; // Fallback to default
    }
}

// Add this function to get the settingsIconToggle setting
async function getSettingsIconToggle() {
  try {
    const response = await fetch('/api/settings');
    const settings = await response.json();
    return settings.settingsIconToggle || false;
  } catch (error) {
    console.error('Error fetching settingsIconToggle setting:', error);
    return false;
  }
}

// Modify the gears loading part
async function loadGearsIfEnabled() {
  const settingsIconToggle = await getSettingsIconToggle();
  
  if (settingsIconToggle) {
    const fbxLoader = new FBXLoader();
    fbxLoader.load('models/gears.fbx', (fbxScene) => {
        fbxScene.scale.set(GEARS_SCALE, GEARS_SCALE, GEARS_SCALE);
      
      // Position the gears above the dark green rectangle
        fbxScene.position.set(
        roundedRect.position.x + greenRectWidth / 2 - 0.63,
        roundedRect.position.y + greenRectHeight / 2 + GEARS_Y_OFFSET,
        roundedRect.position.z + GEARS_Z_OFFSET
      );

      // Apply color to all meshes in the gears model
        fbxScene.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshBasicMaterial({ color: GEARS_COLOR, depthTest: false });
          // Add hover effect
          child.userData.originalColor = GEARS_COLOR; // Store original color
        }
      });

    uiRoot.add(fbxScene);

      // Add rotation animation to gears
      function animateGears() {
        fbxScene.rotation.z += -0.002;
        requestAnimationFrame(animateGears);
      }
      animateGears();

      // Add hover event listeners
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      function onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the raycaster with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(fbxScene.children);

        // Reset colors
        fbxScene.traverse((child) => {
          if (child.isMesh) {
            child.material.color.set(child.userData.originalColor);
          }
        });

        // Change color on hover
        if (intersects.length > 0) {
          intersects[0].object.material.color.set(HOVER_COLOR);
        }
      }

      window.addEventListener('mousemove', onMouseMove, false);

      // Add click event listener
      window.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(fbxScene.children);

        if (intersects.length > 0) {
          // Open URL in a small popup window
          window.open('http://localhost:3000/settings', 'popupWindow', 'width=950,height=908,scrollbars=yes,resizable=yes'); // Adjust width and height as needed
        }
      });
    }, undefined, (error) => {
      console.error('Error loading gears model:', error);
    });
  }
}

// Call loadGearsIfEnabled in the initializeApp function
async function initializeApp() {
  await fetchSettings();
  const settings = currentSettings;

  // ... existing renderer setup ...

  // Update camera controls based on freeCamera setting
  if (settings.freeCamera) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.target.set(0.0, 1.0, 0.0);
    controls.update();
  } else {
    // If freeCamera is false, remove or disable OrbitControls
    controls = null;
  }

  // Add scene debug helpers if sceneDebug is true
  if (settings.sceneDebug) {
    // helpers
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
  }

  // ... rest of the initialization code ...

  // Update drag and drop functionality based on dragDropSupport setting
  if (settings.dragDropSupport) {
    window.addEventListener('dragover', function (event) {
      event.preventDefault();
    });

    window.addEventListener('drop', function (event) {
      event.preventDefault();

      const files = event.dataTransfer.files;
      if (!files) return;

      const file = files[0];
      if (!file) return;

      const fileType = file.name.split('.').pop().toLowerCase();
      const blob = new Blob([file], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      if (fileType === 'fbx') {
        loadFBX(url);
      } else if (fileType === 'vrm') {
        currentVrmName = file.name.split('.')[0];
        loadVRM(url, currentVrmName);
      }
    });
  }

  // Update animation picker visibility based on animationPicker setting
  const animationSelect = document.getElementById('animationSelect');
  if (settings.animationPicker) {
    animationSelect.style.display = 'block';
    populateAnimationDropdown();
  } else {
    animationSelect.style.display = 'none';
  }

  // ... rest of the initialization code ...

  // Set up an interval to check for settings changes
  setInterval(checkSettingsChanges, 500); // Check every .5 seconds

  // Load gears if enabled
  await loadGearsIfEnabled();

  // Load the default VRM model
  loadVRM(defaultModelUrl, settings.characterName || 'Character');
}

// Call the initializeApp function instead of running the code directly
initializeApp();

// Modify the loadVRM function
async function loadVRM(modelUrl, modelName) {
    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';

    const vrmDebug = await getVrmDebugSetting();

    loader.register((parser) => {
        return new VRMLoaderPlugin(parser, {
            helperRoot: vrmDebug ? helperRoot : null,
            autoUpdateHumanBones: true
        });
    });

    // Ensure the modelUrl starts with 'characters/'
    if (!modelUrl.startsWith('characters/')) {
        modelUrl = `characters/${modelUrl}`;
    }

    loader.load(
        modelUrl,
        async (gltf) => {
            const vrm = gltf.userData.vrm;

            if (currentVrm) {
                scene.remove(currentVrm.scene);
                VRMUtils.deepDispose(currentVrm.scene);
            }

            currentVrm = vrm;
            //currentVrm.renderOrder = 10;
            scene.add(vrm.scene);

            // Rotate the VRM model 180 degrees around the Y-axis
            vrm.scene.rotation.y = Math.PI;

            vrm.scene.traverse((obj) => {
                obj.frustumCulled = false;
            });

            console.log('VRM model loaded:', modelUrl);

            // Use the provided modelName instead of extracting from URL
            currentVrmName = modelName || 'Unknown';
            updateVrmNameDisplay();

            // Get the current idle animation from settings
            const idleAnimationUrl = await getCurrentIdleAnimation();
            // Automatically load the idle animation after the VRM is loaded
            loadFBX(idleAnimationUrl);
        },
        (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
        (error) => console.error(error),
    );
}

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
                action.onFinished = async () => {
                    const idleAnimationUrl = await getCurrentIdleAnimation();
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

// Create a group to hold all the sparkles
const sparklesGroup = new THREE.Group();
sparklesGroup.renderOrder = -1
uiRoot.add(sparklesGroup);

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
                    transparent: false,
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
                (j - cols / 2), // Increased spacing
                (i - rows / 2), // Increased spacing
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
    side: THREE.DoubleSide,
    depthTest: false
});
const roundedRect = new THREE.Mesh(roundedRectGeometry, roundedRectMaterial);
roundedRect.position.set(0, -0.45, -2.5);
uiRoot.add(roundedRect);

// Replace the loadFont function with this:
function loadFont(fontFamily, fontPath) {
  return new Promise((resolve, reject) => {
    const font = new FontFace(fontFamily, `url(${fontPath})`);
    font.load().then((loadedFont) => {
      document.fonts.add(loadedFont);
      resolve();
    }).catch(() => {
      reject(new Error(`Failed to load font: ${fontFamily}`));
    });
  });
}

// Update the updateVrmNameDisplay function
function updateVrmNameDisplay(speaker = currentSpeaker) {
  currentSpeaker = speaker;
  loadFont('Mali', 'fonts/Mali-Medium.ttf').then(() => {
    if (vrmNameMesh) {
      uiRoot.remove(vrmNameMesh);
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const scaleFactor = 4; // Increase this factor for higher quality
    const fontSize = 28 * scaleFactor;
    context.font = `${fontSize}px Mali`;

    const displayName = speaker === 'User' ? 'User' : currentVrmName;
    const metrics = context.measureText(displayName);
    const textWidth = metrics.width;
    const padding = 14 * scaleFactor;
    const cornerRadius = 12 * scaleFactor;

    canvas.width = (textWidth + padding * 2);
    canvas.height = (fontSize + padding * 2);

    // Create rounded rectangle
    context.beginPath();
    context.moveTo(cornerRadius, 0);
    context.lineTo(canvas.width - cornerRadius, 0);
    context.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
    context.lineTo(canvas.width, canvas.height - cornerRadius);
    context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
    context.lineTo(cornerRadius, canvas.height);
    context.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
    context.lineTo(0, cornerRadius);
    context.quadraticCurveTo(0, 0, cornerRadius, 0);
    context.closePath();

    // Fill the rounded rectangle with the original color
    context.fillStyle = '#1c532b';
    context.fill();

    // Add text
    context.font = `${fontSize}px Mali`;
    context.fillStyle = '#efead7';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(displayName, padding, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Use MeshBasicMaterial to ignore lighting
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });
    const geometry = new THREE.PlaneGeometry(canvas.width / (700 * scaleFactor), canvas.height / (700 * scaleFactor));

    vrmNameMesh = new THREE.Mesh(geometry, material);

    // Position the name box above the dark green box
    vrmNameMesh.position.set(
      roundedRect.position.x - greenRectWidth / 2 + (canvas.width / (1400 * scaleFactor)) + 0.05,
      roundedRect.position.y + greenRectHeight / 2,
      roundedRect.position.z + 0.02
    );
    uiRoot.add(vrmNameMesh);
  }).catch((error) => {
    console.error('Error loading font:', error);
  });
}

// Call updateVrmNameDisplay after the scene is set up
// Add this line after you add the roundedRect to the scene
updateVrmNameDisplay();

// animate
const clock = new THREE.Clock();

function updateBlink(deltaTime) {
    if (!currentVrm) return;

    lastBlinkTime += deltaTime;

    // Check if it's time to blink
    if (lastBlinkTime > blinkInterval) {
        // Reset the blink timer with some randomness
        lastBlinkTime = -Math.random() * 2;

        // Perform the blink
        let blinkProgress = 0;
        const blinkAnimation = setInterval(() => {
            blinkProgress += 1 / 60; // Assuming 60 FPS
            const blinkValue = Math.sin(Math.PI * blinkProgress / blinkDuration);
            
            // Close both eyes
            currentVrm.expressionManager.setValue('blink', blinkValue);

            if (blinkProgress >= blinkDuration) {
                clearInterval(blinkAnimation);
                currentVrm.expressionManager.setValue('blink', 0);
            }
        }, 1000 / 60); // Run the animation at 60 FPS
    }
}

// Add these constants for easy adjustment
const GEARS_SCALE = 0.00045;
const GEARS_Y_OFFSET = 0.83;
const GEARS_Z_OFFSET = 0.05;
const GEARS_COLOR = 0x4b9560;
const HOVER_COLOR = 0x1d3c34; // New hover color

// Modify the animate function
function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  if (currentMixer) {
    currentMixer.update(deltaTime);
  }

  if (currentVrm) {
    updateBlink(deltaTime);
    currentVrm.update(deltaTime);
  }

  // Update controls only if freeCamera is enabled
  if (controls) {
    controls.update();
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

// Add these lines at the top of your file
let assistantId;

// Add this function to get the assistantID from settings
async function getAssistantId() {
  try {
    const response = await fetch('/api/settings');
    const settings = await response.json();
    return settings.assistantID || '';
  } catch (error) {
    console.error('Error fetching assistantID:', error);
    return '';
  }
}

// Add this function to get the Vapi public key from settings
async function getVapiPublicKey() {
  try {
    const response = await fetch('/api/settings');
    const settings = await response.json();
    return settings.vapiPublicKey || '';
  } catch (error) {
    console.error('Error fetching Vapi public key:', error);
    return '';
  }
}

// Update the initializeVapi function
async function initializeVapi() {
  const vapiKey = await getVapiPublicKey();
  assistantId = await getAssistantId(); 

  if (!vapiKey) {
    console.error('Vapi public key not found in settings');
    return;
  }

  vapi = new Vapi(vapiKey);

  vapi.on('call-start', () => {
    console.log('Vapi call started');
    currentMessage = '';
    updateTextMesh('Call started...');
  });

  vapi.on('call-end', () => {
    console.log('Vapi call ended');
    updateTextMesh(currentMessage + '\n\nCall ended.');
  });

  vapi.on('speech-start', () => {
    console.log('Vapi started speaking');
    currentMessage = ''; // Remove the 'Assistant: ' prefix
  });

  vapi.on('speech-end', () => {
    console.log('Vapi stopped speaking');
  });

  vapi.on('message', (message) => {
    console.log('Received message:', message);
    if (message.type === 'transcript') {
      if (message.transcriptType === 'partial' || message.transcriptType === 'final') {
        currentMessage = message.transcript;
        updateTextMesh(currentMessage);
        
        // Update the name display based on the speaker
        updateVrmNameDisplay(message.role === 'user' ? 'User' : 'Character');
      }
    }
  });

  vapi.on('volume-level', (volume) => {
    console.log('Volume level:', volume);
    if (currentVrm) {
      // Map the volume (0-1) to the 'aa' expression (0-1)
      currentVrm.expressionManager.setValue('aa', volume);
    }
  });

  vapi.on('error', (error) => {
    console.error('Vapi error:', error);
    updateTextMesh('Error: ' + error.message);
  });
}

// Add this function to send system messages to Vapi
function sendSystemMessageToVapi(content) {
  if (vapiActive && vapi) {
    vapi.send({
      type: "add-message",
      message: {
        role: "system",
        content: content
      }
    });
  }
}

// Update the socket.onmessage function
window.addEventListener('load', async () => {
  initializeVapi();

  document.getElementById('toggleVapi').addEventListener('click', toggleVapi);

  // Fetch the assistantShortcut from settings
  const response = await fetch('/api/settings');
  const settings = await response.json();
  const assistantShortcut = settings.assistantShortcut;

  document.addEventListener('keydown', (e) => {
    if (e.key === assistantShortcut) {
      toggleVapi();
    }
  });

  const socket = new WebSocket('ws://' + location.host);
  const clipboardAlert = document.getElementById('clipboardAlert');

  socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'clipboard') {
      clipboardAlert.textContent = '📋 Clipboard Updated: ';
      clipboardAlert.style.display = 'block';
      setTimeout(() => {
        clipboardAlert.style.display = 'none';
      }, 5000);

      // Send clipboard content to Vapi as a system message
      const systemMessage = `User's clipboard updated: ${data.content}`;
      sendSystemMessageToVapi(systemMessage);
    }
  };
});

let vapiActive = false;

function toggleVapi() {
  const toggleButton = document.getElementById('toggleVapi');
  
  if (vapiActive) {
    stopVapi();
    toggleButton.textContent = '▶️';
    vapiActive = false;
  } else {
    startVapi();
    toggleButton.textContent = '🛑';
    vapiActive = true;
  }
}

// Add these functions to start and stop Vapi
function startVapi() {
  if (vapi && assistantId) {
    vapi.start(assistantId);
    updateVrmNameDisplay('Character'); // Reset to Character when starting
  } else {
    console.error('Vapi not initialized or assistantID not set');
  }
}

function stopVapi() {
  if (vapi) {
    vapi.stop();
  } else {
    console.error('Vapi not initialized');
  }
}

let textMesh;
let currentMessage = '';
const topMargin = 70; // Customize this value to adjust the top margin

function updateTextMesh(message) {
  loadFont('Mali', 'fonts/Mali-Medium.ttf').then(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 36;
    context.font = `${fontSize}px Mali`;

    const maxWidth = greenRectWidth * 0.9 * 1000;
    const words = message.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    const textCanvas = document.createElement('canvas');
    const textContext = textCanvas.getContext('2d');
    textCanvas.width = greenRectWidth * 1000;
    textCanvas.height = greenRectHeight * 1000;

    textContext.font = `${fontSize}px Mali`;
    textContext.fillStyle = '#efead7';
    textContext.textAlign = 'left';
    textContext.textBaseline = 'top';

    const lineHeight = fontSize * 1.2;
    const leftPadding = 40; // Add some left padding

    lines.forEach((line, index) => {
      textContext.fillText(line, leftPadding, topMargin + index * lineHeight);
    });

    const texture = new THREE.CanvasTexture(textCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });

    if (!textMesh) {
      const geometry = new THREE.PlaneGeometry(greenRectWidth, greenRectHeight);
      textMesh = new THREE.Mesh(geometry, material);
      textMesh.position.set(
        roundedRect.position.x,
        roundedRect.position.y,
        roundedRect.position.z + 0.01
      );
      uiRoot.add(textMesh);
    } else {
      textMesh.material.map = texture;
      textMesh.material.needsUpdate = true;
    }
  }).catch((error) => {
    console.error('Error loading font:', error);
  });
}

// Add WebXR for Looking Glass Functions
renderer.xr.enabled = true

// Configure looking glass settings
const config = LookingGlassConfig
config.targetY = 1
config.targetZ = 0
config.targetDiam = 1.5
config.depthiness = 0.8
config.fovy = (40 * Math.PI) / 180
new LookingGlassWebXRPolyfill()

// Add Start Session Button
document.body.append(VRButton.createButton(renderer));

function StartXRSession() {
    // Reposition UI for clear viewing in Looking Glass
    uiRoot.position.x = 0.8
    uiRoot.position.z = 0.5
}

function EndXRSession() {
    // Reload page on XR Session end to fix view
    console.log('XR Session Ended. Reloading page...')
    location.reload()
}

renderer.xr.addEventListener('sessionstart', StartXRSession)
renderer.xr.addEventListener("sessionend", EndXRSession)

updateTextMesh('Waiting for call to start...');