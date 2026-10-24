import { defineConfig } from '@obsidian-plugin-toolkit/vite/config';
import path from 'node:path';

export default defineConfig(({ command }) => {
  const dirname = import.meta.dirname;
  const prod = command === 'build';
  return {
    entryPoints: ['src/main.ts', 'src/styles.css'],
    manifestPath: path.resolve(dirname, 'manifest.json'),
    outDir: prod
     ? path.resolve(dirname, 'dist', 'production')
     : path.resolve(dirname, 'dist', 'development'),
  }
})