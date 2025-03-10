import * as fs from 'fs/promises';
import path from 'path'
import { fileURLToPath } from 'url'
import toml from '@iarna/toml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Utility function to pause execution for a specified time
 * @param {number} ms - Time to sleep in milliseconds
 * @returns {Promise} Promise that resolves after the specified time
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateFilename(prefix = 'speech') {
    const now = new Date();

    // Format: YYMMDD-HHMMSS
    const year = now.getFullYear().toString().slice(-2); // last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // months are 0-indexed
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
    return `${prefix}_${timestamp}.wav`;
}

export async function loadConfig() {
    try {
        // Load base config
        const configPath = path.join(__dirname, 'config.toml');
        const configFile = await fs.readFile(configPath, 'utf8');
        const config = toml.parse(configFile);
        return config;
    } catch (err) {
        console.error('Error loading config:', err);
    }
}
