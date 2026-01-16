# Obsidian Plugin

This directory contains the source code for the Obsidian plugin.

Plugin repository: https://github.com/tldraw-in-obsidian/tldraw-in-obsidian

## Structure

- `src/` - Source code for the Obsidian plugin
- `dist/` - Compiled output (generated during build)
  - `development/` - Development build
  - `production/` - Production build
- `release/` - Files that are needed for the plugin release
  - `manifest.json` 
  - `versions.json`

`manifest.json` and `versions.json` are updated by `yarn make-release-files` and should be committed if there are any changes.

## Development

To develop this plugin:

1. Follow the [setup instructions](../../README.md#local-development) to set up yarn and install dependencies.

2. Run the development server:
   ```bash
   # In this directory
   yarn dev
   # From the root workspace folder
   yarn dev-obsidian
   ```

3. The source code is located in `src/`. Changes will be automatically compiled to `dist/development/`.

## Building

To build the plugin for production:

```bash
yarn build
```

## Updating version

1. Manually modify the version inside the `package.json` file.

2. Run the `version` script to update the relevant files in `release/`
   ```bash
   yarn run version
   ```

## Packaging files for release

The following files are needed for a release:

- `main.js` - Release
- `styles.css` - Release
- `manifest.json` - Release, Repo
- `versions.json` - Repo

> **Repo**: Commit as a file in the root of the plugin release repository
>
> **Release**: Upload as part of the tagged release

Run the following command to generate the needed files:

```bash
yarn make-release-files [--package-out-dir=<directory>]
```

This command will:
1. Run `yarn version` to update `manifest.json` and `versions.json` in the `release/` directory
2. Run `yarn build` to build the production files
3. Run `yarn package --out-dir=<directory>` to copy all release files to the specified directory

> The `--package-out-dir` argument is forwarded to `yarn package` as `--out-dir`
>
> If `--package-out-dir` is not specified, files will be copied to the plugin directory root
>
> The `package` script also supports `--clean` to remove packaged files from a directory:
> ```bash
> yarn package --clean [--out-dir=<directory>]
> ```

## Using the plugin

To use this plugin in Obsidian, copy the contents of the development or production directory into the Obsidian plugins directory and enable the plugin in the community plugins tab.
