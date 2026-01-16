import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

// NOTE: This script reads the version from package.json but does NOT update it.
// The package.json version is the source of truth and should be updated separately
// (e.g., by a version bump script or manually). This script then cascades that
// version to manifest.json and versions.json in the release directory.

const packageJsonPath = path.join(import.meta.dirname, '..', 'package.json')
const releaseManifestJsonPath = path.join(import.meta.dirname, '..', 'release', 'manifest.json')
const releaseVersionsJsonPath = path.join(import.meta.dirname, '..', 'release', 'versions.json')

console.log('Reading package.json...')

// read plugin version from package.json
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
const targetVersion = packageJson.version

console.log('Package version:', targetVersion)

console.log('Reading manifest.json...')
// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync(releaseManifestJsonPath, 'utf8'))
const { minAppVersion } = manifest

if (manifest.version !== targetVersion) {
  console.log('Updating version in manifest.json...', manifest.version, '->', targetVersion)
  manifest.version = targetVersion
  writeFileSync(releaseManifestJsonPath, JSON.stringify(manifest, null, '\t'))
} else {
  console.log('Version in manifest.json is already up to date')
}

console.log('Reading versions.json...')

// update versions.json with target version and minAppVersion from manifest.json
let versions = JSON.parse(readFileSync(releaseVersionsJsonPath, 'utf8'))

if (versions[targetVersion] !== minAppVersion) {
  console.log('Updating versions.json...', versions[targetVersion], '->', minAppVersion)
  versions[targetVersion] = minAppVersion
  writeFileSync(releaseVersionsJsonPath, JSON.stringify(versions, null, '\t'))
} else {
  console.log('Version in versions.json is already up to date')
}
