-- Migration: BHE-Zeiten für die neuen Konfigurator-Komponenten nachpflegen
-- Datum: 2026-07-06
-- Zweck: add_configurator_component_management.sql hat die neuen Zubehör-/
-- Infrastruktur-Komponenten ohne bhe_time_minutes angelegt (DB-Default 0).
-- Dieses Skript setzt sinnvolle Montagezeiten (Minuten/Einheit) für die
-- Komponenten, deren Installationsaufwand bisher NICHT im BHE-Zeitmodell
-- (siehe docs/BHE_TIME_MODEL_VIDEO.md) erfasst war - also ohne Doppelzählung.
--
-- Absichtlich AUF 0 belassen: network_switch, nvr_channels, vms_server_hardware,
-- vms_workstation_standard/multimonitor, vms_display_27, vms_license_server/camera,
-- vms_input_set - deren Montagezeit ist bereits über eigene Formeln in
-- calculateBOM() abgedeckt (Switch-Zeit nach Portanzahl, NVR 40 Min/Kanal,
-- VMS-Grundeinrichtung 240+90+30 Min, Monitor-Aufbau 10/15 Min). Ein fixer Wert
-- pro Produkt würde hier nicht mit der Kamera-/Kanalanzahl skalieren und zu
-- Doppelzählung führen.

UPDATE public.configurator_products
SET bhe_time_minutes = 10
WHERE category = 'junction_box_outdoor';

UPDATE public.configurator_products
SET bhe_time_minutes = 10
WHERE category = 'media_converter_fiber';

UPDATE public.configurator_products
SET bhe_time_minutes = 5
WHERE category = 'sfp_module';

UPDATE public.configurator_products
SET bhe_time_minutes = 45
WHERE category = 'wlan_bridge_kit';

UPDATE public.configurator_products
SET bhe_time_minutes = 20
WHERE category = 'wlan_outdoor_enclosure';

UPDATE public.configurator_products
SET bhe_time_minutes = 30
WHERE category = 'outdoor_cabinet';

-- Entspricht "Midspan Innen: 10 min" aus docs/BHE_TIME_MODEL_VIDEO.md
UPDATE public.configurator_products
SET bhe_time_minutes = 10
WHERE category = 'poe_injector';

UPDATE public.configurator_products
SET bhe_time_minutes = 15
WHERE category = 'vpn_router';

UPDATE public.configurator_products
SET bhe_time_minutes = 15
WHERE category = 'ups';

UPDATE public.configurator_products
SET bhe_time_minutes = 45
WHERE category = 'network_cabinet_9he';
