const { parentPort } = require('worker_threads');
const path = require('path');
const { generateFilename } = require('./utils');
const STATUS = require('./status');
const { KokoroTTS } = require("kokoro-js");
const { getAndSetProxyEnvironment } = require("./sys_proxy");

// ***First set the proxy, otherwise kokoro-js won't work***
getAndSetProxyEnvironment();

/**
 * modules (like those built with N-API) are typically expected to be loaded and registered a single time per process. 
 * When you load the module in a worker thread for the second time, 
 * the module’s internal state (or its static initialization) may already be set, 
 * and the module isn’t re-initialized, leading to the “did not self-register” error.
 */
let ttsModel = null;

// Initialize the model only once
async function initModel() {
    if (!ttsModel) {
        // Load just once
        //console.log('Loading TTS model...');
        // Use this to properly resolve model paths
        // Set before initializing kokoro-tts
        // KokoroTTS use huggingface, so you cannot use app.asar to package
        // It won't find files under app.asar which is not a folder
        // So set package.json build asar:false
        
        // "fp32"|"fp16"|"q8"|"q4"|"q4f16"
        ttsModel = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', { dtype: 'q8' });

        //console.log('TTS model loaded successfully!');
    }
    return ttsModel;
}

async function generateSpeech(text, voice, dir, prefix) {
    try {
        const filename = generateFilename(prefix);
        const outputPath = path.join(dir, filename);

        const tts = await initModel();
        //tts.list_voices();
        const audio = await tts.generate(text, {
            // Use `tts.list_voices()` to list all available voices
            voice: voice,
        });
        audio.save(outputPath);
        //console.log(`Generated speech saved to ${outputPath}`);

        // Send result back to main thread
        const progress = {
            status: STATUS.KOKORO_SERVICE_STATUS_DONE,
            message: outputPath
        };
        if (parentPort) parentPort.postMessage(progress);

        // Here we'd normally generate the actual audio file
        // For now, we'll return the path where it would be saved
        return outputPath;
    } catch (error) {
        const progress = {
            status: STATUS.KOKORO_SERVICE_STATUS_ERROR,
            message: `Error generating speech:, ${error}`
        };
        if (parentPort) parentPort.postMessage(progress);
        console.error('TTS job failed:', progress.message);
    }
}

parentPort.on('message', async (data) => {
    let { text, voice, dir, prefix } = data;
    if (text.trim() === "") {
        const progress = {
            status: STATUS.KOKORO_SERVICE_STATUS_ERROR,
            message: "No text provided to TTS"
        };
        parentPort.postMessage(progress);
        return;
    }
    if (!voice || (voice && voice.trim() === "")) {
        voice = 'af_heart';
    }
    if (!prefix || (prefix && prefix.trim() === "")) {
        prefix = 'voice';
    }

    //console.log('Received TTS request:', text)

    // Run the calculation and send completion
    //const result = await generateSpeech(text);

    // Don't need to await
    generateSpeech(text, voice, dir, prefix);

    //console.log('TTS job done saved path:', result)
});


/**
 * =================================
 * Blow down here is for testing purposes only
 * Comment out the following line to test
 * import { ipcMain } from 'electron'
 * =================================
 */

const { exec } = require('child_process');

function playAudio(path) {
    return new Promise((resolve, reject) => {
        const playCommand = process.platform === 'win32'
            ? `start /B powershell -c (New-Object Media.SoundPlayer \'${path}\').PlaySync()`
            : process.platform === 'darwin'
                ? `afplay ${path}`
                : `aplay ${path}`;

        exec(playCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                reject(error);
                return;
            }
            resolve();
        });
    });
}

async function test() {
    // need to commend out the following line
    //import { ipcMain } from 'electron'
    const text = 'Hello, this is Kokoro TTS in Node.js.';
    const filepath = await generateSpeech(text);
    await playAudio(filepath);
}
//test();