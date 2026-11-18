"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  getAccessToken,
  googleSignIn,
  initAuth,
  subscribeAuthState,
  firebaseLogout,
} from "@/lib/firebase";
import { CHARACTERS } from "@/lib/characters";
import { getGallery } from "@/lib/storage";

type WorkspaceTab = "meet" | "chat" | "gmail" | "drive";

interface MeetSpace {
  name: string;
  meetingUri?: string;
  meetingCode?: string;
}

interface ChatSpace {
  name: string;
  displayName?: string;
  spaceType?: string;
}

interface ChatMessageItem {
  name: string;
  text?: string;
  createTime?: string;
}

interface GmailMessageSummary {
  id: string;
  subject: string;
  from: string;
  snippet: string;
}

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface PendingConfirm {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
}

const CHAT_CONSOLE_URL =
  "https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=ivory-sunset-mxq1s";

export function GoogleSignInButton({
  onClick,
  disabled,
  label = "Sign in with Google",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="gsi-material-button inline-flex items-center gap-3 rounded-full border border-white/20 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 disabled:opacity-50"
    >
      <div className="gsi-material-button-state" />
      <div className="gsi-material-button-content-wrapper flex items-center gap-2.5">
        <div className="gsi-material-button-icon h-5 w-5 shrink-0">
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="block h-5 w-5"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
        </div>
        <span className="gsi-material-button-contents">{label}</span>
        <span className="hidden">{label}</span>
      </div>
    </button>
  );
}

export function WorkspaceHub({ onHome }: { onHome: () => void }) {
  const [tab, setTab] = useState<WorkspaceTab>("meet");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [busy, setBusy] = useState(false);

  // Meet state
  const [meetSpace, setMeetSpace] = useState<MeetSpace | null>(null);
  const [lookupCode, setLookupCode] = useState("");

  // Chat state
  const [chatSpaces, setChatSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatAppNotFound, setChatAppNotFound] = useState(false);

  // Gmail state
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("VelvetMotion Companion Note");
  const [emailBody, setEmailBody] = useState(
    "Thinking about our last conversation on VelvetMotion. Open the app whenever you are free tonight.",
  );

  // Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [exportTitle, setExportTitle] = useState("VelvetMotion-Companion-Dossier.json");

  useEffect(() => {
    const unsubInit = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
        setNeedsAuth(!t);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      },
    );
    const unsubState = subscribeAuthState((u, t) => {
      setUser(u);
      setToken(t);
      setNeedsAuth(!t);
    });
    return () => {
      unsubInit();
      unsubState();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        setStatusMessage(`Connected as ${result.user.email || result.user.displayName}`);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Google Sign-In failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await firebaseLogout();
    setMeetSpace(null);
    setChatSpaces([]);
    setGmailMessages([]);
    setDriveFiles([]);
    setStatusMessage("Signed out of Google Workspace.");
  };

  const ensureToken = async (): Promise<string | null> => {
    const t = (await getAccessToken()) || token;
    if (!t) {
      setNeedsAuth(true);
      setErrorMessage("Please sign in with Google to grant Workspace access.");
      return null;
    }
    return t;
  };

  // 1. Google Meet handlers
  const createMeetSpace = async () => {
    const accessToken = await ensureToken();
    if (!accessToken) return;
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch("https://meet.googleapis.com/v2/spaces", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Google Meet error (${res.status})`);
      }
      setMeetSpace(data);
      setStatusMessage("Created new Google Meet space.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create Google Meet space.");
    } finally {
      setBusy(false);
    }
  };

  const lookupMeetSpace = async () => {
    const clean = lookupCode.trim();
    if (!clean) return;
    const accessToken = await ensureToken();
    if (!accessToken) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const resourceName = clean.startsWith("spaces/") ? clean : `spaces/${clean}`;
      const res = await fetch(`https://meet.googleapis.com/v2/${resourceName}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Could not find space (${res.status})`);
      }
      setMeetSpace(data);
      setStatusMessage(`Loaded Google Meet space ${data.name}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to look up Google Meet space.");
    } finally {
      setBusy(false);
    }
  };

  // 2. Google Chat handlers
  const loadChatSpaces = useCallback(async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setNeedsAuth(true);
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    setChatAppNotFound(false);
    try {
      const res = await fetch("https://chat.googleapis.com/v1/spaces", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = String(data?.error?.message || "");
        if (res.status === 404 || msg.toLowerCase().includes("chat app not found")) {
          setChatAppNotFound(true);
          throw new Error(
            "Google Chat app not found. To create a Chat app, you must turn on the Chat API and configure the app in the Google Cloud console.",
          );
        }
        throw new Error(msg || `Google Chat error (${res.status})`);
      }
      const list: ChatSpace[] = Array.isArray(data.spaces) ? data.spaces : [];
      setChatSpaces(list);
      if (list.length > 0 && !selectedSpace) {
        setSelectedSpace(list[0].name);
      }
      setStatusMessage(`Loaded ${list.length} Google Chat space(s).`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load Google Chat spaces.");
    } finally {
      setBusy(false);
    }
  }, [selectedSpace]);

  const loadChatMessages = async (spaceName: string) => {
    if (!spaceName) return;
    const accessToken = await ensureToken();
    if (!accessToken) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=10`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Failed to load messages (${res.status})`);
      }
      setChatMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load Chat messages.");
    } finally {
      setBusy(false);
    }
  };

  const requestSendChatMessage = () => {
    if (!selectedSpace || !chatDraft.trim()) return;
    const textToSend = chatDraft.trim();
    const targetLabel =
      chatSpaces.find((s) => s.name === selectedSpace)?.displayName || selectedSpace;
    setPendingConfirm({
      title: "Send Google Chat Message?",
      description: `Send "${textToSend.slice(0, 120)}" to ${targetLabel} on your behalf?`,
      confirmLabel: "Send Message",
      onConfirm: async () => {
        const accessToken = await ensureToken();
        if (!accessToken) return;
        setBusy(true);
        setErrorMessage(null);
        try {
          const res = await fetch(`https://chat.googleapis.com/v1/${selectedSpace}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: textToSend }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error?.message || `Chat send failed (${res.status})`);
          }
          setChatDraft("");
          setStatusMessage("Message sent to Google Chat.");
          await loadChatMessages(selectedSpace);
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to send Chat message.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  // 3. Gmail handlers
  const loadGmailMessages = useCallback(async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setNeedsAuth(true);
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const listRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=6",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const listData = await listRes.json();
      if (!listRes.ok) {
        throw new Error(listData?.error?.message || `Gmail error (${listRes.status})`);
      }
      const rawItems: Array<{ id: string }> = Array.isArray(listData.messages)
        ? listData.messages
        : [];
      const details: GmailMessageSummary[] = await Promise.all(
        rawItems.map(async (item) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          const detail = await detailRes.json();
          const headers: Array<{ name: string; value: string }> =
            detail?.payload?.headers || [];
          const subject =
            headers.find((h) => h.name.toLowerCase() === "subject")?.value || "(No subject)";
          const from =
            headers.find((h) => h.name.toLowerCase() === "from")?.value || "Unknown sender";
          return {
            id: item.id,
            subject,
            from,
            snippet: String(detail?.snippet || ""),
          };
        }),
      );
      setGmailMessages(details);
      setStatusMessage(`Loaded ${details.length} Gmail message(s).`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load Gmail messages.");
    } finally {
      setBusy(false);
    }
  }, []);

  const requestSendGmail = () => {
    const to = emailTo.trim();
    const subject = emailSubject.trim();
    const body = emailBody.trim();
    if (!to || !subject || !body) return;
    setPendingConfirm({
      title: "Send Email via Gmail?",
      description: `Send email "${subject}" to ${to} from your connected Gmail account?`,
      confirmLabel: "Confirm & Send Email",
      onConfirm: async () => {
        const accessToken = await ensureToken();
        if (!accessToken) return;
        setBusy(true);
        setErrorMessage(null);
        try {
          const rfc2822 = [
            `To: ${to}`,
            `Subject: ${subject}`,
            "Content-Type: text/plain; charset=utf-8",
            "",
            body,
          ].join("\r\n");
          const raw = btoa(unescape(encodeURIComponent(rfc2822)))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
          const res = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ raw }),
            },
          );
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error?.message || `Gmail send failed (${res.status})`);
          }
          setStatusMessage(`Email sent to ${to} (ID: ${data.id}).`);
          setEmailTo("");
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to send email.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  // 4. Google Drive handlers
  const loadDriveFiles = useCallback(async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setNeedsAuth(true);
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        "https://www.googleapis.com/drive/v3/files?pageSize=12&fields=files(id,name,mimeType,modifiedTime,webViewLink)",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Google Drive error (${res.status})`);
      }
      const files: DriveFileItem[] = Array.isArray(data.files) ? data.files : [];
      setDriveFiles(files);
      setStatusMessage(`Loaded ${files.length} file(s) from Google Drive.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load Google Drive files.");
    } finally {
      setBusy(false);
    }
  }, []);

  const requestExportToDrive = () => {
    const filename = exportTitle.trim() || "VelvetMotion-Companion-Dossier.json";
    setPendingConfirm({
      title: "Save Dossier to Google Drive?",
      description: `Create a new file "${filename}" in your Google Drive containing your VelvetMotion companion cast and saved gallery metadata?`,
      confirmLabel: "Save to Drive",
      onConfirm: async () => {
        const accessToken = await ensureToken();
        if (!accessToken) return;
        setBusy(true);
        setErrorMessage(null);
        try {
          const payload = {
            exportedAt: new Date().toISOString(),
            companions: CHARACTERS.slice(0, 6).map((c) => ({
              id: c.id,
              name: c.name,
              category: c.category,
              tagline: c.tagline,
            })),
            savedGalleryCount: getGallery().length,
          };
          const metadata = {
            name: filename,
            mimeType: "application/json",
          };
          const boundary = "velvetmotion_drive_boundary";
          const multipartBody =
            `--${boundary}\r\n` +
            "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
            JSON.stringify(metadata) +
            `\r\n--${boundary}\r\n` +
            "Content-Type: application/json\r\n\r\n" +
            JSON.stringify(payload, null, 2) +
            `\r\n--${boundary}--`;

          const res = await fetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": `multipart/related; boundary=${boundary}`,
              },
              body: multipartBody,
            },
          );
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error?.message || `Drive upload failed (${res.status})`);
          }
          setStatusMessage(`Saved "${filename}" to Google Drive.`);
          await loadDriveFiles();
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to upload to Google Drive.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const requestDeleteDriveFile = (file: DriveFileItem) => {
    setPendingConfirm({
      title: `Delete "${file.name}" from Google Drive?`,
      description: `Are you sure you want to permanently delete "${file.name}" (ID: ${file.id}) from your Google Drive? This action cannot be undone.`,
      confirmLabel: "Delete File",
      destructive: true,
      onConfirm: async () => {
        const accessToken = await ensureToken();
        if (!accessToken) return;
        setBusy(true);
        setErrorMessage(null);
        try {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error?.message || `Delete failed (${res.status})`);
          }
          setDriveFiles((prev) => prev.filter((f) => f.id !== file.id));
          setStatusMessage(`Deleted "${file.name}" from Google Drive.`);
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to delete Drive file.");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onHome} className="text-sm text-pink-400 hover:text-pink-300">
          ← Home
        </button>
        {user && !needsAuth ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">
              Connected: <strong className="text-cream">{user.email || user.displayName}</strong>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-cream hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        ) : (
          <GoogleSignInButton
            onClick={handleLogin}
            disabled={isLoggingIn}
            label={isLoggingIn ? "Signing in…" : "Sign in with Google"}
          />
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-ink-900/90 p-6 shadow-card">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-200">
          VIP Cloud · Private Video · Love Letters
        </p>
        <h1 className="mt-2 font-display text-3xl text-cream sm:text-4xl">
          Private Suite
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Spin up private live video rooms, send midnight companion letters to your inbox, and back up your companion dossiers and gallery to your personal cloud drive.
        </p>

        {needsAuth && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
            <div>
              <p className="text-sm font-medium text-cream">
                Connect your Google account to unlock Private Suite features
              </p>
              <p className="mt-1 text-xs text-mist">
                Your session token stays strictly in memory and syncs your companions and gallery across devices.
              </p>
            </div>
            <GoogleSignInButton
              onClick={handleLogin}
              disabled={isLoggingIn}
              label={isLoggingIn ? "Connecting…" : "Sign in with Google"}
            />
          </div>
        )}

        {statusMessage && (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200"
          >
            {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-950/60 px-4 py-3 text-xs text-rose-200"
          >
            {errorMessage}
          </div>
        )}

        {/* Private Suite Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-4" role="tablist">
          {(
            [
              { id: "meet", label: "Private Video Room" },
              { id: "gmail", label: "Love Letters" },
              { id: "drive", label: "Cloud Backup" },
              { id: "chat", label: "Lounge Channels" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? "bg-rose-600 text-white"
                  : "border border-white/10 bg-white/5 text-mist hover:text-cream"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Google Meet */}
        {tab === "meet" && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-cream">Google Meet Spaces</h2>
                <p className="text-xs text-mist">
                  Create an instant Google Meet conference room or look up an existing meeting space.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={createMeetSpace}
                className="rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? "Working…" : "+ Create Instant Meet Space"}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="Enter space ID or spaces/{id} to inspect"
                aria-label="Google Meet space ID"
                className="flex-1 rounded-2xl border border-white/10 bg-ink-950 px-4 py-2.5 text-sm outline-none focus:border-rose-500"
              />
              <button
                type="button"
                disabled={busy || !lookupCode.trim()}
                onClick={lookupMeetSpace}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-cream hover:bg-white/10 disabled:opacity-40"
              >
                Lookup Space
              </button>
            </div>

            {meetSpace && (
              <div className="rounded-2xl border border-pink-500/30 bg-pink-500/10 p-4 space-y-2">
                <div className="text-xs uppercase tracking-wider text-pink-300">Active Meet Space</div>
                <div className="text-sm font-medium text-cream">Resource: {meetSpace.name}</div>
                {meetSpace.meetingCode && (
                  <div className="text-xs text-mist">Meeting Code: {meetSpace.meetingCode}</div>
                )}
                {meetSpace.meetingUri && (
                  <a
                    href={meetSpace.meetingUri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-rose-500"
                  >
                    Open Google Meet ({meetSpace.meetingUri})
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Google Chat */}
        {tab === "chat" && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100 space-y-1.5">
              <div className="font-semibold text-amber-200">Google Chat API Prerequisites</div>
              <p>
                1. Requires a <strong>Business or Enterprise Google Workspace account</strong> with
                Google Chat enabled (consumer <code>@gmail.com</code> accounts are not supported by
                the Google Chat API).
              </p>
              <p>
                2. Requires configuring the Chat app (App name, Avatar URL, Description) on the{" "}
                <a
                  href={CHAT_CONSOLE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-amber-200 hover:text-white"
                >
                  Google Chat API Configuration page in Google Cloud Console
                </a>
                .
              </p>
            </div>

            {chatAppNotFound && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/70 p-4 text-xs text-rose-100">
                <p className="font-semibold">
                  Google Chat app not found. To create a Chat app, you must turn on the Chat API and
                  configure the app in the Google Cloud console.
                </p>
                <a
                  href={CHAT_CONSOLE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block underline text-rose-200 hover:text-white"
                >
                  Open Google Chat API Configuration (project: ivory-sunset-mxq1s) →
                </a>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-cream">Spaces & Messages</h2>
              <button
                type="button"
                disabled={busy}
                onClick={loadChatSpaces}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-cream hover:bg-white/10 disabled:opacity-50"
              >
                Load Chat Spaces
              </button>
            </div>

            {chatSpaces.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {chatSpaces.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        setSelectedSpace(s.name);
                        void loadChatMessages(s.name);
                      }}
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        selectedSpace === s.name
                          ? "border-pink-500 bg-pink-500/15 text-pink-200"
                          : "border-white/10 text-mist"
                      }`}
                    >
                      {s.displayName || s.name}
                    </button>
                  ))}
                </div>

                {chatMessages.length > 0 && (
                  <ul className="space-y-2 rounded-2xl border border-white/10 bg-ink-950 p-3 text-xs">
                    {chatMessages.map((m) => (
                      <li key={m.name} className="border-b border-white/5 pb-2 last:border-none">
                        <div className="text-cream">{m.text || "(attachment/card)"}</div>
                        {m.createTime && <div className="text-[10px] text-zinc-500">{m.createTime}</div>}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <input
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    placeholder="Write a message to selected Google Chat space…"
                    aria-label="Google Chat message text"
                    className="flex-1 rounded-2xl border border-white/10 bg-ink-950 px-4 py-2.5 text-sm outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    disabled={busy || !chatDraft.trim() || !selectedSpace}
                    onClick={requestSendChatMessage}
                    className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Gmail */}
        {tab === "gmail" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-cream">Gmail Inbox & Companion Notes</h2>
                <p className="text-xs text-mist">
                  Read recent messages or send a companion note with confirmation.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={loadGmailMessages}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-cream hover:bg-white/10 disabled:opacity-50"
              >
                Load Recent Emails
              </button>
            </div>

            {gmailMessages.length > 0 && (
              <ul className="space-y-2.5">
                {gmailMessages.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-2xl border border-white/10 bg-ink-950/80 p-3.5 text-sm"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-cream">{m.subject}</span>
                      <span className="text-xs text-pink-300/80">{m.from}</span>
                    </div>
                    <p className="mt-1 text-xs text-mist line-clamp-2">{m.snippet}</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-cream">Compose Email</h3>
              <div>
                <label className="text-xs text-zinc-400" htmlFor="gmail-to">
                  Recipient Email
                </label>
                <input
                  id="gmail-to"
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400" htmlFor="gmail-subject">
                  Subject
                </label>
                <input
                  id="gmail-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400" htmlFor="gmail-body">
                  Message Body
                </label>
                <textarea
                  id="gmail-body"
                  rows={3}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                />
              </div>
              <button
                type="button"
                disabled={busy || !emailTo.trim() || !emailSubject.trim() || !emailBody.trim()}
                onClick={requestSendGmail}
                className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                Review & Send Email
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Google Drive */}
        {tab === "drive" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-cream">Google Drive Vault</h2>
                <p className="text-xs text-mist">
                  Browse your Drive files or export a VelvetMotion companion dossier.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={loadDriveFiles}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-cream hover:bg-white/10 disabled:opacity-50"
              >
                Load Drive Files
              </button>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-ink-950/60 p-4">
              <input
                value={exportTitle}
                onChange={(e) => setExportTitle(e.target.value)}
                aria-label="Export file name"
                placeholder="VelvetMotion-Companion-Dossier.json"
                className="flex-1 rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2 text-sm outline-none focus:border-rose-500"
              />
              <button
                type="button"
                disabled={busy || !exportTitle.trim()}
                onClick={requestExportToDrive}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Export Companion Dossier to Drive
              </button>
            </div>

            {driveFiles.length > 0 && (
              <ul className="space-y-2">
                {driveFiles.map((file) => (
                  <li
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-950/80 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-cream">{file.name}</div>
                      <div className="text-xs text-zinc-500">{file.mimeType}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-cream hover:bg-white/10"
                        >
                          Open
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => requestDeleteDriveFile(file)}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Mandatory User Confirmation Modal for Mutating / Destructive Operations */}
      {pendingConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/75"
            onClick={() => setPendingConfirm(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-ink-900 p-6 shadow-2xl">
            <h3 id="confirm-modal-title" className="font-display text-xl text-cream">
              {pendingConfirm.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              {pendingConfirm.description}
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm text-cream hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = pendingConfirm.onConfirm;
                  setPendingConfirm(null);
                  await action();
                }}
                className={`rounded-2xl px-4 py-2.5 text-sm font-medium text-white ${
                  pendingConfirm.destructive
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {pendingConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
