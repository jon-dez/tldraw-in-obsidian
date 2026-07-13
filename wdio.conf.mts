/// <reference types="wdio-obsidian-service" />
/// <reference types="webdriverio" />
import { browser } from '@wdio/globals'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = __dirname

// For testing multiple Obsidian versions or parallel instances, see
// https://github.com/jesse-r-s-hines/wdio-obsidian-service-sample-plugin/blob/main/wdio.conf.mts
// (parseObsidianVersions, OBSIDIAN_VERSIONS, WDIO_MAX_INSTANCES).

export const config: WebdriverIO.Config = {
	rootDir: projectRoot,
	runner: 'local',
	framework: 'mocha',
	specs: ['./test/specs/**/*.e2e.ts'],
	maxInstances: 1,
	capabilities: [
		{
			browserName: 'obsidian',
			browserVersion: 'latest',
			'wdio:obsidianOptions': {
				installerVersion: 'latest',
				plugins: [
					getTldrawPlugin(),
					path.join(projectRoot, 'test', 'vaults', 'test-package-modules', '.obsidian', 'plugins', 'test-plugin'),
				],
				vault: path.join(projectRoot, 'test', 'vaults', 'default'),
			},
			"goog:chromeOptions": {
        args: [
					...(process.env.OBSIDIAN_LAUNCHER_ARGS?.split(' ') ?? []),
          "--remote-debugging-port=9333",
        ],
      },
		},
	],
	services: ['obsidian'],
	reporters: ['obsidian'],
	cacheDir: path.join(projectRoot, '.wdio'),
	mochaOpts: {
		ui: 'bdd',
		timeout: 60000,
	},
	// Obsidian's window launches too small to fit some interactions (ribbon overflow, context-menu
	// flyout direction, viewport-relative drag coordinates in the specs). A launch-time --window-size
	// arg is racy under Wayland (compositor doesn't always honor the requested size on the first
	// configure), and WebDriver's setWindowSize / CDP's Browser.setWindowBounds are no-ops against
	// Electron's own BrowserWindow. So: poll the actual size and, if too small, correct it via
	// Electron's own renderer-exposed window handle — retrying rather than trusting a single attempt,
	// since that race can take more than one pass to resolve. Run before EVERY test (not just once
	// at session start): the window can get recreated mid-session (vault switch, plugin-enable
	// reload, etc.), silently reverting to the small default, and a one-time `before` hook misses that.
	beforeTest: async () => {
		await ensureWindowSize(1600, 1000)
	},
}

async function ensureWindowSize(targetWidth: number, targetHeight: number) {
	for (let attempt = 0; attempt < 5; attempt++) {
		const [width, height] = await browser.execute(() => [window.innerWidth, window.innerHeight])
		if (width >= targetWidth && height >= targetHeight) return
		await browser.execute(async (w, h) => {
			await (
				window as unknown as {
					electron: { remote: { getCurrentWindow(): { setSize(w: number, h: number): void } } }
				}
			).electron.remote.getCurrentWindow().setSize(w, h)
		}, targetWidth, targetHeight)
	}
	console.warn(
		`Could not grow the Obsidian window to ${targetWidth}x${targetHeight} after 5 attempts; specs may be flaky.`
	)
}

function getTldrawPlugin() {
	const version = process.env.TLDRAW_PLUGIN_VERSION
	if (version) {
		return {
			id: 'tldraw',
			version,
		}
	}

	const pluginDir = process.env.TLDRAW_PLUGIN_DIR ?? path.join(projectRoot, 'dist', 'production')

	if (!existsSync(pluginDir)) {
		console.error(`Plugin not found at "${pluginDir}".`)
		console.error('Please do one of the following:')
		console.error(`- Run 'npm run build' to generate the production plugin.`)
		console.error(
			'- Set the TLDRAW_PLUGIN_VERSION environment variable to the version of the plugin you want to test.'
		)
		console.error(
			'- Set the TLDRAW_PLUGIN_DIR environment variable to the directory of the plugin you want to test.'
		)
		process.exit(1)
	}

	return pluginDir
}
