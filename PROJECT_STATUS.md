# Video-System-Konfigurator - Aktueller Stand (02.01.2026)

## 🎯 Projekt-Status: PRODUKTIV & LAUFFÄHIG

Der Video-System-Konfigurator ist vollständig funktionsfähig und einsatzbereit.

---

## 📦 Implementierte Features

### ✅ Wizard-Flow (6 Steps)

#### **Step 1: Projekt-Setup**
- Projektname
- Remote-Fähigkeit (projektweit)

#### **Step 2: Standorte definieren**
- Multiple Standorte hinzufügen/entfernen
- Standort-Namen

#### **Step 3: Paket & Hersteller**
- Pakete: Eco, Premium, High-Risk
- Hersteller: AXIS, Hanwha, AJAX, Keenfinity
- Sub-Menüs für Hanwha (A-Series, Q/X-Series) und AJAX (Baseline, Superior)
- Video-Management: NVR/VMS
- NVR: HDD-Auswahl (2-12TB) + Anzahl der Platten
- Speicherdauer: 1-90 Tage mit DSGVO-Warnung
- USV-Option (für alle Pakete)

#### **Step 4: Kameras mit Montagevarianten** ⭐ NEU
- **Dome-Kameras** (Fixed/Vario):
  - Anzahl
  - Montageart: Wandmontage / Deckenmontage / Mastmontage
- **Bullet-Kameras** (Fixed/Vario):
  - Anzahl
  - Montageart: Wandmontage / Deckenmontage / Mastmontage
- **PTZ-Kameras**:
  - Anzahl
  - Montageart: Wandmontage / Deckenmontage / Mastmontage
- **Thermal-Kameras** (nur Premium/High-Risk):
  - Anzahl
  - Montageart: Wandmontage / Deckenmontage / Mastmontage
- **IP-Lautsprecher**: Anzahl
- **Outdoor-Option**: Junction Boxes werden automatisch hinzugefügt

#### **Step 5: Verkabelung & Netzwerk**
- Verkabelungsvarianten: Netzwerkkabel, Glasfaser, WLAN-Bridge
- Anbindung: Direkt vom Server oder Eigenständig
- **IP-Dokumentation (optional)**:
  - Start-IP-Adresse
  - CIDR
  - Gateway
  - Device-Prefixes (Video-Device, Netzwerk-Device)
  - IP-Vergabe-Reihenfolge: Router → Switches → WLAN-Bridge → NVR/VMS → Kameras

#### **Step 6: Ergebnis & Stückliste**
- **Projekt-Übersicht** mit allen Parametern
- **Detaillierte Stückliste (BOM)**:
  - Gruppiert nach Kategorien
  - Kameras mit automatischem Montagezubehör ⭐
  - Netzwerk-Komponenten
  - Recorder/VMS
  - Lizenzen
  - Speicher
  - Audio
  - Zubehör (inkl. Montagehalter)
  - Infrastruktur
- **IP-Dokumentation Report**:
  - Pro Standort mit allen Geräten
  - Editierbare Bezeichnungen
  - Excel-Export (.xlsx)
- **Gesamt-UVP** mit allen Positionen

---

## 🗂️ Dateistruktur

```
SalesSupportCCTV/
├── docs/
│   └── app-idee.md                 # Ursprüngliche Anforderungen
├── pages/
│   ├── _app.tsx                    # Next.js App Wrapper
│   └── index.tsx                   # Haupt-App mit allen Steps (2100+ Zeilen)
├── types.ts                        # TypeScript Interfaces & Types
├── ipHelper.ts                     # IP-Adress-Management & -Zuweisung
├── mountAccessories.ts             # Montagezubehör-Logik ⭐ NEU
├── globals.css                     # Global Styles mit TailwindCSS
├── tailwind.config.js              # TailwindCSS Konfiguration
├── postcss.config.js               # PostCSS Konfiguration
├── tsconfig.json                   # TypeScript Konfiguration
├── next.config.js                  # Next.js Konfiguration
├── package.json                    # Dependencies
└── README.md                       # Diese Datei
```

---

## 🔧 Technologie-Stack

- **Framework**: Next.js 14.2.35
- **Frontend**: React 18 mit TypeScript
- **Styling**: TailwindCSS (Utility-First CSS)
- **State Management**: React Hooks (useState)
- **Excel-Export**: xlsx (SheetJS)
- **Build Tool**: Next.js Build System
- **Package Manager**: npm

---

## 📊 Datenmodell

### Project Interface
```typescript
{
  name: string
  tier: 'eco' | 'premium' | 'high-risk'
  manufacturer: 'AXIS' | 'Hanwha' | 'AJAX' | 'Keenfinity'
  hanwhaSeries?: 'A-Series' | 'Q/X-Series'
  ajaxSeries?: 'Baseline' | 'Superior'
  videoManagement: 'nvr' | 'vms'
  sites: Site[]
  storageDays: number
  storageHddSize?: number
  storageHddQuantity?: number
  upsRequired: boolean
  remoteCapable: boolean
}
```

### Site Interface
```typescript
{
  id: string
  name: string
  cameras: CameraWithMountConfig
  cabling: 'copper' | 'fiber' | 'wlan-bridge'
  isStandalone: boolean
  outdoor: boolean
  ipDocEnabled?: boolean
  ipStart?: string
  ipGateway?: string
  ipCidr?: string
  ipVideoDevicePrefix?: string
  ipNetworkDevicePrefix?: string
}
```

### CameraWithMountConfig ⭐ NEU
```typescript
{
  domeFixed: { quantity: number; mount: MountType }
  domeVario: { quantity: number; mount: MountType }
  bulletFixed: { quantity: number; mount: MountType }
  bulletVario: { quantity: number; mount: MountType }
  ptz: { quantity: number; mount: MountType }
  thermal: { quantity: number; mount: MountType }
  ipSpeakers: number
}

type MountType = 'wall' | 'ceiling' | 'pole'
```

---

## 🎨 Montagevarianten-Logik ⭐ NEU

### Standard-Montagearten
- **Dome-Kameras**: Deckenmontage (ceiling)
- **Bullet-Kameras**: Wandmontage (wall)
- **PTZ-Kameras**: Wandmontage (wall)
- **Thermal-Kameras**: Mastmontage (pole)

### Automatisches Zubehör

#### Wandmontage
- Wandhalter: 29€ (Standard), 89€ (PTZ)

#### Deckenmontage
- Deckenhalter: 35€ (Standard), 99€ (PTZ)

#### Mastmontage
- Mastadapter: 45€ (Standard), 120€ (PTZ)
- Mastklemme: 25€ (universal)

---

## 🚀 Server starten

```bash
npm run dev
```

Server läuft auf: **http://localhost:3000**

---

## 📝 Letzte Änderungen (02.01.2026)

### Montagevarianten-Feature implementiert
1. **Datenmodell erweitert**:
   - `MountType` hinzugefügt
   - `CameraConfig` Interface mit `quantity` und `mount`
   - `CameraWithMountConfig` für alle Kameratypen

2. **UI komplett überarbeitet (Step 4)**:
   - Jede Kamera hat jetzt Anzahl + Montageart-Select
   - 3-Spalten-Grid-Layout für bessere Übersicht
   - Select wird deaktiviert wenn Anzahl = 0

3. **Automatische Zubehör-Generierung**:
   - `mountAccessories.ts` Helper-Datei
   - Regel-basierte Zuordnung von Montagehaltern
   - Preise je nach Kameratyp und Montageart

4. **BOM-Berechnung aktualisiert**:
   - Alle Kamera-Zählungen angepasst
   - Montagezubehör wird automatisch hinzugefügt
   - Outdoor Junction Boxes
   - Switch-Berechnung für Standalone-Sites

5. **IP-Helper aktualisiert**:
   - Anpassung an neue Datenstruktur
   - Kamera-Zählung für IP-Vergabe
   - Switch-Port-Berechnung

### Netzwerktopologie-Feature entfernt
- Feature wurde auf Wunsch wieder entfernt
- Mermaid-Package deinstalliert
- Alle Topologie-Dateien gelöscht

### Step-Navigation verbessert
- Step-Labels größer und fetter
- Labels perfekt unter Icons zentriert
- Steps sind klickbare Buttons für schnelle Navigation
- Hover-Effekte

---

## 🐛 Bekannte Probleme

Keine bekannten Probleme. Alle Features funktionieren einwandfrei.

---

## 🔜 Mögliche nächste Schritte

1. **Speichern & Laden von Projekten**
   - Lokale Speicherung (localStorage)
   - Oder Backend-Integration (Supabase)

2. **PDF-Export der Stückliste**
   - Formatierte PDF-Ausgabe
   - Mit Firmen-Logo

3. **Kamera-Katalog**
   - Datenbank mit echten Kameras
   - Mit Bildern und Spezifikationen

4. **Erweiterte IP-Planung**
   - VLAN-Unterstützung
   - Mehrere Subnetze

5. **Dark/Light Mode Toggle**
   - Umschalter in der UI
   - Persistente Speicherung

---

## 💾 Backup & Versionierung

**Aktueller Stand gesichert am**: 02.01.2026, 23:45 Uhr

**Status**: ✅ Produktiv & Lauffähig

**Build**: ✅ Erfolgreich kompiliert

**Dev-Server**: ✅ Läuft ohne Fehler

---

## 📞 Support

Bei Fragen oder Problemen:
1. Prüfe die Browser-Konsole auf Fehler
2. Stelle sicher, dass alle Dependencies installiert sind: `npm install`
3. Lösche `.next` Ordner und baue neu: `rm -rf .next && npm run build`

---

## ✨ Zusammenfassung

Der Video-System-Konfigurator ist ein voll funktionsfähiger Wizard zur Erstellung von Video-Überwachungssystemen mit:
- Flexibler Standort-Konfiguration
- **Individuellen Montagevarianten für jede Kamera** ⭐
- Automatischer Stücklistenerstellung mit Montagezubehör
- Optional: IP-Dokumentation mit Excel-Export
- Moderne, responsive UI mit TailwindCSS

**Bereit für den produktiven Einsatz!** 🎉

