# Sales Logic & Rules – Video-System-Konfigurator

Dieses Dokument beschreibt die **verbindliche Vertriebs-, Logik- und Kalkulationslogik**
für den Video-System-Konfigurator.

Ziel:
- realistische Angebote
- vertriebstaugliche Reserven
- klare Trennung zwischen Material, Dienstleistung und Empfehlungen
- weiterhin Nutzung von Dummy-Artikeln (Platzhalter)

---

## 1. Kameraauswahl & Kameranamen

### Regel
- Jede Kamera erhält **bereits in der Kameraauswahl** einen Namen.
- Vorgehen:
  - Default-Name wird automatisch vergeben (Hersteller + Typ + Auflösung)
    - z. B. `AXIS Dome 8MP Vario`
  - Der Nutzer kann den Namen **optional frei ändern**
    - z. B. `Tor 1 – Zufahrt`

### Ziel
- Kameranamen erscheinen:
  - in der Stückliste
  - in der IP-Dokumentation
  - in der Netzwerktopologie

---

## 2. Automatische Reserve bei Switch & NVR

### Grundregel
Es wird **immer die nächstgrößere Gerätegröße** gewählt, um Reserve zu schaffen.

### Switche
- Sobald die Anzahl der Kameras die Portanzahl überschreitet:
  - automatisch nächstgrößeren Switch wählen
- Beispiel:
  - 7 Kameras → kein 8-Port, sondern 16-Port Switch

### NVR
- Immer mit Reserve auswählen:
  - 7 Kameras → nächstgrößeres NVR-Modell

### Sonderregel ECO
- **Kein separater Switch**
- Es wird **ein NVR mit PoE-Ports** gewählt
- Auch hier: nächstgrößeres Modell für Reserve

---

## 3. Speicherdauer & Festplatten-Empfehlung (DSGVO-sensibel)

### Ziel
Keine punktgenaue Kalkulation, sondern **realistische Maximalabschätzung**.

### Logik
- Auf Basis von:
  - Anzahl Kameras
  - Speichertage
- Das System gibt:
  - eine **empfohlene HDD-Größe** aus
  - blendet **unrealistische Größen aus**

### Darstellung
- Empfehlung:
  - z. B. „Empfohlen: 8–16 TB“
- Warnhinweis bei hohen Werten:
  - „Hinweis: Lange Speicherdauern können DSGVO-relevant sein.“

---

## 4. Remote-Zugriff – Kundenanforderungen (berechnet)

### Regel
Bei aktivierter Remotefähigkeit:
- Das System berechnet eine **empfohlene Upload-Bandbreite**
- Abhängig von:
  - Anzahl Kameras
  - Standard-Streamannahmen

### Ausgabe
- Klarer Empfehlungstext, z. B.:
  - „Empfohlen: ≥ 10 Mbit/s Upload“
  - „Für bessere Bedienbarkeit: Substreams verwenden“

---

## 5. VMS – Workstation & Multibild

### Grundregel
Bei Auswahl **VMS** wird **immer automatisch** ergänzt:
- 1× Client-Workstation
- 1× Display
- 1× Maus + Tastatur

### Multibild-Option
Wenn „Multibild“ aktiviert:
- Es wird automatisch eine **Workstation mit RTX-Grafikkarte** gewählt

---

## 6. Verkabelung & 9 HE Netzwerkschrank

### Auswahl
- 9 HE Netzwerkschrank ist **optional manuell auswählbar**

### Inhalt (pauschal)
- 9 HE Schrank
- Steckdosenleiste
- Lüfter / Zubehör

### Darstellung
- Als **eine Pauschalposition** in der Stückliste

---

## 7. Zusatzleistungen & Pauschalen

### 7a. Hubsteiger
- Optional manuell auswählbar
- Pauschalposition:
  - „Hubsteiger max. 12 m inkl. Anlieferung“

---

### 7b. BHE-Zeiten (Videotechnik)
- Es existiert eine **BHE-Zeitentabelle**
- Diese enthält:
  - Minutenwerte für Montage & Inbetriebnahme
  - je Komponententyp (Kamera, Rekorder, Switch etc.)
- Die Zeiten werden:
  - automatisch berechnet
  - als Dienstleistungsposition ausgewiesen
- Stundensatz: **120 € / Stunde**

---

### 7c. Dokumentationskosten
- Fixe Regel:
  - **5 % der Gesamtsumme**
- Wird automatisch als eigene Position ergänzt

---

### 7d. Anfahrtspauschale
- Regel:
  - **je 4 Kameras eine Anfahrtspauschale**
  - Preis: **135 €**
- Immer **aufrunden**
  - 1–4 Kameras → 1×
  - 5–8 Kameras → 2×

---

### 7e. Installationsmaterial
- Wird **pauschal im Artikelpreis** berücksichtigt
- Beispiele:
  - 2 m Patchkabel pro Kamera
  - 3er-Steckdose pro Rekorder
- Kein separates Ausweisen einzelner Kleinteile

---

## 8. Festplatten – Maximalabschätzung & Warnung

### Regel
- Es wird **keine exakte Bitratenrechnung** durchgeführt
- Stattdessen:
  - realistische Maximalabschätzung
  - Ausblenden technisch unsinniger HDD-Kombinationen

### UX
- Empfehlung + Warnhinweis
- Keine Überfrachtung der Auswahl

---

## 9. Grundsätze für die Umsetzung

- Alle Regeln sind **datengetrieben** umzusetzen
- Keine Hersteller- oder SKU-Hardcodierung
- Dummy-Artikel bleiben erhalten
- Spätere Umstellung auf Live-Katalog erfolgt **nur über Datenpflege**

---

## Ergebnis
Der Konfigurator liefert:
- realistische Angebote
- nachvollziehbare Reserven
- klare Trennung:
  - Material
  - Dienstleistung
  - Empfehlung / Hinweis
- hohe Akzeptanz im Vertrieb
