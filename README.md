# HMP Hogwarts API

Visual Studio Code extension for Hogwarts MP resource development.

HMP Hogwarts API provides a development environment for creating and maintaining Hogwarts MP resources with TypeScript.

The extension integrates the active Hogwarts MP API contract directly into Visual Studio Code and provides IntelliSense, context-aware snippets, API browsing, symbol search, symbol documentation, API changelog tracking, resource generation, and extension updates through GitHub Releases.

The main goal is to make Hogwarts MP resource development faster, safer, easier to navigate, and easier to maintain across API updates.

---

## Quick Start

After installing the extension:

1. Open Visual Studio Code.
2. Press:

```text
Ctrl + Shift + P
```

3. Type:

```text
HMP
```

4. Visual Studio Code will show the available HMP Hogwarts API commands.

Available commands include:

```text
HMP: Search Hogwarts API Symbols
HMP: Show API Symbol Details
HMP: Show API Changelog
HMP: Show Extension Changelog
HMP: Check Extension Updates
HMP: Show Extension Version
HMP: Create New Resource
```

You can also access some commands by right-clicking folders or items inside the HMP API Explorer.

---

## Features

### Hogwarts MP API IntelliSense

The extension loads the bundled Hogwarts MP API declarations and makes them available directly inside Visual Studio Code.

This provides:

- API auto-completion.
- Type information.
- Hover documentation.
- Signature help.
- Go to definition.
- Symbol navigation.
- Context-aware suggestions.
- TypeScript diagnostics.

The extension understands the main Hogwarts MP development contexts:

```text
client/
server/
shared/
types/
```

This allows suggestions and API symbols to be filtered according to the file currently being edited.

---

## Context-aware snippets

HMP Hogwarts API provides snippets for commonly used Hogwarts MP development patterns.

Snippets are filtered according to the current project context.

Supported contexts include:

```text
Client
Server
Shared
Types
```

This helps prevent server-only APIs from being suggested in client files and vice versa.

---

## API Explorer

The extension includes an API Explorer directly inside the Visual Studio Code sidebar.

The API contract can be browsed by context:

```text
Client
Server
Shared
```

The explorer can expose information about:

- Functions.
- Classes.
- Interfaces.
- Types.
- Properties.
- Methods.
- Events.
- Parameters.
- Return types.
- Documentation.

The API Explorer is generated from the active Hogwarts MP API contract.

---

## API Symbol Search

Use:

```text
HMP: Search Hogwarts API Symbols
```

to search across the complete API contract.

This is useful when you know the name of an API, event, class, method, or type but do not know where it is declared.

The search covers the available:

```text
Client
Server
Shared
```

API contexts.

---

## API Symbol Details

Use:

```text
HMP: Show API Symbol Details
```

to inspect detailed information about an API symbol.

The symbol details view can include:

- Symbol name.
- API context.
- Declaration path.
- Signature.
- Parameters.
- Return type.
- Documentation.

When the command is launched directly from the Command Palette without a selected API Explorer item, the extension automatically opens the API symbol picker first.

This allows the command to work both from:

```text
Command Palette
API Explorer
```

---

## Go to Definition

The extension integrates the Hogwarts MP declaration files with Visual Studio Code navigation.

When supported by the current TypeScript context, you can use:

```text
F12
```

or:

```text
Go to Definition
```

to navigate directly to the declaration of an API symbol.

---

## Hover Documentation

Hover over supported Hogwarts MP API symbols to inspect available documentation without leaving the current source file.

Hover information may contain:

- Symbol signature.
- Parameter information.
- Return information.
- API documentation.

---

## Signature Help

When calling Hogwarts MP functions and methods, Visual Studio Code can display the expected function signature and parameter information.

For example:

```ts
player.setHealth("max");
```

the editor can use the active API contract to provide information about the accepted parameters.

---

# Hogwarts MP API Contract

The extension maintains a bundled Hogwarts MP API contract.

The contract is used by:

- IntelliSense.
- API Explorer.
- API symbol search.
- Symbol details.
- TypeScript development support.
- API changelog generation.

The currently bundled contract can be updated when a newer Hogwarts MP API version becomes available.

---

# API Changelog System

One of the main features of HMP Hogwarts API is API contract comparison.

When a newer Hogwarts MP contract is installed, the extension can compare the new contract against the previous one.

The result is stored as an API changelog.

Use:

```text
HMP: Show API Changelog
```

to open the changelog viewer.

---

## Changelog History

API changelogs are stored persistently.

Installing a new API contract does not remove previous comparisons.

The changelog viewer provides a version selector that allows you to inspect previous API changes.

For example:

```text
Hogwarts MP API 1.6.0 → 1.8.2
Hogwarts MP API 1.8.2 → 1.9.0
Hogwarts MP API 1.9.0 → 2.0.0
```

depending on the contracts that have been installed.

---

## Changelog Categories

Changes are classified into:

```text
Added
Changed
Removed
Potential Breaking Changes
```

They are also grouped by API context:

```text
Client
Server
Shared
```

This makes large API updates easier to inspect.

---

## Changed Symbols

When a symbol changes, the changelog can display information such as:

```text
Before
After
Documentation
Reason
```

Example:

```text
Changed: Player.respawn

Before:
respawn(): boolean;

After:
respawn(options?: RespawnOptions): boolean;

Reason:
The callable signature changed.
```

This helps developers understand whether an existing resource may need to be updated.

---

## Removed Symbols

Removed API symbols are reported explicitly.

Example:

```text
Removed: SomeOldFunction

Reason:
Symbol removed from the API contract.
```

This helps identify code that may stop compiling after an API update.

---

## Potential Breaking Changes

The changelog analyzer can identify changes that may require modifications to existing resources.

Examples include:

- Removed symbols.
- Changed callable signatures.
- Required parameters added.
- Return type changes.
- Other incompatible declaration changes.

These are displayed separately as:

```text
Potential Breaking Changes
```

---

# Resource Generator

HMP Hogwarts API includes a built-in Hogwarts MP resource generator.

You can create a resource by right-clicking a folder and selecting:

```text
HMP: Create New Resource
```

or by running the same command from the Command Palette.

---

## Resource Naming

Generated resources automatically use the:

```text
hmp-
```

prefix.

For example:

```text
inventory
```

becomes:

```text
hmp-inventory
```

and:

```text
deathscreen
```

becomes:

```text
hmp-deathscreen
```

This keeps resource naming consistent across the project.

---

## Generated Resource Structure

Depending on the selected generator options, a resource can contain:

```text
hmp-example/
├─ client/
│  └─ main.ts
│
├─ server/
│  └─ main.ts
│
├─ types/
│  └─ index.ts
│
├─ scripts/
│  └─ build.mjs
│
├─ package.json
├─ tsconfig.json
└─ README.md
```

The exact structure depends on the selected resource configuration.

---

## Generated TypeScript Configuration

Generated resources are configured for Hogwarts MP TypeScript development.

The generated TypeScript configuration can include settings such as:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "useUnknownInCatchVariables": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noEmit": true,
    "moduleDetection": "force"
  }
}
```

Generated projects can also include Hogwarts MP API declarations from the shared project types directory.

---

## Optional Resource Configuration

The Resource Generator can create additional project files depending on the selected options.

These may include:

- JSON configuration templates.
- TypeScript build configuration.
- Client entry points.
- Server entry points.
- Shared types.
- Environment variable examples.
- Resource metadata.

---

# Extension Changelog

The extension has its own changelog, separate from the Hogwarts MP API changelog.

Use:

```text
HMP: Show Extension Changelog
```

to inspect changes made to the Visual Studio Code extension.

The extension changelog can contain information about:

- New extension features.
- Resource Generator improvements.
- API Explorer changes.
- Changelog viewer changes.
- Updater improvements.
- Bug fixes.
- Internal development changes.

---

# GitHub Releases Updater

HMP Hogwarts API uses GitHub Releases for extension update checks.

Cloudflare R2 or a custom update manifest is not required.

The default GitHub repository is:

```text
Infernalz92/HPM-VSExtension
```

The corresponding GitHub API endpoint is:

```text
https://api.github.com/repos/Infernalz92/HPM-VSExtension/releases/latest
```

---

## GitHub Repository Configuration

The repository can be changed from Visual Studio Code settings.

```json
{
  "hmpHogwartsApi.githubRepository": "Infernalz92/HPM-VSExtension"
}
```

The value must use the following format:

```text
OWNER/REPOSITORY
```

Example:

```text
Infernalz92/HPM-VSExtension
```

---

## GitHub API Configuration

The default GitHub API endpoint is:

```text
https://api.github.com
```

It can be configured with:

```json
{
  "hmpHogwartsApi.githubApiBaseUrl": "https://api.github.com"
}
```

Normally this setting does not need to be changed.

---

# Release Format

Each stable extension release should use a semantic version tag.

Example:

```text
v0.4.3
```

Recommended release title:

```text
HMP Hogwarts API 0.4.3
```

The release should contain the compiled VSIX.

Recommended filename:

```text
HMP-Hogwarts-API-v0.4.3.vsix
```

---

## Release Example

A GitHub Release can look like:

```text
HMP Hogwarts API 0.4.3

Tag:
v0.4.3

Assets:
HMP-Hogwarts-API-v0.4.3.vsix
```

The GitHub Release description is used as the extension changelog.

Example:

```markdown
## Added

- GitHub Releases based updater.
- GitHub release changelog support.

## Changed

- Removed the Cloudflare R2 update manifest.
- Improved API changelog rendering.

## Fixed

- Fixed API Symbol Details when launched from the Command Palette.
```

---

# Update Process

The updater works approximately as follows:

```text
Visual Studio Code
        │
        ▼
GitHub REST API
        │
        ▼
Latest stable release
        │
        ├── tag_name
        ├── release body
        └── assets
        │
        ▼
Compare versions
        │
        ▼
Download VSIX
        │
        ▼
Verify checksum when available
        │
        ▼
Install update
```

The release:

```text
tag_name
```

determines the available version.

The release:

```text
body
```

is used as the changelog.

The release:

```text
assets
```

are inspected to locate the VSIX.

---

# VSIX Asset Detection

The updater first searches for the expected versioned asset.

Example:

```text
HMP-Hogwarts-API-v0.4.3.vsix
```

It also supports alternative recognized names.

If the release contains only one `.vsix` asset, that asset can be selected automatically.

---

# SHA-256 Verification

The updater can verify the downloaded VSIX before installation.

The preferred source is the GitHub asset digest when GitHub provides:

```text
sha256:<digest>
```

The updater can also use checksum assets such as:

```text
HMP-Hogwarts-API-v0.4.3.vsix.sha256
SHA256SUMS.txt
checksums.txt
```

If a SHA-256 checksum is available, the downloaded VSIX is validated before installation.

---

# Automatic Update Checks

Automatic extension update checks can be controlled by the extension settings.

The update interval is configured through:

```text
hmpHogwartsApi.extensionCheckIntervalHours
```

Public GitHub repositories do not require a GitHub authentication token for normal version checks.

---

# Development

## Requirements

To develop and build HMP Hogwarts API you need:

- Node.js.
- npm.
- Visual Studio Code.
- Git.

A recent Node.js LTS release is recommended.

Verify the installation with:

```powershell
node --version
npm --version
git --version
```

---

# Clone the Repository

Clone the source repository:

```powershell
git clone https://github.com/Infernalz92/HPM-VSExtension.git
```

Enter the project:

```powershell
cd HPM-VSExtension
```

---

# Install Dependencies

Install the dependencies defined in `package.json`:

```powershell
npm install
```

This creates:

```text
node_modules/
```

locally.

The `node_modules` directory should not be committed to Git.

---

# TypeScript Check

Before building the extension, verify the TypeScript source:

```powershell
npm run check
```

This runs:

```powershell
tsc -p tsconfig.json --noEmit
```

The command performs type checking without generating JavaScript output.

A release should not be packaged while TypeScript errors are present.

---

# Build

Build the extension with:

```powershell
npm run build
```

The build process uses the project build script and generates the runtime JavaScript files required by the extension.

Generated output is placed in:

```text
dist/
```

---

# Package the Extension

The complete extension package can be generated with:

```powershell
npm run package
```

The package script performs the configured validation/build steps and invokes VSCE to create the installable extension package.

The generated file will normally be similar to:

```text
hmp-hogwarts-api-0.4.3.vsix
```

---

# Recommended Release Filename

For GitHub Releases, rename the generated VSIX to:

```text
HMP-Hogwarts-API-v0.4.3.vsix
```

On PowerShell:

```powershell
Rename-Item `
  .\hmp-hogwarts-api-0.4.3.vsix `
  .\HMP-Hogwarts-API-v0.4.3.vsix
```

---

# Manual VSIX Packaging

You can also invoke VSCE directly.

```powershell
npx @vscode/vsce package
```

To specify the output filename:

```powershell
npx @vscode/vsce package --out HMP-Hogwarts-API-v0.4.3.vsix
```

---

# Complete Build Workflow

A normal development build can use:

```powershell
npm install
npm run check
npm run build
```

A release build can use:

```powershell
npm install
npm run check
npm run build
npm run package
```

Then rename the VSIX if necessary:

```powershell
Rename-Item `
  .\hmp-hogwarts-api-0.4.3.vsix `
  .\HMP-Hogwarts-API-v0.4.3.vsix
```

---

# Installing a Local Build

A locally generated VSIX can be installed manually from Visual Studio Code.

Open the Command Palette and use:

```text
Extensions: Install from VSIX...
```

Then select:

```text
HMP-Hogwarts-API-v0.4.3.vsix
```

Reload Visual Studio Code when requested.

---

# Publishing a Release

After building and testing the extension, publish it through GitHub Releases.

## 1. Update the version

Update:

```json
{
  "version": "0.4.4"
}
```

in:

```text
package.json
```

when preparing the next release.

---

## 2. Update the extension changelog

Update:

```text
CHANGELOG.md
```

with the changes introduced in the new version.

---

## 3. Run validation

```powershell
npm install
npm run check
npm run build
```

All checks should complete successfully.

---

## 4. Package the extension

```powershell
npm run package
```

or:

```powershell
npx @vscode/vsce package --out HMP-Hogwarts-API-v0.4.4.vsix
```

---

## 5. Commit the source

```powershell
git add .
git commit -m "Release HMP Hogwarts API 0.4.4"
git push
```

---

## 6. Create the Git tag

```powershell
git tag v0.4.4
git push origin v0.4.4
```

---

## 7. Create a GitHub Release

Open:

```text
GitHub
→ Repository
→ Releases
→ Draft a new release
```

Use:

```text
Tag:
v0.4.4

Title:
HMP Hogwarts API 0.4.4
```

Attach:

```text
HMP-Hogwarts-API-v0.4.4.vsix
```

Add the release notes and publish the release.

Once published, installed copies of the extension can detect the new version through the GitHub Releases API.

---

# Repository Structure

Recommended repository structure:

```text
HPM-VSExtension/
├─ src/
│  ├─ extension.ts
│  ├─ extensionUpdater.ts
│  ├─ changelog.ts
│  ├─ resourceGenerator.ts
│  ├─ apiIndex.ts
│  └─ ...
│
├─ resources/
│  ├─ contract/
│  ├─ changelog-history/
│  └─ ...
│
├─ media/
│
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ esbuild.mjs
├─ README.md
├─ CHANGELOG.md
├─ LICENSE
└─ .gitignore
```

---

# Files That Should Not Be Committed

Generated or local development files should normally not be committed:

```text
node_modules/
dist/
*.vsix
*.zip
.env
.env.*
```

The source files and configuration required to reproduce the build should remain in the repository.

---

# Recommended `.gitignore`

```gitignore
node_modules/
dist/

*.vsix
*.zip

.env
.env.*
!.env.example

.DS_Store
Thumbs.db
```

---

# `package.json` Repository Configuration

The extension manifest should contain the GitHub repository information:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/Infernalz92/HPM-VSExtension.git"
  },
  "homepage": "https://github.com/Infernalz92/HPM-VSExtension",
  "bugs": {
    "url": "https://github.com/Infernalz92/HPM-VSExtension/issues"
  }
}
```

This information is used by VSCE and allows users to identify the source repository associated with the extension.

---

# Extension Configuration

Example Visual Studio Code configuration:

```json
{
  "hmpHogwartsApi.githubRepository": "Infernalz92/HPM-VSExtension",
  "hmpHogwartsApi.githubApiBaseUrl": "https://api.github.com"
}
```

Additional HMP Hogwarts API settings can be configured through the Visual Studio Code Settings interface.

---

# Source Code and Releases

The GitHub repository contains the extension source code.

Compiled `.vsix` packages should normally be distributed through:

```text
GitHub Releases
```

instead of being committed directly to the repository.

This keeps the repository focused on development while providing clean versioned downloads for users.

---

# Versioning

HMP Hogwarts API uses semantic-style versioning:

```text
MAJOR.MINOR.PATCH
```

Example:

```text
0.4.3
```

GitHub release tags use the `v` prefix:

```text
v0.4.3
```

The extension package version itself remains:

```text
0.4.3
```

---

# Project Goals

HMP Hogwarts API is intended to provide a central development tool for the Hogwarts MP ecosystem.

Its goals include:

- Making the Hogwarts MP API easier to discover.
- Providing accurate TypeScript development support.
- Reducing mistakes caused by using APIs in the wrong context.
- Making API migrations easier to understand.
- Providing structured API changelogs.
- Standardizing the creation of `hmp-*` resources.
- Providing a reproducible resource project structure.
- Keeping the development extension automatically up to date.
- Centralizing Hogwarts MP development tooling inside Visual Studio Code.

---

# License

See:

```text
LICENSE
```

for licensing information.
