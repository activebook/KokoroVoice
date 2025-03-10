import { app, BrowserWindow, nativeTheme, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupTTSHandlers, teardownTTSHandlers } from './tts-service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
    mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
    // Set up the TTS handlers
    setupTTSHandlers()

    createWindow()

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
