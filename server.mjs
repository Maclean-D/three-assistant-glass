import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import open from 'open';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import clipboardy from 'clipboardy';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// New route to get animation files
app.get('/animations', async (req, res) => {
  const animationsDir = path.join(__dirname, 'animations');
  try {
    const files = await fs.readdir(animationsDir);
    const fbxFiles = files.filter(file => file.endsWith('.fbx'));
    res.json(fbxFiles);
  } catch (err) {
    console.error('Error reading animations directory:', err);
    res.status(500).json({ error: 'Unable to read animations directory' });
  }
});

// Serve Vapi UMD bundle
app.get('/vapi-web-bundle.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', '@vapi-ai', 'web', 'dist', 'vapi-web-bundle.min.js'));
});

// Load or create settings.json
const settingsPath = path.join(__dirname, 'settings.json');
let settings = { clipboardAccess: false };

async function loadOrCreateSettings() {
  try {
    await fs.access(settingsPath);
    const data = await fs.readFile(settingsPath, 'utf8');
    settings = JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    } else {
      console.error('Error accessing settings file:', error);
    }
  }
}

// Call this function before setting up routes
await loadOrCreateSettings();

// Modify the /settings route
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.html'));
});

// Add a new route to get and set the clipboard access setting
app.get('/api/settings/clipboard', (req, res) => {
  res.json({ clipboardAccess: settings.clipboardAccess });
});

app.post('/api/settings/clipboard', express.json(), async (req, res) => {
  settings.clipboardAccess = req.body.clipboardAccess;
  try {
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing settings:', error);
    res.status(500).json({ error: 'Unable to update settings' });
  }
});

// Modify the /api/settings route
app.get('/api/settings', async (req, res) => {
  try {
    const settingsData = await fs.readFile(settingsPath, 'utf8');
    res.json(JSON.parse(settingsData));
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Unable to read settings' });
  }
});

app.post('/api/settings', express.json(), async (req, res) => {
  try {
    const currentSettings = { ...settings };
    
    // Update all possible settings
    const possibleSettings = [
      'clipboardAccess', 'vapiPublicKey', 'vapiPrivateKey',
      'showTime', 'timeFormat', 'freeCamera', 'sceneDebug',
      'dragDropSupport', 'vrmDebug', 'animationPicker', 'idleAnimation',
      'characterName'  // Add this line
    ];

    possibleSettings.forEach(setting => {
      if (req.body[setting] !== undefined) {
        currentSettings[setting] = req.body[setting];
      }
    });
    
    await fs.writeFile(settingsPath, JSON.stringify(currentSettings, null, 2));
    settings = currentSettings;
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Unable to update settings' });
  }
});

// Add a new route to get character information
app.get('/api/characters', async (req, res) => {
  const charactersDir = path.join(__dirname, 'characters');
  try {
    const files = await fsPromises.readdir(charactersDir);
    const characters = files
      .filter(file => file.endsWith('.vrm'))
      .map(file => {
        const name = path.parse(file).name;
        const imagePath = files.includes(`${name}.png`) 
          ? `/characters/${name}.png` 
          : '/images/Character_Card_Background.png';
        return { name, imagePath };
      });
    res.json(characters);
  } catch (err) {
    console.error('Error reading characters directory:', err);
    res.status(500).json({ error: 'Unable to read characters directory' });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

let lastClipboardContent = '';

// Modify the clipboard checking interval
const checkClipboard = () => {
  if (settings.clipboardAccess) {
    clipboardy.read().then(text => {
      if (text !== lastClipboardContent) {
        console.log('Clipboard changed:', text);
        lastClipboardContent = text;
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'clipboard', content: text }));
          }
        });
      }
    }).catch(console.error);
  }
};

setInterval(checkClipboard, 1000);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Settings page available at http://localhost:${port}/settings`);
  open(`http://localhost:${port}`);
});