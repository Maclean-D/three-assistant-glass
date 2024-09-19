# three-assistant-glass

![three-assistant-glass](https://github.com/Maclean-D/three-assistant-glass/raw/main/three-assistant-glass.png)

Customizable 3D conversational AI character

## Features

### Voice Assistant - [Vapi](https://vapi.ai/)

- Custom LLM (OpenAI, Anthropic, Groq, etc.)
- Custom Voice (Cartesia, 11labs, Rime.ai etc.)
- Knowledge Base (Markdown, PDF, Word, jpeg, etc.)
- Live Transcriptions (Deepgram, Talkscriber, Gladia)
- Emotion Detection
- Interuptions
- Background Sound, Filler, & Backchanneling
- Function Calling
- Audio Recording

### Character - [three-vrm](https://github.com/pixiv/three-vrm)

- Custom 3D model ([vrm](https://hub.vroid.com/en))
- Custom animations (fbx)
- Animated to voice assistant's voice

### Holographic Display - [Looking Glass](https://lookingglassfactory.com/webxr)

- View in 3d on any Looking Glass display

### Experimental

- Plaintext clipboard access

### Planned

- Show current time
- Add setting to change size/scale of character
- Add setting to move character backwards or forwards
- Access to [Ask Limitless](https://feedback.limitless.ai/roadmap/ask-ai-anything) via [Selenium](https://www.selenium.dev/) upon public release
- [01](https://github.com/OpenInterpreter/01) as a voice assistant option upon a stable 1.0 release

## Prerequisites

- Desktop operating system (Windows, MacOS, Linux)
- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/get-npm) (usually comes with Node.js)

## How to Run

1. Open a terminal and clone this repository
   ```
   git clone https://github.com/Maclean-D/three-assistant-glass.git
   ```

2. Navigate to the project directory.
   ```
   cd three-assistant-glass
   ```

3. Install the required dependencies:
   ```
   npm install
   ```

4. Start the server:
   ```
   node server.mjs
   ```
5. http://localhost:3000/ should open automatically

6. Open Settings and save your [Vapi keys](https://dashboard.vapi.ai/org/api-keys)

7. Pick a character model and voice assistant ([Create an assistant on Vapi](https://dashboard.vapi.ai/assistants) first if you haven't already)

8. Go back to http://localhost:3000/settings and click ▶️ to start the assistant

## View on a Looking Glass Display

1. Install [Looking Glass Bridge](https://lookingglassfactory.com/software/looking-glass-bridge)

2. Plug in your Looking Glass Display

3. (Recommended) Turn off `Show Settings Icon` in Settings

4. Click `Enter Looking Glass`

5. (Recommended) Double click the window or press `f11` to enter full-screen

6. Press the `▶️` button on your looking glass display or computer to start the assistant (Configurable in Settings)

## FAQ

### How do I add a new character model?

1. Download a .vrm file, ([VRoid Hub](https://hub.vroid.com/en) has lots of models or make your own in [VRoid Studio](https://vroid.com/en/studio))
2. From the characters tab in settings, click the `+` button and select the .vrm or .zip file
3. Click the model to set it as the active model

### How do I change the character's card in settings?

1. Prepare a 270x480 .png file that has the same name as your vrm file
2. From the characters tab in settings, click the `+` button and select the .png file

### Can I bundle character models and cards?

1. Zip the character's .vrm & .png files together (make sure they have the same name)
2. From the characters tab in settings, click the `+` button and select the .zip file

### How do I change a character's name?

1. Open the `characters` folder
2. Rename the .vrm & .png files (make sure they have the same name)

### How do I delete characters?

1. Open the `characters` folder
2. Delete the desired .vrm & .png files

### How do I add custom animations?

1. Open the `animations` folder
2. Drag and drop your .fbx files into the folder

### I turned off the Settings Icon, how do I get it back?

1. Go back to http://localhost:3000/settings
2. Turn on `Show Settings Icon`

## Troubleshooting

- For 2d displays [Arc](https://arc.net/gift/friend-of-maclean) browser is recommended
- For Looking Glass Displays [Chrome](https://www.google.com/chrome/) is recommended

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Maclean-D/three-assistant-glass&type=Date)](https://star-history.com/#Maclean-D/three-assistant-glass&Date)

## Contributors

<a href="https://github.com/Maclean-D/three-assistant-glass/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Maclean-D/three-assistant-glass" />
</a>
