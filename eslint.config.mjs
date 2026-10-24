// @ts-check
/// <reference types="node" />
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import eslintReact from '@eslint-react/eslint-plugin'
import boundaries from 'eslint-plugin-boundaries'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
})

export default [
	{
		// We don't specify ignores here since we specify files directly in the package.json scripts
		// When we have a use case for ignores, we can add them here.
		ignores: [],
	},
	...compat.extends('prettier', 'eslint:recommended', 'plugin:@typescript-eslint/recommended'),
	eslintReact.configs['recommended-typescript'],
	{
		plugins: {
			'@typescript-eslint': typescriptEslint,
		},
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: ['./tsconfig.json', './tsconfig.node.json'],
				tsconfigRootDir: __dirname,
			},
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
		},
	},
	{
		// Layer boundaries: obsidian = platform, tldraw = app, plugin = the only
		// glue layer between them, shared (utils/lib/types/assets) = pure helpers.
		files: ['src/**/*.ts', 'src/**/*.tsx'],
		plugins: {
			boundaries,
		},
		settings: {
			'import/resolver': {
				node: {
					extensions: ['.ts', '.tsx', '.js', '.jsx'],
					// resolves the project's `src/...` specifiers (tsconfig baseUrl ".")
					moduleDirectory: ['node_modules', '.'],
				},
			},
			'boundaries/files': [{ category: 'entry', pattern: 'src/main.ts' }],
			'boundaries/elements': [
				{ type: 'obsidian', pattern: 'src/obsidian', partialMatch: false },
				{ type: 'tldraw', pattern: 'src/tldraw', partialMatch: false },
				{ type: 'plugin', pattern: 'src/plugin', partialMatch: false },
				{
					type: 'shared',
					pattern: ['src/utils', 'src/lib', 'src/types', 'src/assets'],
					partialMatch: false,
				},
			],
		},
		rules: {
			'boundaries/no-unknown-files': 'error',
			'boundaries/dependencies': [
				'error',
				{
					default: 'disallow',
					checkAllOrigins: true,
					checkUnknownLocals: true,
					policies: [
						// Externals are broadly allowed; targeted bans below override (last match wins).
						{ allow: { to: { module: { origin: ['external', 'core'] } } } },
						{ from: { element: { type: 'plugin' } }, allow: { to: { element: { type: '*' } } } },
						{
							from: { element: { type: 'obsidian' } },
							allow: { to: { element: { type: ['obsidian', 'shared'] } } },
						},
						{
							from: { element: { type: 'tldraw' } },
							allow: { to: { element: { type: ['tldraw', 'shared'] } } },
						},
						{
							from: { element: { type: 'shared' } },
							allow: { to: { element: { type: 'shared' } } },
						},
						{
							from: { file: { categories: 'entry' } },
							allow: { to: { element: { type: 'plugin' } } },
						},
						{
							from: { element: { type: ['tldraw', 'shared'] } },
							disallow: { to: { module: { origin: 'external', source: 'obsidian' } } },
							message:
								'only the obsidian and plugin layers may import the obsidian package',
						},
						{
							from: { element: { type: ['obsidian', 'shared'] } },
							disallow: {
								to: { module: { origin: 'external', source: ['tldraw', '@tldraw/*'] } },
							},
							message: 'only the tldraw and plugin layers may import tldraw packages',
						},
					],
				},
			],
		},
	},
]
