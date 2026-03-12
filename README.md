XYRA Captions Update Registry
This folder contains the update manifest for the XYRA Captions desktop app.

The app uses a fixed embedded source URL:

https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/manifest.json

Users do not configure this URL in Settings anymore.

manifest.json Schema
Top-level fields
Field	Type	Description
schema_version	integer	Always 1 for this schema
manifest_version	string	Date-style version, for example "2026.03.12"
published_at	string	ISO 8601 publish timestamp
min_app_version	string (optional)	Minimum supported app version (semver)
max_app_version	string (optional)	Maximum supported app version (semver)
update_title	string (optional)	Headline for the update notice in the UI
update_text	string or array (optional)	Release text shown in the update notice
providers	array	Optional provider metadata entries
prompt_packs	array	Prompt templates for translation
ai_models	array	List of available AI models
accessibility_rules	array	Subtitle accessibility rule set
audit_rules	array	Compliance audit rule set
update_title and update_text are used by the Settings UI to show a visible update message.

ai_models entries
Common fields:

Field	Type	Description
id	string	Stable unique ID (do not change after publish)
name	string	Display name in marketplace
type	"offline" | "online"	Offline download or online API
role	string	transcription, translation, diarization, transcription_engine
provider_id	string	Internal provider key, for example whispercpp, openai, sherpa
size_bytes	integer	Approximate total download size
description	string	One-line marketplace description
Offline single file (download):

"download": {
  "url": "https://...",
  "filename": "target-filename.ext",
  "dest_dir": "models",
  "sha256": "optional-hex-hash",
  "allow_unverified": false,
  "archive_format": "zip | tar.bz2",
  "archive_entry": "path/inside/archive.ext",
  "extract_siblings": true
}
dest_dir: "models" or "binaries" (resolved under %LOCALAPPDATA%/XYRA Captions/)
archive_format and archive_entry: required for archive extraction
extract_siblings: if true, matching sibling DLL files are extracted too
sha256: strongly recommended for production
allow_unverified: only use true for temporary/dev entries without known hash
Offline bundle (bundle): same per-file fields as download, but as an array.

After install (settings_after_install): key/value settings written after successful install.

Online model:

{
  "requires_api_key": true,
  "settings_fields": ["ai_api_key", "transcription_provider"]
}
settings_fields controls where the UI scrolls when clicking setup.

providers entries
Informational metadata for UI/registry tooling.

Field	Type	Description
id	string	Provider key (openai, azure, anthropic, deepl, ollama, ...)
name	string	Display label
kind	"cloud" | "local"	Provider class
prompt_packs entries
Prompt packs are consumed by translation runtime and can be selected in Settings.

Field	Type	Description
id	string	Stable prompt-pack ID
name	string	Display label
template	string	Prompt template, supports {from_lang}, {to_lang}, {text}
accessibility_rules entries
Field	Type	Description
id	string	Rule ID
label	string	Human-readable label
value	number	Rule threshold
unit	string	seconds, cps, chars
audit_rules entries
Field	Type	Description
id	string	Rule ID
label	string	Human-readable label
severity	"error" | "warning"	Report severity
Runtime behavior
On startup, the app fetches the manifest from the embedded URL (10s timeout).
Parsed JSON is cached to %LOCALAPPDATA%/XYRA Captions/update-registry-cache.json.
If network fetch fails, cached JSON is used.
Manifest entries can be filtered automatically by app version (min_app_version / max_app_version).
Settings renders one card per model in AI Settings -> KI-Modelle.
If manifest_version changes (or release text is present on first run), a visible update notice is shown.
Publishing workflow
Edit manifest.json (bump manifest_version and published_at).
Optionally set update_title and update_text for release notes.
Commit and push to main.
Clients pick up the new version on next startup.
Note: Never change existing model id values. IDs are used to track install state.
