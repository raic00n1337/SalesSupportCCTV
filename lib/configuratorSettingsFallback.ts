// Fallback-Werte für Konfigurator-Formel-Parameter (Preise + BHE-Zeitenmodell),
// falls die configurator_settings-Tabelle (noch) nicht existiert oder ein Key fehlt.
// Entsprechen den ursprünglichen Hardcode-Konstanten in pages/configurator.tsx.
//
// WICHTIG: Diese Datei darf NICHTS Server-only importieren (z.B. keinen
// Supabase-Client mit Service-Role-Key), da sie sowohl von der API-Route
// (pages/api/configurator/settings.ts) als auch direkt vom Client-Code
// (pages/configurator.tsx) importiert wird. Ein Import der API-Route selbst
// würde deren Server-Client ins Client-Bundle ziehen und dort mit
// "supabaseKey is required" abstürzen, weil SUPABASE_SERVICE_ROLE_KEY im
// Browser nicht verfügbar ist.
export const CONFIGURATOR_SETTINGS_FALLBACK: Record<string, number> = {
  labor_rate_eur_per_hour: 120,
  travel_fee_eur_per_block: 135,
  travel_fee_cameras_per_block: 4,
  documentation_fee_percent: 5,
  lift_platform_minutes_per_camera: 15,
  storage_hdd_eur_per_tb: 89,
  // BHE-Zeitenmodell (docs/BHE_TIME_MODEL_VIDEO.md) - admin-pflegbar unter
  // /admin/configurator-settings, siehe add_configurator_bhe_time_settings.sql
  bhe_camera_base_minutes: 135,
  bhe_camera_mount_ceiling_minutes: 30,
  bhe_camera_mount_wall_pole_minutes: 20,
  bhe_speaker_install_minutes: 60,
  bhe_switch_time_4port_minutes: 15,
  bhe_switch_time_8port_minutes: 20,
  bhe_switch_time_16port_minutes: 25,
  bhe_switch_time_24port_minutes: 30,
  bhe_nvr_minutes_per_channel: 40,
  bhe_vms_server_setup_minutes: 240,
  bhe_vms_workstation_setup_minutes: 90,
  bhe_vms_remote_setup_minutes: 30,
  bhe_monitor_main_minutes: 10,
  bhe_monitor_additional_minutes: 15,
  bhe_documentation_minutes_per_channel: 15
}
