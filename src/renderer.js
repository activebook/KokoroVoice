// src/renderer.js
/**
 * This direct import won't work and isn't secure with context isolation. 
 * Instead, all Electron functionality for the renderer should be:
 * Imported in the preload script
 * Exposed through contextBridge in a controlled way
 * Accessed in renderer.js through the window object (like window.api.methodName())
 */
//import { ipcRenderer } from 'electron'

const STATUS = {
    STATUS_TYPE_SUCESS: "success",
    STATUS_TYPE_ERROR: "error",
    STATUS_TYPE_INFO: "info",
    STATUS_TYPE_LOADING: "loading"
}

// src/renderer.js
document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const convertBtn = document.getElementById('convert-btn');
    const audioPlayer = document.getElementById('audio-player');
    const openFileBtn = document.getElementById('open-file-btn');
    const voiceSelect = document.getElementById('voice-select');

    // Status functionality
    function showStatus(type, message) {
        const statusContainer = document.getElementById('status-container');
        const statusInner = document.getElementById('status-inner');
        const statusIcon = document.getElementById('status-icon');
        const statusMessage = document.getElementById('status-message');

        // Set the appropriate classes based on status type
        statusContainer.className = 'w-full mb-6 overflow-hidden transition-all duration-300';

        // Clear any previous status classes
        statusInner.classList.remove('bg-green-50', 'bg-red-50', 'bg-blue-50', 'bg-purple-50');
        statusContainer.classList.remove('bg-green-50', 'bg-red-50', 'bg-blue-50', 'bg-purple-50');
        statusMessage.classList.remove('text-green-700', 'text-red-700', 'text-blue-700', 'text-purple-700');
        statusIcon.innerHTML = '';

        // Add specific styling based on status type
        type = type.trim().toLowerCase()
        if (type === STATUS.STATUS_TYPE_SUCESS) {
            // Background color
            statusInner.classList.add('bg-green-50');
            statusContainer.classList.add('bg-green-50');
            statusMessage.classList.add('text-green-700');
            statusIcon.innerHTML = `<svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`;
        } else if (type === STATUS.STATUS_TYPE_ERROR) {
            // Background color
            statusInner.classList.add('bg-red-50');
            statusContainer.classList.add('bg-red-50');
            statusMessage.classList.add('text-red-700');
            statusIcon.innerHTML = `<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>`;
        } else if (type === STATUS.STATUS_TYPE_INFO) {
            // Background color
            statusInner.classList.add('bg-blue-50');
            statusContainer.classList.add('bg-blue-50');
            statusMessage.classList.add('text-blue-700');
            statusIcon.innerHTML = `<svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>`;
        } else if (type === STATUS.STATUS_TYPE_LOADING) {
            // Background color
            statusInner.classList.add('bg-purple-50');
            statusContainer.classList.add('bg-purple-50');
            statusMessage.classList.add('text-purple-700');
            statusIcon.innerHTML = `<svg class="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>`;
        }

        // Set the message
        statusMessage.textContent = message;

        // Show the container
        statusContainer.style.maxHeight = '100px';

        // Set up close button
        document.getElementById('close-status').addEventListener('click', hideStatus);
    }

    function hideStatus() {
        const statusContainer = document.getElementById('status-container');
        statusContainer.style.maxHeight = '0';
    }

    // Example usage:
    // showStatus('loading', 'Converting your text...');
    // showStatus('success', 'Conversion completed successfully!');
    // showStatus('error', 'Failed to convert. Please try again.');
    // showStatus('info', 'Using enhanced voice model.');

    // Load available voices dynamically (optional)
    async function loadVoices() {
        try {
            window.api.getAvailableVoices();
        } catch (error) {
            showStatus(STATUS.STATUS_TYPE_ERROR, `Failed to load voices. Please try again. ${error}`);
        }
    }

    // Load voices and update the select element
    let gFilePrefix = '';
    loadVoices();
    window.api.onVoicesRetrieved((voices, filePrefix) => {
        gFilePrefix = filePrefix;
        // Clear existing options
        voiceSelect.innerHTML = '';

        // Add each voice as an option
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = voice.name;
            voiceSelect.appendChild(option);
        });

        showStatus(STATUS.STATUS_TYPE_INFO, 'Click "Convert to Speech" to begin conversion.');
    });

    // Listen for conversion progress updates
    const cleanup = window.api.onConversionProgress((progress) => {
        if (progress.status === window.api.STATUS.KOKORO_SERVICE_STATUS_DONE) {
            // Update audio player with the new file
            const audioPath = progress.message
            audioPlayer.src = audioPath
            audioPlayer.style.display = 'block'

            // Reset button
            convertBtn.disabled = false
            convertBtn.textContent = 'Convert to Speech'

            // Show success message
            showStatus(STATUS.STATUS_TYPE_SUCESS, 'Conversion completed successfully!');
        } else if (progress.status === window.api.STATUS.KOKORO_SERVICE_STATUS_START) {
            showStatus(STATUS.STATUS_TYPE_INFO, 'Starting conversion...');
        } else if (progress.status === window.api.STATUS.KOKORO_SERVICE_STATUS_ERROR) {
            showStatus(STATUS.STATUS_TYPE_ERROR, `Error: ${progress.message}`);
        }
    })

    /** 
     * Convert text to speech click event
     */
    convertBtn.addEventListener('click', async () => {
        const text = textInput.value.trim()
        if (!text) {
            showStatus(STATUS.STATUS_TYPE_ERROR, 'Please enter some text to convert');
            return
        }

        const voice = voiceSelect.value;
        try {
            // Show loading state
            convertBtn.disabled = true
            convertBtn.textContent = 'Converting...'
            showStatus(STATUS.STATUS_TYPE_LOADING, 'Converting your text...');

            // Use the exposed API method
            // No need await here, as the conversion is handled asynchronously(in subthread)
            window.api.convertTextToSpeech(text, voice, gFilePrefix)

        } catch (error) {
            console.error('TTS conversion error:', error)

            // Show error message
            showStatus(STATUS.STATUS_TYPE_ERROR, `Error: ${error.message || 'Failed to convert text to speech'}`);

            // Reset button
            convertBtn.disabled = false
            convertBtn.textContent = 'Convert to Speech'
        }
    });

    /**
     * Open file location click event
     */
    openFileBtn.addEventListener('click', () => {
        const audioSrc = audioPlayer.src;
        if (audioSrc) {
            // For file:// protocol URLs
            const filePath = decodeURI(audioSrc).replace('file://', '');
            window.api.openFileLocation(filePath);
        } else {
            showStatus(STATUS.STATUS_TYPE_INFO, 'No audio file to open.');
        }
    });

    // Function to update button state based on audio src
    function updateButtonState() {
        if (!audioPlayer.src || audioPlayer.src === '' || audioPlayer.src === 'about:blank') {
            // Disable with Tailwind classes
            openFileBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            openFileBtn.setAttribute('disabled', 'true');
        } else {
            // Enable with Tailwind classes
            openFileBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            openFileBtn.removeAttribute('disabled');
        }4
    }
    // Update when audio source changes
    audioPlayer.addEventListener('loadedmetadata', updateButtonState);
    audioPlayer.addEventListener('error', updateButtonState);
    updateButtonState();

    /**
     * Below is the theme toggle functionality
     */
    const themeToggle = document.getElementById('theme-toggle');
    const toggleSlider = document.getElementById('toggle-slider');

    // Check for saved theme preference or use preferred color scheme
    const isDarkMode = localStorage.getItem('darkMode') === 'true' ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Set initial theme
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        toggleSlider.classList.remove('translate-x-1');
        toggleSlider.classList.add('translate-x-6');
        themeToggle.classList.remove('bg-gray-200');
        themeToggle.classList.add('bg-gray-600');
    }

    // Theme toggle click handler
    themeToggle.addEventListener('click', () => {
        // Toggle dark class on root html element
        document.documentElement.classList.toggle('dark');
        // Toggle system dark mode
        window.darkMode.toggle();

        // Move the slider
        if (document.documentElement.classList.contains('dark')) {
            toggleSlider.classList.remove('translate-x-1');
            toggleSlider.classList.add('translate-x-6');
            themeToggle.classList.remove('bg-gray-200');
            themeToggle.classList.add('bg-gray-600');
            localStorage.setItem('darkMode', 'true');
        } else {
            toggleSlider.classList.remove('translate-x-6');
            toggleSlider.classList.add('translate-x-1');
            themeToggle.classList.remove('bg-gray-600');
            themeToggle.classList.add('bg-gray-200');
            localStorage.setItem('darkMode', 'false');
        }
    });
});