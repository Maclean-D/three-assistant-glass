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

// Serve settings.html for the /settings route
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.html'));
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

// Check clipboard every second
setInterval(() => {
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
}, 1000);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Settings page available at http://localhost:${port}/settings`); // Added line
  open(`http://localhost:${port}`);
});