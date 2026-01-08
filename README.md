# Tldraw in Obsidian Plugin

https://github.com/holxsam/holxsam/assets/41220650/1786cc75-3a15-431f-b13a-e8f51cfde952

This Obsidian plugin allows users to use [Tldraw](https://tldraw.com), which is a tiny little drawing app, inside of Obsidian. Users can draw, plan, and use all of Tldraw's tools to augment their Obsidian experience. The data for each drawing is stored as a regular markdown file similar to the Excalidraw plugin meaning users will always have access to their data in plain markdown. Users have the option to switch between the Tldraw view or the markdown view in case they wish to include backlinks, tags, or any other elements to facilitate linking their drawings with their existing knowledge base.

TIP: You can toggle between the view modes, using the command palette, keyboard shortcuts, status bar toggle at the bottom right, file menu, and context menu. See the plugin settings tab for customization options as well.

## Development Goals

The main goals of this plugin and repo is to keep up to date with the Tldraw's latest version and to add these features:

-   Preview the drawing when a tldraw file is referenced in markdown.
-   Add markdown notes into tldraw.
-   Export and import tools.

## Installation

### Community Plugins (Recommended)

Tldraw in Obsidian is now available on the official community plugins list! 

- Here's a link that will take you to the plugin page: `obsidian://show-plugin?id=tldraw` (paste in your browser's address bar).
- You can also find it by going into `Settings` > `Community plugins` > `Browse` > `Type 'tldraw'` > `Install`.

### Using BRAT

- Download `Obsidian42 - BRAT` from the community plugins.
- Go into the settings for `Obsidian42 - Brat` and select `Add Beta Plugin`
- Copy and paste this repo: `https://github.com/tldraw-in-obsidian/tldraw-in-obsidian`
- Go back `Community plugins` and make sure to enable `Tldraw`
- This is also the only way to get Tldraw in Obsidian on the mobile app as far as I know.

### Manual

-   Head over to [releases](https://github.com/tldraw-in-obsidian/tldraw-in-obsidian/releases) and download a release (latest is recommended).
-   Navigate to your plugin folder in your prefered vault: `VaultFolder/.obsidian/plugins/`
-   Create a new folder called `tldraw-in-obsidian`
-   Copy and paste over `main.js`, `styles.css`, `manifest.json` into the newly created `/tldraw-in-obsidian` folder.
-   Make sure you enable the plugin by going into Settings > Community plugins > Installed plugins > toggle 'Tldraw'.

## Guides

- [Custom icons and fonts](https://github.com/tldraw-in-obsidian/tldraw-in-obsidian/issues/58#issue-2571070259)
- [Customizing embeds](https://github.com/tldraw-in-obsidian/tldraw-in-obsidian/issues/59)

## Development

**NOTE:** The original source code was moved over to the tldraw monorepo under [`apps/obsidian`](./tldraw/apps/obsidian/).

- Clone this repo or a fork to a local development folder:
  ```bash
  git clone --recurse-submodules <repo-url>
  ```
  If you've already cloned without submodules, initialize them with:
  ```bash
  git submodule update --init --recursive
  ```

- Navigate to the tldraw submodule directory:
  ```bash
  cd tldraw
  ```

- Set up yarn by enabling [corepack](https://nodejs.org/api/corepack.html) to ensure you have the right version:
  ```bash
  npm i -g corepack
  ```

- Install dependencies:
  ```bash
  yarn
  ```

- Start developing:
  ```bash
  yarn dev-obsidian
  ```

- The output files in `apps/obsidian/dist/development/` can be copied into a folder within `.obsidian/plugins` directory to test the plugin in Obsidian.

- Make changes to the files in `apps/obsidian/src`. Those changes should be automatically compiled.

- To refresh your changes, go to Settings > Community Plugins > disable and enable the plugin. You can also close your vault and then reopen it but that's more bothersome.

## Contributions

This plugin was created by [Sam Alhaqab](https://github.com/szamsolo), the original author whose initial contributions kickstarted the beginning of using tldraw within Obsidian. So a huge shoutout to him!

-   This plugin is open to contributions. If you have a feature idea or want to report a bug, you can create an issue. If you are a developer wanting to fix a bug or add a feature to feel free to submit pull requests.!

## License and Attribution

All [Tldraw's](https://github.com/tldraw/tldraw) code is theirs, a few patches were made to address issues when using pop-out windows within Obsidian. Also shout out to the [Excalidraw plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) for inspiration on how I should structure this Tldraw plugin.
