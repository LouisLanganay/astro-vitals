#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod store;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            app.manage(commands::AppState::load(&dir)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_day,
            commands::save_daily_check,
            commands::save_pvt,
            commands::save_vision_test,
            commands::evaluate,
            commands::series,
            commands::export_packet,
            commands::load_scenario,
            commands::get_settings,
            commands::set_settings,
        ])
        .run(tauri::generate_context!())
        .expect("the application failed to start");
}
