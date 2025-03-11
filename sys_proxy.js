const { execSync } = require('child_process');

// This is a known issue with Undici's proxy handling in some configurations.
// In node, the proxy settings are not being picked up correctly.
// So we must set it manually by using system proxy settings through command.
const { setGlobalDispatcher, ProxyAgent } = require("undici");

// Method 2: Using the global-agent package (not recommended)
// No use!!!
// First install: npm install global-agent
//import { bootstrap } from 'global-agent';

// Enable the global agent (reads from env vars by default)
//bootstrap();


function getSystemProxy() {
	try {
		if (process.platform === 'win32') {
			// Windows - query registry
			const output = execSync('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD').toString();
			const isEnabled = output.includes('0x1');

			if (isEnabled) {
				const proxyServer = execSync('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ').toString();
				const match = proxyServer.match(/ProxyServer\s+REG_SZ\s+(.*)/);
				return match ? match[1].trim() : null;
			}
		} else if (process.platform === 'darwin') {
			// macOS
			const output = execSync('scutil --proxy').toString();
			// Parse the output to extract proxy information
			return output;
		} else {
			// Linux - check environment or gsettings
			const output = execSync('gsettings get org.gnome.system.proxy mode').toString();
			if (output.includes('manual')) {
				const httpProxy = execSync('gsettings get org.gnome.system.proxy.http host').toString();
				const httpPort = execSync('gsettings get org.gnome.system.proxy.http port').toString();
				return `${httpProxy.replace(/'/g, '').trim()}:${httpPort.trim()}`;
			}
		}
	} catch (error) {
		console.error('Error getting system proxy:', error.message);
	}

	return null;
}

function getAndSetProxyEnvironment() {

	// Set the global dispatcher to use your proxy for all fetch requests.
	let proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
	if (proxyUrl) {
		// If in the launch.js there is a proxy set, use that.
		setGlobalDispatcher(new ProxyAgent(proxyUrl));
		return proxyUrl;
	}


	try {
		// Get system proxy settings (assuming macOS based on output format)
		const proxyOutput = getSystemProxy();

		// Parse the output
		const proxySettings = {};
		const lines = proxyOutput.trim().split('\n');

		lines.forEach(line => {
			const match = line.match(/\s*(\w+)\s*:\s*(.*)/);
			if (match) {
				proxySettings[match[1]] = match[2].trim();
			}
		});

		// Check if HTTP proxy is enabled
		if (proxySettings.HTTPEnable === '1' && proxySettings.HTTPProxy && proxySettings.HTTPPort) {
			const httpProxy = `http://${proxySettings.HTTPProxy}:${proxySettings.HTTPPort}`;
			process.env.HTTP_PROXY = httpProxy;
			process.env.http_proxy = httpProxy;
		}

		// Check if HTTPS proxy is enabled
		if (proxySettings.HTTPSEnable === '1' && proxySettings.HTTPSProxy && proxySettings.HTTPSPort) {
			const httpsProxy = `http://${proxySettings.HTTPSProxy}:${proxySettings.HTTPSPort}`;
			process.env.HTTPS_PROXY = httpsProxy;
			process.env.https_proxy = httpsProxy;
		}

		// Check if SOCKS proxy is enabled
		if (proxySettings.SOCKSEnable === '1' && proxySettings.SOCKSProxy && proxySettings.SOCKSPort) {
			const socksProxy = `socks://${proxySettings.SOCKSProxy}:${proxySettings.SOCKSPort}`;
			process.env.SOCKS_PROXY = socksProxy;
		}

		// Set the global dispatcher to use your proxy for all fetch requests.
		proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
		setGlobalDispatcher(new ProxyAgent(proxyUrl));

		return proxySettings;
	} catch (error) {
		console.error('Error getting and setting proxy:', error.message);
		return null;
	}
}

module.exports = {
	getAndSetProxyEnvironment
};
