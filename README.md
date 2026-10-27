# tldraw in Obsidian Plugin

https://github.com/holxsam/holxsam/assets/41220650/1786cc75-3a15-431f-b13a-e8f51cfde952

This Obsidian plugin allows users to use [tldraw](https://tldraw.com), which is a tiny little drawing app, inside of Obsidian. Users can draw, plan, and use all of tldraw's tools to augment their Obsidian experience. The data for each drawing is stored as a regular markdown file similar to the Excalidraw plugin meaning users will always have access to their data in plain markdown. Users have the option to switch between the tldraw view or the markdown view in case they wish to include backlinks, tags, or any other elements to facilitate linking their drawings with their existing knowledge base.

TIP: You can toggle between the view modes, using the command palette, keyboard shortcuts, status bar toggle at the bottom right, file menu, and context menu. See the plugin settings tab for customization options as well.

## Plugin Usage Guides

- [Custom icons and fonts](https://github.com/tldraw/obsidian-plugin/issues/58#issue-2571070259)
- [Customizing embeds](https://github.com/tldraw/obsidian-plugin/issues/59)

## Installation

tldraw in Obsidian is now available on the official community plugins list! 

- [Open the tldraw plugin page in Obsidian](obsidian://show-plugin?id=tldraw)
- You can also find it by going into `Settings` > `Community plugins` > `Browse` > `Type 'tldraw'` > `Install`.

## Network use

The plugin makes network requests in these cases:

- **tldraw CDN.** By default, the tldraw editor loads its fonts, icons and translations from `https://cdn.tldraw.com` when a drawing is opened. You can avoid this by downloading the assets in the plugin's settings. After that, the editor uses the local copies.
- **Optional asset downloads.** When you use the download buttons in the plugin's settings, the plugin fetches tldraw's font and icon files from `https://cdn.jsdelivr.net` (the `@tldraw/assets` npm package). Nothing is downloaded unless you ask for it.
- **tldraw license tracking.** The tldraw library requests a small image from `https://cdn.tldraw.com` to record that the library, under the plugin's license, was used. The request includes the tldraw version, the license type and ID, and Obsidian's app address (`app://obsidian.md/index.html`). It does not include your vault name, file names or note contents.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to build and test the plugin.

## Contributions

This plugin was created by [Sam Alhaqab](https://github.com/szamsolo), the original author whose initial contributions kickstarted the beginning of using tldraw within Obsidian. So a huge shoutout to him!

-   If you have a feature idea or want to report a bug, please open an [issue](https://github.com/tldraw/obsidian-plugin/issues). See [CONTRIBUTING.md](./CONTRIBUTING.md) for how the plugin is built, tested and released.

## License and Attribution

All [tldraw's](https://github.com/tldraw/tldraw) code is theirs. Also shout out to the [Excalidraw plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) for inspiration on how I should structure this tldraw plugin.
