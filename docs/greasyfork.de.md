# OpenAI Status Companion

Sehen Sie den offiziellen Dienststatus von OpenAI, ohne Ihren Chat zu verlassen. Dieses unabhängige Userscript verwendet Daten von **status.openai.com**. Es ist kein Produkt von OpenAI und prüft weder die Verfügbarkeit Ihres persönlichen Kontos noch die einer Website eines Drittanbieters.

## Unterstützte Websites

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## Anzeige und Funktionen

- Bei automatischer Positionierung folgt die Statusschaltfläche der linken Seitenleiste. Schaltfläche, Statusfenster und Hinweise weichen Menüs, Eingabefeldern und anderen Bedienelementen aus. Bei Platzmangel werden sie vorübergehend ausgeblendet.
- Zeigt Komponenten nach Gruppen, aktuelle Störungen, geplante Wartungen und den Zeitpunkt der letzten erfolgreichen Aktualisierung.
- Wählen Sie die [Sprache der Oberfläche](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md) selbst oder übernehmen Sie die Sprache der Seite oder des Browsers. Titel und Meldungen zu Störungen erscheinen im offiziellen Wortlaut.
- Das Skript kann das helle oder dunkle Design der Website übernehmen. Sie können das Design und die Bildschirmecke auch selbst wählen. Die Bedienung per Tastatur ist möglich. Esc schließt das Statusfenster.
- Der Status wird alle 60 Sekunden aktualisiert, solange die Seite sichtbar ist. Im Hintergrund pausieren die Abfragen. Anfragen haben ein Zeitlimit von 15 Sekunden. Schlägt die Aktualisierung fehl, zeigt das Statusfenster die letzten verfügbaren Daten mit einem Hinweis an.
- Wenn das Skript die ältere Status-API verwendet, kennzeichnet es Abschnitte, deren Daten nicht geprüft werden konnten.

## Installation und Verwendung

Installieren Sie einen Userscript-Manager wie Tampermonkey und klicken Sie oben auf **Dieses Skript installieren**. Öffnen Sie eine unterstützte Website, klicken Sie auf die Statusschaltfläche und öffnen Sie die Einstellungen über das Zahnrad. Falls Ihr Manager zur Ausführung von Userscripts eine Einrichtung im Browser benötigt, folgen Sie seiner offiziellen Installationsanleitung.

## Datenschutz und Berechtigungen

Das Skript sendet anonyme GET-Anfragen an `status.openai.com` ohne Konto-Cookies. Es prüft Position, Größe und Sichtbarkeit von Seitenelementen sowie die Sprach- und Designeinstellungen der Seite. Es liest oder überträgt keine Eingaben, Unterhaltungen oder Konto-Tokens. Einstellungen und ein Eintrag zur Vermeidung doppelter Hinweise werden lokal gespeichert. Das Skript enthält keine Nutzungsverfolgung, Werbung, extern geladenen ausführbaren Code oder Übersetzungsdienste von Drittanbietern.

## Quellcode und Support

[Quellcode, Dokumentation und Fehlerberichte](https://github.com/laipeng101/openai-status-companion). MIT-Lizenz. Das vollständige, lesbare Userscript wird hier bereitgestellt; Quellcode und lokalisierte Beschreibungen werden automatisch über einen GitHub-Push-Webhook synchronisiert. Installieren und aktualisieren Sie das Skript über Greasy Fork.

Zusätzlich zu automatisierten Tests wurde die Platzierung in Chrome auf einer lokalen Testseite bei Desktopbreite und bei 390 px geprüft. Auf Leopard-X kamen zuvor erfasste öffentliche Statusdaten zum Einsatz. Ergebnisse und Testumfang stehen im [Validierungsdokument](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md). Änderungen an den Websites können die Platzierung beeinflussen.

[Änderungsprotokoll](https://github.com/laipeng101/openai-status-companion/blob/main/CHANGELOG.md) · [Unterstützte Sprachen](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)
