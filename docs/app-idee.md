# Video-System-Konfigurator – Web-App Konzept

## 1. Ziel der Web-App
Diese Web-App dient als **Vertriebs- und Planungshilfe** für Videosysteme.

Ziel ist es, Vertriebsmitarbeitern und Partnern zu ermöglichen, **innerhalb weniger Minuten** eine fundierte Systemkonfiguration zu erstellen und eine **strukturierte, standortbezogene Stückliste inkl. UVP** zu erhalten.

### Rahmenbedingungen
- Keine personenbezogenen oder sicherheitskritischen Daten
- Kein Login erforderlich (öffentliche Vertriebsnutzung)
- Optimiert für Tablet- und Notebook-Nutzung beim Kunden
- Extern hostbar (Cloud)

---

## 2. Grundidee
Der Konfigurator arbeitet **paketbasiert**, **standortbezogen** und **regelgesteuert**.

- Der Nutzer trifft fachliche Entscheidungen
- Die App übersetzt diese Entscheidungen automatisch in:
  - Produkte
  - Zubehör
  - Lizenzen
  - Infrastruktur
- Expertenwissen wird durch Regeln standardisiert und reproduzierbar gemacht

---

## 3. Funktionsumfang (MVP)

### 3.1 Standort-Konzept
Ein Projekt kann aus **einem oder mehreren Standorten** bestehen.

Für **jeden Standort** werden separat erfasst:
- Kameras
- Verkabelung
- Netzwerkstruktur
- Zusatzkomponenten

➡️ Die Stückliste wird **standortbezogen** aufgebaut.

---

### 3.2 Paket-Auswahl
Der Nutzer wählt pro Projekt ein Grundpaket:

- **Eco / Low Budget**
- **Premium**
- **High Risk**

Jedes Paket definiert:
- Standard-Qualitätsniveau
- empfohlene Redundanzen
- verfügbare Optionen (z. B. Thermal nur ab Premium)

---

### 3.3 Hersteller-Auswahl
Pro Projekt oder Standort auswählbar:

- **AXIS**
- **Hanwha**
- **AJAX**
- **IQSIGHT** (ex Bosch)
- **MSI** (Avigilon/Pelco)

Die Auswahl beeinflusst:
- verfügbare Produkte
- Zubehör
- Lizenzen
- ESO-Artikelnummern

➡️ **Materiallisten werden pro Hersteller erstellt.**

---

### 3.4 Kamera-Konfiguration
Freie Eingabe der Anzahl pro Standort:

- Dome-Kameras
- Bullet-Kameras
- PTZ-Kameras
- Thermal-Kameras *(nur Premium & High Risk)*

Zusätzliche Auswahl:
- **Objektivtyp bei Dome & Bullet**
  - Fixed
  - Vario

Die App entscheidet automatisch:
- Konkretes Kameramodell
- Erforderliches Zubehör
- Passende Objektivvariante

---

### 3.5 Video-Management
Auswahl pro Projekt oder Standort:

- **NVR-basiert**
- **VMS-basiert**

Bei **VMS**:
- automatische Berechnung der **Lizenzen pro Gerät/Kamera**
- Lizenzen werden der Stückliste hinzugefügt

---

### 3.6 Verkabelung & Netzwerk
Pro Standort auswählbar:

#### Verkabelungsvariante
- Netzwerkkabel (Kupfer)
- Glasfaser
- WLAN-Bridge

➡️ Daraus werden automatisch ergänzt:
- Medienkonverter / SFPs
- Switches
- WLAN-Bridges
- Patchmaterial

#### Anbindung an Serverstandort
- Direkt verkabelt zum Serverstandort
- Eigenständiger Standort

Bei **eigenständigem Standort**:
- zusätzlicher Switch
- Outdoor-Cabinet
- ggf. Stromversorgung

---

### 3.7 Remote-Fähigkeit
Optional pro Standort auswählbar:

- **Remotefähigkeit aktiv**

➡️ Automatische Ergänzung:
- VPN-Router
- ggf. Mobilfunkoption (spätere Ausbaustufe)

---

### 3.8 Optionen & Randbedingungen
- Outdoor / Indoor
- Speicherdauer (z. B. 7 / 14 / 30 / 60 Tage)
- USV gewünscht  
  *(bei High Risk automatisch aktiviert)*

---

## 4. Regelbasierte Logik
Die technische Intelligenz basiert auf einer **datenbankbasierten Regel-Engine**.

### Beispielregeln
- Outdoor = true → Junction Box pro Kamera
- Dome/Bullet + Vario → anderes Kameramodell
- PTZ ≥ 2 → zusätzlicher Mastadapter
- Thermal → spezielle Halterung + Wetterschutz
- VMS → Lizenz pro Kamera
- High Risk → USV erzwingen
- Remotefähig → VPN-Router hinzufügen
- Glasfaser → SFPs + Medienkonverter ergänzen

**Vorteile**
- Änderungen ohne Code-Anpassung
- Pflege durch Produktmanagement
- Erweiterbar auf neue Hersteller & Technologien

---

## 5. Ergebnis / Output

### 5.1 Stückliste
- Standortbezogen
- Herstellerbezogen
- Gruppiert nach:
  - Kameras
  - Netzwerk
  - Recorder / VMS
  - Lizenzen
  - Speicher
  - Zubehör
  - Infrastruktur

Jede Position enthält:
- Artikelname
- Hersteller
- **ESO-Artikelnummer (ESoffice)**
- Menge
- UVP

---

### 5.2 Gesamtauswertung
- UVP pro Standort
- UVP gesamt
- Übersicht nach Herstellern

---

## 6. Technische Architektur (MVP)

### 6.1 Frontend
- React / Next.js
- Wizard-Flow
- Tablet-optimiert
- **Dark Mode / Light Mode umschaltbar**

---

### 6.2 Backend
- Next.js API Routes
- Zentrale Regel-Engine
- Hersteller- & Standortlogik im Backend

---

### 6.3 Datenbank
- PostgreSQL (Supabase)
- Pflege über Web-UI (Supabase Studio)

---

## 7. Datenmodell (Übersicht)

Zentrale Tabellen:
- `projects`
- `sites` (Standorte)
- `tiers`
- `manufacturers`
- `products`
- `tier_defaults`
- `rules`
- `quotes`
- `quote_lines`

Relevante Felder:
- Hersteller
- ESO-Artikelnummer
- Standort-ID
- Verkabelungstyp
- Objektivtyp
- Lizenztyp

---

## 8. Datenpflege & Administration

### 8.1 Datenpflege (MVP)
- Supabase Studio
- Pflege von:
  - Produkten
  - ESO-Artikelnummern
  - Regeln
  - Herstellerzuordnungen

### 8.2 Optionale Admin-UI (später)
- NocoDB oder Directus
- Pflege ohne SQL-Kenntnisse

---

## 9. Typischer Vertriebs-Workflow
1. Projekt anlegen
2. Standorte definieren
3. Paket & Hersteller wählen
4. Kameras & Optionen pro Standort erfassen
5. Netzwerk & Verkabelung auswählen
6. Ergebnis: Standort- & Hersteller-Stücklisten + UVP
7. Übergabe an Angebot / ERP (ESoffice)

---

## 10. Abgrenzung des MVP
Bewusst nicht enthalten:
- Benutzer-Login
- Rabatt- & Margenlogik
- Installations- & Servicekosten
- Automatische ERP-Synchronisation (nur Vorbereitung)

---

## 11. Zukunftsausbau (Roadmap)
- ERP-Direktanbindung (ESoffice)
- Angebots-PDF
- CRM-Integration
- Mobile Offline-Version
- KI-gestützter Beratungsassistent
- Multi-Projekt-Verwaltung

---

## Status
- Frontend-Mock vorhanden
- Backend-Architektur definiert
- Standort-, Hersteller- & Regelkonzept ausgearbeitet

Dieses Dokument dient als **strategische, technische und konzeptionelle Grundlage** für Entwicklung, IT-Freigabe und Rollout.
