#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;
use sysinfo::System;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager,
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

fn main() {
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
            install_signed_desktop_update,
            get_system_specs,
            probe_local_engines,
            toggle_boss_key
        ])
        .setup(|app| {
            #[cfg(feature = "signed-updater")]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            let show_item =
                MenuItem::with_id(app, "toggle", "Show / Stealth Hide", true, None::<&str>)?;
            let quit_item =
                MenuItem::with_id(app, "quit", "Quit VelvetMotion", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let mut tray =
                TrayIconBuilder::new()
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "toggle" => toggle_boss_key(app.clone()),
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
