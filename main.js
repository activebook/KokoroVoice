const { app, BrowserWindow, nativeTheme, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { setupTTSHandlers, teardownTTSHandlers } = require('./tts-service');
const { setAppUserDataDir } = require('./utils');

// You don't need fileURLToPath in CommonJS since __dirname is already available

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // recommended
            nodeIntegration: false // recommended
        }
    })

    mainWindow.loadFile('src/index.html')

    // Only for development
    //mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
    // Make sure the user data directory exists
    prepareUserDataDir();

    // Set up the TTS handlers
    setupTTSHandlers();

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('will-quit', () => {
    // Tear down the TTS handlers
    teardownTTSHandlers()
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

/**
 * On macOS: ~/Library/Application Support/[Your App Name]
 * On Windows: %APPDATA%[Your App Name]
 * On Linux: ~/.config/[Your App Name]
 */
function prepareUserDataDir() {
    // Get user data directory (safe for read/write operations)
    const userDataPath = app.getPath('userData');
    const kokoroVoicePath = path.join(userDataPath, 'kokorovoice');

    // Create directory if it doesn't exist
    fs.mkdir(kokoroVoicePath, { recursive: true });
    setAppUserDataDir(kokoroVoicePath);
}

ipcMain.on('main-process-log', (event, ...args) => {
    console.log(...args) // This will show in terminal
})

ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
        nativeTheme.themeSource = 'light'
    } else {
        nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
})
