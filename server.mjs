import express from 'express';
import path from 'path';
import fs from 'fs';
import open from 'open';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import clipboardy from 'clipboardy';
import { fileURLToPath } from 'url';

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
app.get('/animations', (req, res) => {
  const animationsDir = path.join(__dirname, 'animations');
  fs.readdir(animationsDir, (err, files) => {
    if (err) {
      console.error('Error reading animations directory:', err);
      res.status(500).json({ error: 'Unable to read animations directory' });
    } else {
      const fbxFiles = files.filter(file => file.endsWith('.fbx'));
      res.json(fbxFiles);
    }
  });
});

// Serve Vapi UMD bundle
app.get('/vapi-web-bundle.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', '@vapi-ai', 'web', 'dist', 'vapi-web-bundle.min.js'));
});

// Load or create settings.json
const settingsPath = path.join(__dirname, 'settings.json');
let settings = { clipboardAccess: false };

if (fs.existsSync(settingsPath)) {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} else {
  fs.writeFileSync(settingsPath, JSON.stringify(settings));
}

// Modify the /settings route
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.html'));
});

// Add a new route to get and set the clipboard access setting
app.get('/api/settings/clipboard', (req, res) => {
  res.json({ clipboardAccess: settings.clipboardAccess });
});

app.post('/api/settings/clipboard', express.json(), (req, res) => {
  settings.clipboardAccess = req.body.clipboardAccess;
  fs.writeFileSync(settingsPath, JSON.stringify(settings));
  res.json({ success: true });
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
  console.log(`Settings page available at http://localhost:${port}/settings`); // Added line
  open(`http://localhost:${port}`);
});