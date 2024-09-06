document.querySelectorAll('.settings-tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab-button, .tab-content, .settings-tab-item').forEach(el => el.classList.remove('active'));
        
        button.classList.add('active');
        button.closest('.settings-tab-item').classList.add('active');
        
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

const clipboardAccessToggle = document.getElementById('clipboardAccessToggle');

fetch('/api/settings/clipboard')
    .then(response => response.json())
    .then(data => {
        clipboardAccessToggle.checked = data.clipboardAccess;
    });

clipboardAccessToggle.addEventListener('change', () => {
    fetch('/api/settings/clipboard', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clipboardAccess: clipboardAccessToggle.checked }),
    });
});

document.querySelectorAll('.toggle-visibility').forEach(button => {
    button.addEventListener('click', () => {
        const input = document.getElementById(button.getAttribute('data-target'));
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        button.querySelector('img').src = isPassword ? 'icons/eye.svg' : 'icons/eye-off.svg';
    });
});

// Function to load animations
async function loadAnimations() {
    const response = await fetch('/animations');
    const animations = await response.json();
    const select = document.getElementById('idleAnimationSelect');
    select.innerHTML = '<option value="">Select an animation</option>';
    animations.forEach(animation => {
        const option = document.createElement('option');
        option.value = animation;
        option.textContent = animation;
        select.appendChild(option);
    });
}

// Function to load characters
async function loadCharacters() {
    const response = await fetch('/api/characters');
    const characters = await response.json();
    const grid = document.getElementById('characterGrid');
    grid.innerHTML = ''; // Clear existing content

    characters.forEach(character => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.innerHTML = `
            <img src="${character.imagePath}" alt="${character.name}">
            <span class="character-name">${character.name}</span>
        `;
        card.addEventListener('click', () => selectCharacter(character.name));
        grid.appendChild(card);
    });

    // Add the "Add Character" card
    const addCard = document.createElement('div');
    addCard.className = 'character-card add-character';
    addCard.innerHTML = '<img src="images/Add_Character_Card.png" alt="Add Character Card">';
    addCard.addEventListener('click', () => document.getElementById('characterUpload').click());
    grid.appendChild(addCard);
}

// Function to select a character
async function selectCharacter(name) {
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ characterName: name }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to save character name');
        }
        
        document.getElementById('characterName').textContent = name;
    } catch (error) {
        console.error('Error selecting character:', error);
        alert('Failed to select character. Please try again.');
    }
}

// Function to load settings
async function loadSettings() {
    const response = await fetch('/api/settings');
    const settings = await response.json();
    clipboardAccessToggle.checked = settings.clipboardAccess;
    document.getElementById('publicKey').value = settings.vapiPublicKey || '';
    document.getElementById('privateKey').value = settings.vapiPrivateKey || '';
    
    // Load other settings
    document.getElementById('showTimeToggle').checked = settings.showTime;
    document.getElementById('timeFormatSelect').value = settings.timeFormat;
    document.getElementById('freeCameraToggle').checked = settings.freeCamera;
    document.getElementById('sceneDebugToggle').checked = settings.sceneDebug;
    document.getElementById('dragDropToggle').checked = settings.dragDropSupport;
    document.getElementById('vrmDebugToggle').checked = settings.vrmDebug;
    document.getElementById('animationPickerToggle').checked = settings.animationPicker;
    document.getElementById('settingsIconToggle').checked = settings.settingsIconToggle; // Add this line

    // Set the selected idle animation
    const idleAnimationSelect = document.getElementById('idleAnimationSelect');
    if (settings.idleAnimation && idleAnimationSelect.querySelector(`option[value="${settings.idleAnimation}"]`)) {
        idleAnimationSelect.value = settings.idleAnimation;
    }

    // Set the character name
    if (settings.characterName) {
        document.getElementById('characterName').textContent = settings.characterName;
    }
}

// Function to save settings
async function saveSettings(key, value) {
    await fetch('/api/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
    });
}

// Function to load assistants from Vapi
async function loadAssistants() {
    try {
        const settings = await fetch('/api/settings').then(res => res.json());
        const vapiPrivateKey = settings.vapiPrivateKey;
        
        if (!vapiPrivateKey) {
            console.error('Vapi private key not found in settings');
            return;
        }

        const options = {
            method: 'GET',
            headers: { Authorization: `Bearer ${vapiPrivateKey}` }
        };

        const response = await fetch('https://api.vapi.ai/assistant', options);
        const assistants = await response.json();

        const select = document.getElementById('assistantIDSelect');
        select.innerHTML = '<option value="">Select an assistant</option>';
        assistants.forEach(assistant => {
            const option = document.createElement('option');
            option.value = assistant.id;
            option.textContent = assistant.name;
            select.appendChild(option);
        });

        // Load the selected assistant from settings
        if (settings.assistantID) {
            select.value = settings.assistantID;
            await updateAssistantInfo(settings.assistantID, vapiPrivateKey);
        }
    } catch (err) {
        console.error('Error loading assistants:', err);
    }
}

// Function to update assistant information
async function updateAssistantInfo(assistantID, vapiPrivateKey) {
    if (!assistantID) return;

    const options = {
        method: 'GET',
        headers: { Authorization: `Bearer ${vapiPrivateKey}` }
    };

    try {
        const response = await fetch(`https://api.vapi.ai/assistant/${assistantID}`, options);
        const assistant = await response.json();

        document.querySelector('#modelName .model-text').textContent = assistant.model.model;
        document.querySelector('#voiceInfo .voice-text').textContent = `${assistant.voice.provider} (${assistant.voice.voiceId})`;
        document.getElementById('systemMessage').textContent = assistant.model.messages.find(m => m.role === 'system')?.content || 'No system message found';
        document.getElementById('firstMessage').textContent = assistant.firstMessage || 'No first message found';
    } catch (error) {
        console.error('Error fetching assistant details:', error);
    }
}

// Event listener for assistant selection
document.getElementById('assistantIDSelect').addEventListener('change', async (e) => {
    const assistantID = e.target.value;
    await saveSettings('assistantID', assistantID);

    const settings = await fetch('/api/settings').then(res => res.json());
    await updateAssistantInfo(assistantID, settings.vapiPrivateKey);
});

// Modify the initializePage function
async function initializePage() {
    await loadAnimations();
    await loadSettings();
    await loadCharacters();
    await loadAssistants();
}

// Call initializePage when the page loads
initializePage();

clipboardAccessToggle.addEventListener('change', () => {
    saveSettings('clipboardAccess', clipboardAccessToggle.checked);
});

document.querySelectorAll('.save-button').forEach(button => {
    button.addEventListener('click', () => {
        const input = button.previousElementSibling.querySelector('input');
        saveSettings(input.id === 'publicKey' ? 'vapiPublicKey' : 'vapiPrivateKey', input.value);
    });
});

// Event listeners for all toggles and selects
document.getElementById('showTimeToggle').addEventListener('change', (e) => {
    saveSettings('showTime', e.target.checked);
});

document.getElementById('timeFormatSelect').addEventListener('change', (e) => {
    saveSettings('timeFormat', e.target.value);
});

document.getElementById('freeCameraToggle').addEventListener('change', (e) => {
    saveSettings('freeCamera', e.target.checked);
});

document.getElementById('sceneDebugToggle').addEventListener('change', (e) => {
    saveSettings('sceneDebug', e.target.checked);
});

document.getElementById('dragDropToggle').addEventListener('change', (e) => {
    saveSettings('dragDropSupport', e.target.checked);
});

document.getElementById('vrmDebugToggle').addEventListener('change', (e) => {
    saveSettings('vrmDebug', e.target.checked);
});

document.getElementById('animationPickerToggle').addEventListener('change', (e) => {
    saveSettings('animationPicker', e.target.checked);
});

// Event listener for idle animation select
document.getElementById('idleAnimationSelect').addEventListener('change', (e) => {
    saveSettings('idleAnimation', e.target.value);
});

// Add this function to handle file uploads
async function uploadCharacterFiles(files) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('characters', files[i]);
    }

    try {
        const response = await fetch('/api/upload-characters', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        await loadCharacters(); // Refresh the character display
    } catch (error) {
        console.error('Error uploading files:', error);
        alert('Failed to upload files. Please try again.');
    }
}

// Add event listener for file input changes
document.getElementById('characterUpload').addEventListener('change', (event) => {
    uploadCharacterFiles(event.target.files);
});

// Add this event listener for settingsIconToggle
document.getElementById('settingsIconToggle').addEventListener('change', (e) => {
    saveSettings('settingsIconToggle', e.target.checked);
});