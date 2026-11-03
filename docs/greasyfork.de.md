# OpenAI Status Companion

Sehen Sie den offiziellen Dienststatus von OpenAI, ohne Ihren Chat zu verlassen. Dieses unabhängige Userscript verwendet Daten von **status.openai.com**. Es ist kein Produkt von OpenAI und prüft weder die Verfügbarkeit Ihres persönlichen Kontos noch die einer Website eines Drittanbieters.

## Unterstützte Websites

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## Anzeige und Funktionen

- Bei automatischer Positionierung dockt eine kompakte Statusschaltfläche neben der linken Seitenleiste an und folgt ihr beim Aufklappen, Zuklappen und Ändern der Breite. In schmalen Fenstern bleibt die Schaltfläche in einer Ecke; das Panel bleibt innerhalb des sichtbaren Bereichs.
- Offizielle Komponentengruppen, laufende Vorfälle, geplante Wartungen und der Zeitpunkt des letzten erfolgreichen Abrufs.
- 13 Oberflächensprachen: Englisch, vereinfachtes und traditionelles Chinesisch, Spanisch, Hindi, brasilianisches Portugiesisch, Japanisch, Koreanisch, Französisch, Deutsch, Indonesisch, Arabisch und Russisch. Die Seiten- oder Browsersprache wird automatisch erkannt; eine manuelle Auswahl ist ebenfalls vorhanden. Arabisch verwendet ein Layout von rechts nach links. Offizielle Vorfalltitel und Meldungen bleiben in ihrer Originalsprache; es wird kein Übersetzungsdienst verwendet.
- Übernahme des hellen oder dunklen Website-Designs, manuelle Auswahl von Design und Ecke, Tastaturbedienung und Schließen mit Escape.
- Sichtbare Seiten werden alle 60 Sekunden aktualisiert; regelmäßige Abfragen im Hintergrund pausieren. Anfragen haben ein Zeitlimit von 15 Sekunden. Bei fehlgeschlagenen Aktualisierungen bleiben Daten im Cache erhalten und werden deutlich gekennzeichnet.
- Unvollständige Kompatibilitätsdaten werden ausdrücklich als ungeprüft markiert und nicht als geprüfte Entwarnung angezeigt.

## Installation und Verwendung

Installieren Sie einen Userscript-Manager wie Tampermonkey und klicken Sie oben auf **Dieses Skript installieren**. Öffnen Sie eine unterstützte Website, klicken Sie auf die Statusschaltfläche und öffnen Sie die Einstellungen über das Zahnrad. Falls Ihr Manager zur Ausführung von Userscripts eine Einrichtung im Browser benötigt, folgen Sie seiner offiziellen Installationsanleitung.

## Datenschutz und Berechtigungen

Statusabfragen sind anonyme GET-Anfragen an `status.openai.com` ohne Konto-Cookies. Das Skript prüft die Geometrie der Seitenleiste sowie die Sprach- und Designattribute der Seite. Es liest oder überträgt keine Prompts, Unterhaltungen oder Konto-Tokens. Nur die Einstellungen und eine Kennung zur Erkennung von Statusmeldungen werden lokal gespeichert. Es enthält keine Nutzungsanalyse, Werbung, entfernten ausführbaren Abhängigkeiten oder Übersetzungsdienste von Drittanbietern.

## Quellcode und Support

[Quellcode, Dokumentation und Fehlerberichte](https://github.com/laipeng101/openai-status-companion). MIT-Lizenz. Das vollständige, lesbare Userscript wird hier bereitgestellt; Quellcode und lokalisierte Beschreibungen werden automatisch über einen GitHub-Push-Webhook synchronisiert. Installieren und aktualisieren Sie das Skript über Greasy Fork.

Die Tests umfassen automatisierte Regressionstests, Prüfungen mit Testseiten in Chrome bei Desktopbreiten und 390 px Breite sowie die Integration in das echte Leopard-X-Layout mit erneut abgespielten öffentlichen Statusdaten. Ergebnisse und getestete Grenzen finden Sie im [Validierungsdokument](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md) des Repositorys. Die Layouts können sich mit der Weiterentwicklung der unterstützten Websites ändern.
