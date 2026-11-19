#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use sysinfo::System;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, Url,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const LIVE_WEB_URL: &str = "https://velvetmotion-ai.hampusi97.workers.dev";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemSpecs {
    total_ram_gb: f64,
    available_ram_gb: f64,
    cpu_cores: usize,
    os: String,
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
fn toggle_boss_key(app: AppHandle) {
    let _ = app.emit("vm:boss-key-mute", true);
    if let Some(win) = app.get_webview_window("main") {
        let visible = win.is_visible().unwrap_or(true);
        if visible {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

fn check_live_web_reachable() -> bool {
    // Fast TCP probe so airplane mode never hangs startup
    use std::net::{TcpStream, ToSocketAddrs};
    use std::time::Duration;
    if let Ok(mut addrs) = "velvetmotion-ai.hampusi97.workers.dev:443".to_socket_addrs() {
        if let Some(addr) = addrs.next() {
            return TcpStream::connect_timeout(&addr, Duration::from_millis(1400)).is_ok();
        }
    }
    false
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
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
        .invoke_handler(tauri::generate_handler![get_system_specs, toggle_boss_key])
        .setup(|app| {
            // System Tray with Boss-Key & Show/Quit
            let show_item = MenuItem::with_id(app, "toggle", "Show / Stealth Hide", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit VelvetMotion", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => toggle_boss_key(app.clone()),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            // Register CmdOrCtrl+Shift+H global Boss-Key
            let _ = app.global_shortcut().register("CmdOrCtrl+Shift+H");

            // Layer 1 Instant Daily Web Update (falls back to bundled ../out if offline)
            #[cfg(not(debug_assertions))]
            {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    if check_live_web_reachable() {
                        if let Some(win) = handle.get_webview_window("main") {
                            if let Ok(url) = Url::parse(LIVE_WEB_URL) {
                                let _ = win.navigate(url);
                            }
                        }
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running VelvetMotion Desktop");
}
