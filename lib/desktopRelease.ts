/** Trust-checked installer selection for the official desktop release. */
export type DesktopPlatform = "windows" | "mac-arm" | "mac-intel" | "linux";
export type ReleaseAsset = { name: string; browser_download_url: string; size?: number };
export const RELEASE_REPO = "hampusi97/velvetmotion-ai";
export const RELEASE_API = "https://api.github.com/repos/" + RELEASE_REPO + "/releases/latest";
export const RELEASES_PAGE = "https://github.com/" + RELEASE_REPO + "/releases";

export const DESKTOP_PLATFORMS: Record<DesktopPlatform, { title: string; subtitle: string; help: string }> = {
  windows: {
    title: "Windows", subtitle: "64-bit · EXE / MSI",
    help: "Windows 10 or 11. Your browser may ask you to confirm an unsigned publisher.",
  },
  "mac-arm": {
    title: "Mac · Apple silicon", subtitle: "M-series · DMG",
    help: "For Macs with an M-series processor. Choose Intel if About This Mac identifies an Intel CPU.",
  },
  "mac-intel": {
    title: "Mac · Intel", subtitle: "Intel processor · DMG",
    help: "For older Intel-based Macs. Check Apple menu → About This Mac when unsure.",
  },
  linux: {
    title: "Linux", subtitle: "x86-64 · AppImage / DEB",
    help: "AppImage works on many distros. A DEB or RPM may also be available in the release.",
  },
};

function officialAsset(asset: ReleaseAsset): boolean {
  try {
    const url = new URL(asset.browser_download_url);
    return url.hostname === "github.com" &&
      url.pathname.startsWith("/" + RELEASE_REPO + "/releases/download/");
  } catch { return false; }
}

export function chooseDesktopInstaller(assets: ReleaseAsset[], platform: DesktopPlatform): ReleaseAsset | null {
  const safe = assets.filter(officialAsset);
  const pick = (matches: (file: string) => boolean) =>
    safe.find((asset) => matches(asset.name.toLowerCase())) || null;
  switch (platform) {
    case "windows":
      return pick((name) => name.endsWith("-setup.exe")) ||
        pick((name) => name.endsWith(".msi")) ||
        pick((name) => name.endsWith(".exe"));
    case "mac-arm":
      return pick((name) => name.endsWith(".dmg") && /aarch64|arm64/.test(name));
    case "mac-intel":
      return pick((name) => name.endsWith(".dmg") && /x64|x86_64/.test(name));
    case "linux":
      return pick((name) => name.endsWith(".appimage") && /amd64|x86_64/.test(name)) ||
        pick((name) => name.endsWith(".deb") && /amd64|x86_64/.test(name));
  }
}

export function detectDesktopPlatform(userAgent: string): DesktopPlatform {
  const ua = userAgent.toLowerCase();
  if (/windows|win64|win32/.test(ua)) return "windows";
  if (/macintosh|mac os x/.test(ua)) return "mac-arm"; // CPU cannot reliably be inferred from UA.
  if (/linux|x11/.test(ua)) return "linux";
  return "windows";
}

export function humanFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
