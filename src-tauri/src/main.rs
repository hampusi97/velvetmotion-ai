#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;
use sysinfo::System;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
#[cfg(feature = "signed-updater")]
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemSpecs {
    total_ram_gb: f64,
    available_ram_gb: f64,
    cpu_cores: usize,
    os: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalPortStatus {
    kobold_online: bool,
    fish_online: bool,
    kokoro_online: bool,
    ollama_online: bool,
    comfy_online: bool,
}

fn port_open(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(220)).is_ok()
}

#[tauri::command]
fn desktop_app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[tauri::command]
fn desktop_signed_updates_enabled() -> bool {
    cfg!(feature = "signed-updater")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SignedUpdateStatus {
    enabled: bool,
    available: bool,
    version: Option<String>,
}

/// Use Tauri's configured HTTPS update manifest. Signatures are enforced
/// during installation; this check never executes code or installs a payload.
#[tauri::command]
async fn check_signed_desktop_update(app: AppHandle) -> Result<SignedUpdateStatus, String> {
    #[cfg(feature = "signed-updater")]
    {
        let update = app
            .updater()
            .map_err(|e| e.to_string())?
            .check()
            .await
            .map_err(|e| e.to_string())?;
        Ok(SignedUpdateStatus {
            enabled: true,
            available: update.is_some(),
            version: update.map(|u| u.version),
        })
    }
    #[cfg(not(feature = "signed-updater"))]
    {
        let _ = app;
        Ok(SignedUpdateStatus {
            enabled: false,
            available: false,
            version: None,
        })
    }
}

/// The user chooses when to restart after a signed update is installed.
#[tauri::command]
fn restart_desktop_after_update(app: AppHandle) {
    app.restart();
}

/// Only compiled with a verified signing public key embedded at release time.
/// The Tauri updater validates the cryptographic signature before installing.
#[tauri::command]
async fn install_signed_desktop_update(app: AppHandle) -> Result<String, String> {
    #[cfg(feature = "signed-updater")]
    {
        let updater = app.updater().map_err(|e| e.to_string())?;
        let update = updater.check().await.map_err(|e| e.to_string())?;
        let Some(update) = update else {
            return Ok("Already on the latest signed release.".to_string());
        };
        let new_version = update.version.clone();
        update
            .download_and_install(|_chunk, _size| {}, || {})
            .await
            .map_err(|e| e.to_string())?;
        Ok(format!(
            "Installed signed VelvetMotion update {new_version}. Restart to use the new version."
        ))
    }
    #[cfg(not(feature = "signed-updater"))]
    {
        let _ = app;
        Err("This desktop build was not configured for signed in-app updates. Download a newer installer from the official VelvetMotion GitHub releases.".to_string())
    }
}

#[tauri::command]
fn get_system_specs() -> SystemSpecs {
    let mut sys = System::new_all();
    sys.refresh_memory();
    let total_gb = (sys.total_memory() as f64) / 1_073_741_824.0;
    let avail_gb = (sys.available_memory() as f64) / 1_073_741_824.0;
    SystemSpecs {
        total_ram_gb: (total_gb * 10.0).round() / 10.0,
        available_ram_gb: (avail_gb * 10.0).round() / 10.0,
        cpu_cores: sys.cpus().len().max(1),
        os: std::env::consts::OS.to_string(),
    }
}

#[tauri::command]
fn probe_local_engines() -> LocalPortStatus {
    LocalPortStatus {
        kobold_online: port_open(5001),
        fish_online: port_open(5002),
        kokoro_online: port_open(8880),
        ollama_online: port_open(11434),
        comfy_online: port_open(8188),
    }
}

#[tauri::command]
fn toggle_boss_key(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let visible = win.is_visible().unwrap_or(true);
        if visible {
            let _ = app.emit("vm:boss-key-mute", true);
            let _ = win.eval("window.dispatchEvent(new Event('vm:boss-key-mute'))");
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
            let _ = app.emit("vm:boss-key-restore", true);
            let _ = win.eval("window.dispatchEvent(new Event('vm:boss-key-restore'))");
        }
    }
}

fn software_gpu_flag_path(app_data_dir: &std::path::Path) -> std::path::PathBuf {
    app_data_dir.join("software-gpu.flag")
}

fn hardware_gpu_flag_path(app_data_dir: &std::path::Path) -> std::path::PathBuf {
    app_data_dir.join("hardware-gpu.flag")
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn stale_webview2_cache_paths(app_dir: &std::path::Path) -> Vec<std::path::PathBuf> {
    // Clear only transient Service Worker, HTTP, and GPU shader caches that can
    // trap WebView2 on a black screen across updates or GPU driver regressions.
    // Never touch Local Storage, IndexedDB, or Cookies so user data stays safe.
    let relative_segments: &[&[&str]] = &[
        &["EBWebView", "Default", "Service Worker"],
        &["EBWebView", "Default", "Cache"],
        &["EBWebView", "Default", "Network", "Cache"],
        &["EBWebView", "Default", "Code Cache"],
        &["EBWebView", "Default", "GPUCache"],
        &["EBWebView", "GrShaderCache"],
        &["EBWebView", "GraphiteDawnCache"],
        &["EBWebView", "DawnGraphiteCache"],
        &["EBWebView", "DawnWebGPUCache"],
        &["EBWebView", "ShaderCache"],
    ];
    relative_segments
        .iter()
        .map(|segments| {
            let mut path = app_dir.to_path_buf();
            for segment in *segments {
                path.push(segment);
            }
            path
        })
        .collect()
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn clean_webview2_caches_in_root(app_dir: &std::path::Path) {
    let profile_roots = [
        app_dir.to_path_buf(),
        app_dir.join("webview-v3-safe"),
        app_dir.join("webview-v3-hw"),
    ];
    for root in profile_roots {
        for dir in stale_webview2_cache_paths(&root) {
            if dir.exists() {
                let _ = std::fs::remove_dir_all(&dir);
            }
        }
    }
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn build_windows_webview2_args(existing: &str, software_gpu: bool) -> String {
    let mut args = if existing.trim().is_empty() {
        "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,CalculateNativeWinOcclusion"
            .to_string()
    } else {
        existing.trim().to_string()
    };
    if software_gpu && !args.contains("--disable-gpu ") && !args.ends_with("--disable-gpu") {
        args.push_str(" --disable-gpu");
    }
    if !args.contains("--disable-gpu-compositing") {
        args.push_str(" --disable-gpu-compositing");
    }
    if !args.contains("--disable-renderer-backgrounding") {
        args.push_str(" --disable-renderer-backgrounding");
    }
    args
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn build_software_gpu_args(existing: &str) -> String {
    build_windows_webview2_args(existing, true)
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn windows_webview2_profile_name(software_gpu: bool) -> &'static str {
    if software_gpu {
        "webview-v3-safe"
    } else {
        "webview-v3-hw"
    }
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn is_windows_hardware_gpu_requested(app_dir: &std::path::Path) -> bool {
    let cli_software = std::env::args().any(|a| a == "--disable-gpu" || a == "--safe-graphics");
    let env_software = std::env::var("VELVETMOTION_SOFTWARE_GPU")
        .map(|v| matches!(v.as_str(), "1" | "true" | "TRUE" | "yes"))
        .unwrap_or(false);
    if cli_software || env_software || software_gpu_flag_path(app_dir).exists() {
        return false;
    }

    let cli_hardware = std::env::args().any(|a| a == "--enable-gpu");
    let env_hardware = std::env::var("VELVETMOTION_HARDWARE_GPU")
        .map(|v| matches!(v.as_str(), "1" | "true" | "TRUE" | "yes"))
        .unwrap_or(false);
    cli_hardware || env_hardware || hardware_gpu_flag_path(app_dir).exists()
}

#[cfg(target_os = "windows")]
fn prepare_windows_webview2_startup() {
    let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") else {
        return;
    };
    let app_dir = std::path::PathBuf::from(local_app_data).join("ai.velvetmotion.desktop");
    clean_webview2_caches_in_root(&app_dir);

    let software_gpu = !is_windows_hardware_gpu_requested(&app_dir);
    let existing = std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").unwrap_or_default();
    let args = build_windows_webview2_args(&existing, software_gpu);
    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", args);
}

#[cfg(not(target_os = "windows"))]
fn prepare_windows_webview2_startup() {
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

fn ensure_main_window(app: &mut tauri::App) -> tauri::Result<()> {
    if app.get_webview_window("main").is_none() {
        if let Some(window_config) = app.config().app.windows.first().cloned() {
            #[cfg(target_os = "windows")]
            {
                let app_dir = app.path().app_local_data_dir().unwrap_or_else(|_| {
                    std::env::var_os("LOCALAPPDATA")
                        .map(std::path::PathBuf::from)
                        .unwrap_or_else(std::env::temp_dir)
                        .join("ai.velvetmotion.desktop")
                });
                clean_webview2_caches_in_root(&app_dir);
                let software_gpu = !is_windows_hardware_gpu_requested(&app_dir);
                let browser_args = build_windows_webview2_args("", software_gpu);
                let primary_dir = app_dir.join(windows_webview2_profile_name(software_gpu));
                let _ = std::fs::create_dir_all(&primary_dir);

                let build_attempt =
                    WebviewWindowBuilder::from_config(app.handle(), &window_config)?
                        .additional_browser_args(&browser_args)
                        .data_directory(primary_dir)
                        .on_page_load(|win, payload| {
                            if payload.event() == tauri::webview::PageLoadEvent::Finished {
                                let _ = win.show();
                                let _ = win.set_focus();
                                if let Ok(size) = win.inner_size() {
                                    if size.width > 2 && size.height > 2 {
                                        let nudged = tauri::PhysicalSize::new(
                                            size.width.saturating_add(1),
                                            size.height,
                                        );
                                        let _ = win.set_size(tauri::Size::Physical(nudged));
                                        let _ = win.set_size(tauri::Size::Physical(size));
                                    }
                                }
                            }
                        })
                        .build();

                if build_attempt.is_err() {
                    let recovery_dir =
                        app_dir.join(format!("webview-v3-recovery-{}", std::process::id()));
                    let _ = std::fs::create_dir_all(&recovery_dir);
                    let safe_args = build_windows_webview2_args("", true);
                    WebviewWindowBuilder::from_config(app.handle(), &window_config)?
                        .additional_browser_args(&safe_args)
                        .data_directory(recovery_dir)
                        .build()?;
                }
            }

            #[cfg(not(target_os = "windows"))]
            {
                WebviewWindowBuilder::from_config(app.handle(), &window_config)?.build()?;
            }
        }
    }

    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }
    Ok(())
}

fn reload_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
        let _ = win.eval("window.location.reload()");
    }
}

fn toggle_safe_graphics_and_restart(app: &AppHandle) {
    if let Ok(dir) = app.path().app_local_data_dir() {
        let _ = std::fs::create_dir_all(&dir);
        let sw_flag = software_gpu_flag_path(&dir);
        let hw_flag = hardware_gpu_flag_path(&dir);
        if hw_flag.exists() {
            let _ = std::fs::remove_file(&hw_flag);
            let _ = std::fs::write(&sw_flag, b"1");
        } else {
            let _ = std::fs::remove_file(&sw_flag);
            let _ = std::fs::write(&hw_flag, b"1");
        }
    }
    app.restart();
}

fn main() {
    prepare_windows_webview2_startup();

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_boss_key(app.clone());
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            desktop_app_version,
            desktop_signed_updates_enabled,
            check_signed_desktop_update,
            install_signed_desktop_update,
            restart_desktop_after_update,
            get_system_specs,
            probe_local_engines,
            toggle_boss_key
        ])
        .setup(|app| {
            ensure_main_window(app)?;

            #[cfg(feature = "signed-updater")]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            let show_item =
                MenuItem::with_id(app, "toggle", "Show / Stealth Hide", true, None::<&str>)?;
            let reload_item =
                MenuItem::with_id(app, "reload", "Reload Window", true, None::<&str>)?;
            let safe_gpu_item = MenuItem::with_id(
                app,
                "safe_gpu",
                "Toggle Safe / Hardware Graphics & Restart",
                true,
                None::<&str>,
            )?;
            let quit_item =
                MenuItem::with_id(app, "quit", "Quit VelvetMotion", true, None::<&str>)?;
            let menu =
                Menu::with_items(app, &[&show_item, &reload_item, &safe_gpu_item, &quit_item])?;

            let mut tray =
                TrayIconBuilder::new()
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "toggle" => toggle_boss_key(app.clone()),
                        "reload" => reload_main_window(app),
                        "safe_gpu" => toggle_safe_graphics_and_restart(app),
                        "quit" => app.exit(0),
                        _ => {}
                    });
            if let Some(icon) = app.default_window_icon().cloned() {
                tray = tray.icon(icon);
            }
            tray.build(app)?;

            let _ = app.global_shortcut().register("CmdOrCtrl+Shift+H");

            // Always render the bundled local UI. Never silently navigate the
            // privileged native window to a remotely editable website.
            // Signed builds use a cryptographically verified updater; unsigned
            // builds never register one. Local model services remain opt-in.

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running VelvetMotion Desktop");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn stale_caches_preserve_user_storage_and_clear_sw_network_and_gpu_caches() {
        let root = Path::new("app-data");
        let paths = stale_webview2_cache_paths(root);
        let rendered: Vec<String> = paths
            .iter()
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .collect();

        assert!(rendered
            .iter()
            .any(|p| p.ends_with("EBWebView/Default/Service Worker")));
        assert!(rendered
            .iter()
            .any(|p| p.ends_with("EBWebView/Default/Network/Cache")));
        assert!(rendered
            .iter()
            .any(|p| p.ends_with("EBWebView/DawnGraphiteCache")));
        assert!(rendered
            .iter()
            .any(|p| p.ends_with("EBWebView/Default/GPUCache")));

        for forbidden in ["Local Storage", "IndexedDB", "Cookies"] {
            assert!(
                !rendered.iter().any(|p| p.contains(forbidden)),
                "must never delete user storage directory {forbidden}"
            );
        }
    }

    #[test]
    fn software_gpu_args_preserve_defaults_and_avoid_duplicates() {
        let fresh = build_software_gpu_args("");
        assert!(fresh.contains("--disable-gpu"));
        assert!(fresh.contains("--disable-gpu-compositing"));
        assert!(fresh.contains("--disable-renderer-backgrounding"));
        assert!(fresh.contains("CalculateNativeWinOcclusion"));
        assert!(fresh.contains("msSmartScreenProtection"));

        let hw = build_windows_webview2_args("", false);
        assert!(!hw.split_whitespace().any(|t| t == "--disable-gpu"));
        assert!(hw.contains("--disable-gpu-compositing"));

        let merged = build_software_gpu_args("--proxy-server=http://127.0.0.1:8080 --disable-gpu");
        assert!(merged.contains("--proxy-server=http://127.0.0.1:8080"));
        assert_eq!(merged.matches("--disable-gpu-compositing").count(), 1);
    }

    #[test]
    fn distinct_profiles_for_software_and_hardware_gpu_modes() {
        assert_ne!(
            windows_webview2_profile_name(true),
            windows_webview2_profile_name(false)
        );
    }
}
