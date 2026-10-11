# HMP Hogwarts API Changelog

## 0.4.3

### Added
- GitHub Releases is now the extension update source.
- Added `hmpHogwartsApi.githubRepository`.
- Added `hmpHogwartsApi.githubApiBaseUrl`.
- GitHub Release notes are used directly as the extension changelog.
- SHA-256 verification uses the GitHub asset digest when available and supports checksum assets as a fallback.

### Changed
- Removed the Cloudflare/R2 update-manifest dependency.
- Extension version checks now call GitHub's `releases/latest` endpoint.
- VSIX downloads now use the release asset `browser_download_url`.
- `HMP: Show Extension Changelog` can display the current GitHub Release notes inside VS Code.

## 0.4.2

### Fixed
- Fixed **HMP: Show Extension Changelog** so it opens directly inside VS Code.
- The current installed changelog no longer depends on the remote manifest or an external browser.
- Remote update changelogs are rendered inside VS Code and fall back to the bundled changelog if the remote file cannot be loaded.
- Historical API changelogs created by older extension builds are normalized to English when displayed.

### Changed
- Removed the remaining Italian text from the bundled API changelog history.
- Added compatibility translation for legacy cached changelog phrases produced by older builds.
- Extension UI, output messages, Resource Generator, diagnostics, updater, API changelogs, and extension changelog are English-only.

# Changelog

## 0.4.1

### Fixed
- Fixed **HMP: Show API Symbol Details** when launched from the Command Palette without an Explorer item. It now opens the API symbol picker first.
- Added a defensive guard to the symbol detail renderer so an invalid or missing symbol can no longer crash the command.

### Changed
- Converted all extension UI, diagnostics, prompts, generated resource templates, updater messages, documentation, and changelog labels to English.
- API changelog history remains selectable so previous API comparisons can be reviewed.

## 0.4.0

### Added
- Persistent API changelog history.
- Version selector for previous API comparisons.
- Added / Changed / Removed / Potential breaking change summaries.
- Client / Server / Shared grouping and before/after signature details.

### Changed
- Renamed the extension and generated resources from NPX to HMP.
- Updated the bundled Hogwarts MP API contract to 1.8.2.
