#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys

# Read the file with latin-1 (which preserves the broken characters)
with open('pages/configurator.tsx', 'r', encoding='latin-1') as f:
    content = f.read()

# Replace all broken umlauts with correct ones
replacements = {
    'f├╝r': 'für',
    'w├ñhlen': 'wählen',
    '├╝ber': 'über',
    '├Âffentlich': 'öffentlich',
    'M├╝nchen': 'München',
    'Geb├ñude': 'Gebäude',
    'Firmengel├ñnde': 'Firmengelände',
    'n├Âtig': 'nötig',
    'zus├ñtzlich': 'zusätzlich',
    'Verf├╝gbar': 'Verfügbar',
    'Gegen├╝berstellung': 'Gegenüberstellung',
    'Gr├Â├ƒe': 'Größe',
    '├ñu├ƒen': 'außen',
    'Au├ƒen': 'Außen',
    'Pr├ñmisse': 'Prämisse',
    '├Ąu├ƒerst': 'äußerst',
    'erh├Âht': 'erhöht',
    '├╝berwacht': 'überwacht',
    '├╝berpr├╝fen': 'überprüfen',
    '├Âkonomisch': 'ökonomisch',
    'Zur├╝ck': 'Zurück',
    '├ñhnlich': 'ähnlich',
    '├Âffnen': 'öffnen',
    'Gr├Â├ƒen': 'Größen',
    'Datentr├ñger': 'Datenträger',
    'Kapazit├ñt': 'Kapazität',
    '├Âffnet': 'öffnet',
    '├ñndern': 'ändern',
    '├Ąnderung': 'Änderung',
    'Erkl├ñrung': 'Erklärung',
    'Ausf├╝hrung': 'Ausführung',
    'Hinzuf├╝gen': 'Hinzufügen',
    'L├Âschen': 'Löschen',
    'Verf├╝gbarkeit': 'Verfügbarkeit',
    'Ung├╝ltig': 'Ungültig',
    'G├╝ltig': 'Gültig',
    'Best├ñtigen': 'Bestätigen',
    '├ñnderungen': 'Änderungen',
}

for broken, correct in replacements.items():
    content = content.replace(broken, correct)

# Write back with UTF-8 encoding WITHOUT BOM
with open('pages/configurator.tsx', 'w', encoding='utf-8-sig', newline='\n') as f:
    # Remove BOM if present
    if content.startswith('\ufeff'):
        content = content[1:]
    f.write(content)

# Now remove the BOM by re-reading and writing with utf-8 (not utf-8-sig)
with open('pages/configurator.tsx', 'r', encoding='utf-8-sig') as f:
    content_no_bom = f.read()
with open('pages/configurator.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content_no_bom)

print("Encoding fixed! Umlaute corrected.")
