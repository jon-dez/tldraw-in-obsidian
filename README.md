# Obsidian Plugin

This directory contains the source code for the Obsidian plugin.

Plugin repository: https://github.com/tldraw-in-obsidian/tldraw-in-obsidian

## Structure

- `src/` - Source code for the Obsidian plugin
- `dist/` - Compiled output (generated during build)
  - `development/` - Development build
  - `production/` - Production build

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

## Using the plugin

To use this plugin in Obsidian, copy the contents of the development or production directory into the Obsidian plugins directory and enable the plugin in the community plugins tab.
