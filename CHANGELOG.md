# Changelog - Video-System-Konfigurator

## [v2.0.0] - 02.01.2026 - Montagevarianten Release

### 🆕 Neue Features
- **Montagevarianten für Kameras**: Jede Kamera kann jetzt mit individueller Montageart konfiguriert werden
  - Wandmontage
  - Deckenmontage
  - Mastmontage
- **Automatisches Montagezubehör**: Passende Halterungen werden automatisch zur Stückliste hinzugefügt
- **Intelligente Preisgestaltung**: Unterschiedliche Preise je nach Kameratyp und Montageart

### 🔧 Technische Änderungen
- Datenmodell erweitert: `CameraConfig` mit `quantity` und `mount`
- Neue Datei: `mountAccessories.ts` für Zubehör-Logik
- UI komplett überarbeitet in Step 4
- BOM-Berechnung aktualisiert
- IP-Helper angepasst

### 📝 Dateien geändert
- `types.ts`: Neue Interfaces
- `pages/index.tsx`: Step 4 komplett neu, BOM-Logik erweitert
- `ipHelper.ts`: Anpassung an neue Datenstruktur
- `mountAccessories.ts`: Neu erstellt

### 🗑️ Features entfernt
- Netzwerktopologie-Feature (auf Wunsch entfernt)
- Mermaid-Package deinstalliert

---

## [v1.5.0] - 01.01.2026

### 🆕 Features
- Step-Navigation als klickbare Buttons
- Verbesserte Step-Labels (größer, fetter, zentriert)
- Excel-Export (.xlsx) für IP-Dokumentation

### 🐛 Bugfixes
- IP-Überlauf-Fehler behoben
- Step-Label-Zentrierung korrigiert

---

## [v1.4.0] - 01.01.2026

### 🆕 Features
- IP-Dokumentation pro Standort
- Editierbare Geräte-Bezeichnungen
- Device-Prefixes konfigurierbar
- Deterministische IP-Vergabe-Reihenfolge

---

## [v1.3.0] - 01.01.2026

### 🆕 Features
- NVR HDD-Auswahl (Größe + Anzahl)
- Hersteller Sub-Menüs (Hanwha, AJAX)
- USV-Option für alle Pakete
- Remote-Fähigkeit auf Projektebene

---

## [v1.2.0] - 01.01.2026

### 🆕 Features
- IP-Lautsprecher hinzugefügt
- Speicherdauer in Tagen statt Stunden
- DSGVO-Warnung bei >72h Speicherung
- Freie Eingabe der Speicherdauer (1-90 Tage)

---

## [v1.1.0] - 01.01.2026

### 🆕 Features
- Dark Mode Support
- Step-Progress-Indicator
- Standort-Navigation

### 🐛 Bugfixes
- Projekt startet nicht (globals.css Import behoben)

---

## [v1.0.0] - 01.01.2026

### 🎉 Initial Release
- 6-Step Wizard
- Projekt-Setup
- Standort-Verwaltung
- Paket & Hersteller-Auswahl
- Kamera-Konfiguration
- Verkabelung & Netzwerk
- Stücklisten-Generierung





