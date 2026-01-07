# IP-Dokumentation Feature

## Übersicht

Die IP-Dokumentation ermöglicht eine automatische, fortlaufende IP-Adressvergabe für alle Netzwerkgeräte pro Standort.

## Features

### ✅ Implementiert

1. **Optional pro Standort aktivierbar**
   - Toggle in Schritt 5 (Verkabelung & Netzwerk)
   - Nur aktive Standorte werden in der IP-Dokumentation berücksichtigt

2. **Start-IP Eingabe mit Validierung**
   - IPv4-Format-Validierung (Echtzeit)
   - Warnung bei ungültigen Host-IPs (.0 oder .255)
   - Optional: Gateway und CIDR/Subnetzmaske

3. **Automatische fortlaufende IP-Vergabe**
   - Deterministische Reihenfolge:
     1. Kameras (Dome Fixed → Dome Vario → Bullet Fixed → Bullet Vario → PTZ → Thermal → IP-Lautsprecher)
     2. Switches
     3. NVR/VMS Server
     4. VPN-Router (wenn Remote-Fähigkeit aktiv)
     5. WLAN-Bridge (wenn Verkabelung = WLAN-Bridge)

4. **Fehlerbehandlung**
   - Ungültige Start-IP → Fehler anzeigen
   - IP-Range Überlauf → Fehler mit Hinweis
   - Netzwerk-/Broadcast-Adressen vermeiden

5. **IP-Report im Ergebnis**
   - Tabelle pro Standort mit IP-Dokumentation
   - Spalten: Geräte-ID, Bezeichnung, Typ, Hersteller, ESO-Nr., IP-Adresse
   - Gateway und Subnetz-Info im Header
   - Zusammenfassung: Anzahl Geräte, Start-IP, End-IP

## Datenmodell

### Site Interface Erweiterung
```typescript
interface Site {
  // ... existing fields
  ipDocEnabled?: boolean      // IP-Dokumentation aktiv
  ipStart?: string           // Start-IP (z.B. "192.168.10.50")
  ipGateway?: string         // Optional Gateway
  ipCidr?: string           // CIDR Notation (z.B. "24")
}
```

### NetworkDevice Interface
```typescript
interface NetworkDevice {
  id: string                 // z.B. "CAM-01", "SW-01"
  type: DeviceType          // camera, switch, nvr, vms, router, wlan-bridge
  label: string             // Beschreibung
  manufacturer: string      // Hersteller
  esoNumber: string        // ESO-Artikelnummer
  ip?: string              // Zugewiesene IP
  category: string         // Kategorie
  note?: string           // Optionale Notiz
}
```

## IP-Helper Funktionen

### Core Functions

- **`parseIPv4(ip: string): number | null`**
  - Konvertiert IPv4-String in 32-Bit-Zahl
  - Validiert Oktett-Bereich (0-255)

- **`formatIPv4(n: number): string`**
  - Konvertiert 32-Bit-Zahl zurück in IPv4-String

- **`addIPv4(ip: string, offset: number): string | null`**
  - Addiert Offset zur IP-Adresse
  - Erkennt Überläufe

- **`validateIPv4(ip: string): boolean`**
  - Prüft IPv4-Format

- **`isValidHostIP(ip: string): boolean`**
  - Prüft ob IP eine gültige Host-Adresse ist
  - Verwirft .0 und .255 im letzten Oktett

- **`getAvailableIPsInSubnet(startIP: string): number`**
  - Berechnet verfügbare IPs bis .254

### Device Generation

- **`generateNetworkDevices(siteName, siteConfig, bomItems): NetworkDevice[]`**
  - Generiert Geräteliste aus Site-Konfiguration
  - Deterministische Reihenfolge

- **`assignIPsToDevices(devices, startIP): { devices, error? }`**
  - Weist IPs sequenziell zu
  - Validiert Bereich
  - Gibt Fehler bei Problemen zurück

## Unit Tests

5+ Tests implementiert in `ipHelper.test.ts`:

1. **IP Parse/Format** - Korrekte Konvertierung
2. **addIPv4 mit N Geräten** - Fortlaufende Vergabe
3. **Überlauf Erkennung** - IP-Bereich-Ende
4. **Invalid IP Handling** - Fehlererkennung
5. **Deterministische Reihenfolge** - Gleiche IPs bei gleicher Config

Ausführen mit:
```bash
npm test
```

## UI-Komponenten

### Schritt 5: Verkabelung & Netzwerk

- Toggle "IP-Dokumentation aktivieren"
- Bei Aktivierung:
  - Start-IP Eingabefeld mit Echtzeit-Validierung
  - CIDR Dropdown (/24, /16, /8)
  - Gateway Eingabefeld (optional)
  - Info-Box mit Erklärung

### Schritt 6: Zusammenfassung

- Neue Sektion "IP-Dokumentation" nach der Stückliste
- Pro Standort mit IP-Dokumentation:
  - Header mit Standortname, Gateway, Subnetz
  - Tabelle aller Geräte mit IPs
  - Footer mit Statistik (Anzahl, Start-IP, End-IP)
- Fehleranzeige falls IP-Bereich nicht ausreicht

## Verwendung

1. **Schritt 5** aufrufen
2. Standort auswählen
3. Toggle "IP-Dokumentation aktivieren" anklicken
4. Start-IP eingeben (z.B. `192.168.10.50`)
5. Optional: Gateway und CIDR anpassen
6. In **Schritt 6** wird die vollständige IP-Dokumentation angezeigt

## Erweiterbarkeit

Das System ist vorbereitet für:

- **IP-Reservierungen** - Bestimmte IPs überspringen
- **Separate Bereiche** - Unterschiedliche Ranges für Kameras vs. Infrastruktur
- **VLAN-Zuordnung** - Geräte in verschiedene VLANs einteilen
- **Export-Formate** - CSV, Excel, PDF Export der IP-Dokumentation
- **Statische vs. DHCP** - Kennzeichnung welche IPs statisch vs. DHCP sein sollten

## Fehlerbehandlung

| Fehler | Meldung | Lösung |
|--------|---------|--------|
| Ungültige Start-IP | "Ungültige Start-IP-Adresse" | Korrektes IPv4-Format eingeben |
| IP endet auf .0/.255 | "Start-IP ist keine gültige Host-Adresse" | Host-IP verwenden (z.B. .1-.254) |
| Zu viele Geräte | "IP-Bereich reicht nicht aus. Benötigt: X, Verfügbar: Y" | Kleinere Start-IP oder größeres Subnetz |
| IP-Überlauf | "IP-Überlauf bei Gerät X" | Start-IP weiter vorne im Subnetz wählen |

## Best Practices

1. **Start-IP wählen**: Beginnen Sie mit .50 oder höher, um Raum für Router/Gateway zu lassen
2. **Dokumentation**: Die IP-Dokumentation ersetzt keine vollständige Netzwerkplanung
3. **Validierung**: Prüfen Sie die Ergebnisse in Schritt 6 vor dem Export
4. **CIDR**: Verwenden Sie /24 für Standard-Installationen (254 nutzbare IPs)
5. **Gateway**: Geben Sie das Gateway an für bessere Dokumentation

## Technische Details

- **Determinismus**: Gleiche Konfiguration → Gleiche IP-Vergabe
- **Performance**: O(n) für n Geräte
- **Memory**: Minimal, nur aktive Geräteliste im Speicher
- **Validierung**: Client-side, keine Backend-Calls für IP-Berechnung
- **Type-Safety**: Vollständig typisiert mit TypeScript

## Roadmap

- [ ] CSV/Excel Export der IP-Dokumentation
- [ ] DHCP Reservierungs-Script generieren
- [ ] Switch Port Mapping
- [ ] VLAN Configuration
- [ ] DNS Entries Generator




