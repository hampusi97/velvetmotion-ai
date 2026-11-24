# Private content backups

Open **Settings & Backup → Private content backup**. Export produces a portable `velvetmotion-backup-v3` JSON file containing supported local content and all eight main IndexedDB tables, including chat branches. It preserves embedded character portraits and includes favorite IDs, tiered memories, lorebooks, progression, matches, galleries and supported display preferences.

The file is **unencrypted** and can contain private conversations and images. Keep it private. Provider connections/API settings, login sessions, account records, age declarations and PINs are excluded. Credentials copied into a conversation or third-party character card remain part of that user content; the exporter does not redact text inside conversations or cards. Remote media bytes and VRM files in the separate avatar database are not bundled. Save those media/model files separately.

## Restore behavior

1. Choose a JSON file under 50 MB. The app validates its structure and presents a record-count preview before writing anything.
2. Leave **Keep current records** selected to preserve matching local records. New companion/gallery entries merge by ID and favorites combine. Existing chat content in either local storage or IndexedDB takes priority.
3. Choose **Use backup records for matching keys** only when you want matching records to use the backup version. Records absent from the backup are retained.
4. Click **Restore this backup**. Reload afterward to refresh all stateful views. If optional signed-in cloud sync is enabled, restored content may sync when you resume using the app.

Old V2 backups and supported flat key/value backups can be imported. Unsupported/security/provider keys are excluded and counted in the preview. A future schema, malformed content collection, duplicate database ID or invalid row rejects the import before any mutation. Older files cannot restore data they did not contain.

## Failure recovery

Main IndexedDB writes run in one transaction. On local-storage or database failure, database writes are aborted and the importer attempts to restore local values it changed. A concurrent tab's differing value is not overwritten during rollback. If browser storage also refuses a rollback write, the error explicitly states that recovery was incomplete; keep the original file, free storage, and retry. This is rollback handling across two stores, not an atomic cross-tab snapshot or a filesystem-level transaction.

No restore clears the database, silently evicts another companion, replaces every portrait with a stock character, or imports credentials into connection settings. Local content backups are separate from the older cloud metadata snapshot path.

## Cloud snapshot correction

The existing cloud writer previously sliced serialized JSON to fit the vault limit, potentially uploading invalid JSON. It now measures the full envelope and rejects oversized payloads without truncation, including multilingual/escaped content. A cloud sync reports success and updates its success time only when every requested document upload succeeds. This does not add cloud storage for portrait/video bytes or verify a live Firebase account.

## Verification

Unit and simulated IndexedDB tests cover portable portrait/branch/progression export, V2/legacy parsing, excluded credentials, invalid inputs, conflict merging and both early local-storage and later database failures. Desktop/mobile browser tests exercise the actual file input, preview, restore, download and companion-library refresh using synthetic content with external requests blocked.
