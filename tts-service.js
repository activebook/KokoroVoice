// tts-service.js
/**
 * TTS Service
 * If tts cannot run correctly, first download onnx file from huggingface and put it in the project folder
 * https://huggingface.co/onnx-community/Kokoro-82M-ONNX/tree/main/onnx
 * folder path: ./node_modules/@huggingface/transformers/.cache/onnx-community/Kokoro-82M-ONNX/onnx/
 */
const { ipcMain, shell } = require('electron');
const { Worker } = require('worker_threads');
const { loadConfig, getAppUserDataDir } = require('./utils');
const path = require('path');

// TTS worker instance, keep only one instance
let ttsWorker = null;

// Initialize the TTS worker once
function initTTSWorker() {
    if (!ttsWorker) {
        const workerPath = path.join(__dirname, 'tts-worker.js');
        ttsWorker = new Worker(workerPath, {
            type: 'module' // Specify ES module type
        });

        // Log any errors
        ttsWorker.on('error', (err) => {
            console.error('TTS Worker error:', err);
            ttsWorker = null; // Reset so we can try again
        });
    }
    return ttsWorker;
}

async function loadVoices(sender) {
    return new Promise(async (resolve, reject) => {
        const config = await loadConfig();
        const voices = config.tts.voices.map(voice => ({
            id: voice,
            name: voice
        }));
        //console.log(voices);
        const prefix = config.tts.prefix;
        sender.send('available-voices-retrieved', voices, prefix);
        resolve(voices);
    });
}

function setupTTSHandlers() {
    ipcMain.handle('convert-text-to-speech', async (event, text, voice, filePrefix) => {
        
        /**
         * due to Node.js module scoping in worker threads! 
         * Workers load their own separate instances of modules with separate memory spaces.
         * So we must pass the appUserDataDir to the worker thread through main thread. 
         */
        const appUserDataDir = getAppUserDataDir();

        // Reuse the worker thread if it exists
        const worker = initTTSWorker();
        
        return new Promise((resolve, reject) => {
            // Create worker with ES modules
            const worker = initTTSWorker();
            // Send text to worker to process
            worker.postMessage({
                text: text,
                voice: voice,
                dir: appUserDataDir,
                prefix: filePrefix
            });
            // Handle worker response
            worker.on('message', (progress) => {
                // Forward progress to renderer
                // Pass the webContents to send progress updates
                const sender = event.sender
                sender.send('tts-progress', progress);
                resolve(progress.message);
            });
        });
    });

    // Add handler for fetching voices (optional if you have a static list)
    ipcMain.handle('get-available-voices', async (event) => {
        return loadVoices(event.sender);
    });

    // Add handler for opening file location
    ipcMain.on('open-file-location', (event, filePath) => {
        if (filePath) {
            shell.showItemInFolder(filePath);
        }
    });
}

function teardownTTSHandlers() {
    if (ttsWorker) {
        ttsWorker.terminate();
        ttsWorker = null;
    }
}

module.exports = {
    setupTTSHandlers,
    teardownTTSHandlers
};