# Video-System-Konfigurator

Ein professioneller Wizard zur Konfiguration und Angebotserstellung von Video-Überwachungssystemen.

## 🚀 Quick Start

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev
```

App läuft auf: **http://localhost:3000**

## ✨ Features

### 6-Step Wizard
1. **Projekt-Setup**: Name, Remote-Fähigkeit
2. **Standorte**: Multiple Standorte definieren
3. **Paket & Hersteller**: Eco/Premium/High-Risk, Hersteller-Auswahl
4. **Kameras mit Montagevarianten** ⭐: Dome, Bullet, PTZ, Thermal mit individueller Montageart
5. **Verkabelung & Netzwerk**: Copper/Fiber/WLAN, optional IP-Dokumentation
6. **Ergebnis & Stückliste**: Detaillierte BOM mit automatischem Montagezubehör

### Highlights

#### ⭐ Montagevarianten (NEU)
- Jede Kamera individuell konfigurierbar:
  - **Wandmontage** (29-89€)
  - **Deckenmontage** (35-99€)
  - **Mastmontage** (45-145€)
- Automatische Zubehör-Generierung in BOM
- Intelligente Preisgestaltung nach Kameratyp

#### 📊 Stücklisten-Generierung
- Automatische BOM-Berechnung
- Gruppierung nach Kategorien
- Inklusive Montagezubehör
- UVP-Preise pro Artikel und Gesamt

#### 🌐 IP-Dokumentation
- Optional pro Standort aktivierbar
- Automatische IP-Vergabe mit Reihenfolge
- Editierbare Geräte-Bezeichnungen
- **Excel-Export (.xlsx)** mit Formatierung

#### 🎨 Moderne UI mit CI-Farben
- **Primary**: #8D5FFF (Lila/Violett)
- **Accent**: #C2B4FC (Helles Lila)
- **Light**: #D7D8D6 (Helles Grau)
- TailwindCSS Design
- Dark Mode Support
- Responsive Layout
- Klickbare Step-Navigation

## 📦 Technologie-Stack

- **Next.js 14** - React Framework
- **TypeScript** - Type Safety
- **TailwindCSS** - Styling
- **xlsx** - Excel Export

## 📁 Projekt-Struktur

```
├── pages/
│   ├── _app.tsx              # App Wrapper
│   └── index.tsx             # Haupt-Wizard (2100+ Zeilen)
├── types.ts                  # TypeScript Interfaces
├── ipHelper.ts               # IP-Management
├── mountAccessories.ts       # Montagezubehör-Logik ⭐
├── globals.css               # Global Styles
└── [Config-Dateien]
```

## 🎯 Verwendung

### 1. Projekt erstellen
- Projektname eingeben
- Remote-Zugriff aktivieren (optional)

### 2. Standorte definieren
- Beliebig viele Standorte hinzufügen
- Namen vergeben

### 3. Paket & Hersteller wählen
- Paket: Eco / Premium / High-Risk
- Hersteller: AXIS / Hanwha / AJAX / Keenfinity
- Video-Management: NVR oder VMS
- Speicherdauer: 1-90 Tage

### 4. Kameras konfigurieren ⭐
- **Pro Kameratyp**:
  - Anzahl eingeben
  - **Montageart wählen**:
    - Wandmontage
    - Deckenmontage
    - Mastmontage
- Outdoor-Option für Junction Boxes

### 5. Netzwerk konfigurieren
- Verkabelung: Kupfer / Glasfaser / WLAN-Bridge
- Anbindung: Direkt oder Standalone
- Optional: IP-Dokumentation aktivieren

### 6. Ergebnis prüfen
- Projekt-Übersicht
- Detaillierte Stückliste mit:
  - Kameras
  - **Montagehalterungen** ⭐
  - Netzwerk-Komponenten
  - Recorder/VMS
  - Speicher
  - Zubehör
- IP-Dokumentation (wenn aktiviert)
- **Excel-Export** für IP-Doku

## 📝 Datenmodell

### Montagevarianten (NEU)

```typescript
type MountType = 'wall' | 'ceiling' | 'pole'

interface CameraConfig {
  quantity: number
  mount: MountType
}

interface CameraWithMountConfig {
  domeFixed: CameraConfig
  domeVario: CameraConfig
  bulletFixed: CameraConfig
  bulletVario: CameraConfig
  ptz: CameraConfig
  thermal: CameraConfig
  ipSpeakers: number  // keine Montage
}
```

### Automatisches Zubehör

| Montageart | Standard-Kameras | PTZ-Kameras |
|------------|------------------|-------------|
| Wand | Wandhalter (29€) | Wandhalter (89€) |
| Decke | Deckenhalter (35€) | Deckenhalter (99€) |
| Mast | Mastadapter (45€) + Klemme (25€) | Mastadapter (120€) + Klemme (25€) |

## 🔧 Scripts

```bash
# Development
npm run dev

# Production Build
npm run build

# Start Production
npm start

# Linting
npm run lint
```

## 📚 Dokumentation

- **PROJECT_STATUS.md**: Aktueller Projekt-Stand
- **CHANGELOG.md**: Versions-Historie
- **IP_DOCUMENTATION.md**: IP-Feature Dokumentation
- **docs/app-idee.md**: Original-Anforderungen

## 🐛 Troubleshooting

### App startet nicht
```bash
rm -rf .next
npm install
npm run dev
```

### Build-Fehler
```bash
npm run build
# Fehler in der Konsole prüfen
```

### IP-Dokumentation funktioniert nicht
- Start-IP-Adresse prüfen (muss gültige IPv4 sein)
- CIDR korrekt setzen (/24)
- Genügend IPs im Subnetz verfügbar

## 📄 Lizenz

Proprietär - Alle Rechte vorbehalten

## 👨‍💻 Entwickelt mit

- Next.js
- React
- TypeScript
- TailwindCSS
- Liebe zum Detail ❤️

---

**Version**: 2.0.0 (Montagevarianten Release)  
**Stand**: 02.01.2026  
**Status**: ✅ Produktiv & Lauffähig
