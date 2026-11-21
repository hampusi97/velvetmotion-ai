"use client";

import { useState } from "react";
import { Download, Upload, RefreshCw } from "lucide-react";
import { exportFullBackupJson, importFullBackupJson } from "@/lib/db";
import {
  BACKUP_TABLES,
  MAX_BACKUP_BYTES,
  previewDeviceBackup,
  type BackupPreview,
  type RestorePolicy,
} from "@/lib/deviceBackup";

export function DeviceBackupPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<{
    name: string;
    raw: string;
    preview: BackupPreview;
  } | null>(null);
  const [policy, setPolicy] = useState<RestorePolicy>("keep-existing");
  const [restored, setRestored] = useState(false);

  const download = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const json = await exportFullBackupJson();
      const url = URL.createObjectURL(
        new Blob([json], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `velvetmotion-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Content backup downloaded. Keep the unencrypted file private.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The backup could not be exported.",
      );
    } finally {
      setBusy(false);
    }
  };
  const inspect = async (file: File) => {
    setBusy(true);
    setError("");
    setNotice("");
    setPending(null);
    setRestored(false);
    try {
      if (file.size > MAX_BACKUP_BYTES)
        throw new Error("Choose a JSON backup under 50 MB.");
      const raw = await file.text();
      const preview = previewDeviceBackup(raw);
      setPolicy("keep-existing");
      setPending({ name: file.name, raw, preview });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The backup could not be read.",
      );
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    if (!pending) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await importFullBackupJson(pending.raw, policy);
      setNotice(
        `Restored ${result.restoredKeys} local values and ${result.restoredRows} database records. Existing records outside this backup were kept.`,
      );
      setPending(null);
      setRestored(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Restore failed. Keep your original backup file.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="device-backup-heading"
      className="space-y-3 rounded-2xl border border-violet-300/20 bg-violet-300/5 p-4"
    >
      <h3
        id="device-backup-heading"
        className="text-sm font-semibold text-violet-100"
      >
        Private content backup
      </h3>
      <p className="text-xs leading-6 text-zinc-300">
        Keep your companions, embedded portraits, saved chats, memories,
        progression and chat branches together.
      </p>
      <p className="text-xs leading-5 text-amber-100/90">
        The file is unencrypted. Provider connections, API settings, accounts
        and PINs are excluded. Remote media files and separately uploaded VRM
        models must be saved separately.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void download()}
          className="vm-secondary-button"
        >
          <Download className="h-4 w-4" /> Export content backup
        </button>
        <label className="vm-secondary-button cursor-pointer">
          <Upload className="h-4 w-4" /> Preview a backup
          <input
            aria-label="Choose content backup"
            type="file"
            accept=".json,application/json"
            disabled={busy}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void inspect(file);
            }}
          />
        </label>
      </div>
      {busy && (
        <p role="status" className="text-xs text-violet-200">
          Working with your local backup…
        </p>
      )}
      {pending && (
        <div className="space-y-3 rounded-xl border border-white/15 bg-black/20 p-3">
          <h4 className="break-all text-sm font-medium">
            Restore preview: {pending.name}
          </h4>
          <p role="status" className="text-xs text-zinc-300">
            {pending.preview.keys} local values · {pending.preview.rows}{" "}
            database records · {pending.preview.source.toUpperCase()} format
          </p>
          <dl className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
            {BACKUP_TABLES.filter(
              (name) => pending.preview.backup.indexedDb[name].length,
            ).map((name) => (
              <div key={name} className="flex gap-2">
                <dt className="capitalize">{name}</dt>
                <dd className="text-zinc-100">
                  {pending.preview.backup.indexedDb[name].length}
                </dd>
              </div>
            ))}
          </dl>
          <label className="vm-field-label">
            When records already exist
            <select
              aria-label="Backup conflict policy"
              value={policy}
              disabled={busy}
              onChange={(event) =>
                setPolicy(event.target.value as RestorePolicy)
              }
              className="vm-field py-2"
            >
              <option value="keep-existing">
                Keep current records (recommended)
              </option>
              <option value="use-backup">
                Use backup records for matching keys
              </option>
            </select>
          </label>
          <p className="text-xs leading-5 text-zinc-400">
            New records are added. Companion and gallery collections merge by
            ID; favorites combine.{" "}
            {policy === "use-backup"
              ? "Matching conversations and records will use the backup version."
              : "Current conversations and matching records take priority."}
          </p>
          {pending.preview.warnings.map((warning) => (
            <p key={warning} className="text-xs leading-5 text-amber-100/90">
              {warning}
            </p>
          ))}
          <p className="text-xs leading-5 text-zinc-400">
            If signed-in cloud sync is active, restored content may sync when
            you resume using the app.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void restore()}
              className="neon-btn-primary rounded-xl px-4 py-2 text-xs disabled:opacity-50"
            >
              Restore this backup
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPending(null)}
              className="vm-secondary-button"
            >
              Cancel preview
            </button>
          </div>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-400/30 p-3 text-xs leading-6 text-amber-100"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-xs leading-6 text-violet-100">
          {notice}
        </p>
      )}
      {restored && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="vm-secondary-button"
        >
          <RefreshCw className="h-4 w-4" /> Reload to refresh all views
        </button>
      )}
    </section>
  );
}
