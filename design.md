# Create a project directory
mkdir KokoroVoice
cd KokoroVoice

# Initialize a new Node.js project
npm init -y

# Install Electron as a development dependency
npm install --save-dev electron

# Create .gitignore
https://github.com/electron/electron/blob/main/.gitignore

# Kokoro TTS module oonx files
https://huggingface.co/onnx-community/Kokoro-82M-ONNX/tree/main/onnx
- Download the .onnx files and put them in the following dir
- ./node_modules/@huggingface/transformers/.cache/onnx-community/Kokoro-82M-ONNX/onnx

# Create main files
touch main.js
mkdir src
touch src/index.html
touch src/renderer.js
touch src/styles.css

# Add this to your package.json manually or run:
npm pkg set scripts.start="electron ."
npm pkg set main="main.js"

# Install undici for fetching (sys_proxy is required)
npm install undici

# Install kokoro-js
npm i kokoro-js
npm list

# Install @iarna/toml for toml parsing
npm install @iarna/toml

# Install tailwindcss cli
- Install cli
npm install -D tailwindcss @tailwindcss/cli
npm install -D postcss autoprefixer
- Create tailwind.config.js
- import tailwindcss into styles.css
@import "tailwindcss";
<link href="./styles-output.css" rel="stylesheet">
- Build styles.css to styles-output.css, this will actively be built
npx @tailwindcss/cli -i ./src/styles.css -o ./src/styles-output.css --watch

# Test
npm start debug
electron . debug


# What' i learnt

### About async/await
**Even though handle is async, time-consuming CPU operations will still block the main process thread because:
1, JavaScript is single-threaded within each process
2, Async/await helps with I/O waiting but not CPU-intensive tasks
3, If your handler is doing heavy computation, the main process will become unresponsive

### About invoke/handle and send/on pairs
**invoke/handle works like this:
- In the renderer process, ipcRenderer.invoke() always returns a Promise immediately
- But this Promise won't resolve until the handler function in the main process completes

**send/on works like this:
- ipcRenderer.send() doesn't return anything
- It's a fire-and-forget method
- Execution continues immediately after sending
- No built-in way to wait for a response

### About undici
**nodejs cannot automatically detect proxy settings, so we need to set it manually.

### About console.log in renderer.js
If you see the logs in DevTools but not in the main process terminal, 
that suggests your preload script's console.log is only logging to the renderer process, not to the main process.

**This can happen for a few reasons:
- In Electron, preload scripts technically run in the renderer process (but with Node.js access)
- Console.log need to be explicitly forwarded to the main process