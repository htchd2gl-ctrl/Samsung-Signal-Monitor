# Samsung Signal Monitor – Windows-PC / Tailscale (Prototyp 0.2)

Für Elgato Stream Deck MK.2, Galaxy Z Fold7 und XCover6 Pro. Keine Cloud-Datenbank; der eigene Windows-PC empfängt die Werte. Tailscale bildet eine verschlüsselte private Verbindung auch über Mobilfunk.

## 1. Vorbereitung

- Windows 10/11 mit Node.js 22+ (https://nodejs.org/), Stream Deck Software 7.1+.
- Auf Windows und beiden Samsung-Handys **Tailscale** installieren, mit demselben Tailnet verbinden und auf den Handys aktivieren.
- Im Tailscale-Menü die **100.x.y.z IPv4-Adresse des Windows-PCs** ermitteln.
- Windows-PC muss eingeschaltet sein und darf nicht schlafen, wenn die Tasten live aktualisiert werden sollen.

## 2. PC-Server einrichten

PowerShell öffnen, im Ordner `windows-server` ausführen:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

`setup.ps1` erstellt **lokal auf deinem PC** drei zufällige Schlüssel und speichert sie in `settings.json` und `EINRICHTUNG-GEHEIM.txt`. Diese Dateien niemals weitergeben! Das Serverprogramm lauscht nur an `127.0.0.1` und der eingegebenen Tailscale-IP, nicht am öffentlichen Netzwerk.

Falls die Windows-Firewall den Zugriff blockiert, als Administrator eine eng begrenzte Regel anlegen (die IP durch deine Tailscale-IP ersetzen):

```powershell
New-NetFirewallRule -DisplayName 'Samsung Signal Monitor Tailscale' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8787 -LocalAddress 100.x.y.z -RemoteAddress 100.64.0.0/10
```

**Keine Portweiterleitung im Router** für 8787 einrichten. Die App nutzt HTTP nur innerhalb des verschlüsselten Tailscale-Tunnels. Ohne Tailscale ist die Verbindung nicht geschützt.

## 3. Stream Deck installieren

**Stream Deck Software vollständig beenden**, dann im Ordner `streamdeck` `install-plugin.ps1` ausführen. Stream Deck starten und aus `Samsung Signal Monitor` die Aktionen **Galaxy Z Fold7** und **XCover6 Pro** auf zwei Tasten ziehen. Die Plugin-Konfiguration wird beim Setup automatisch mit dem lokalen Leseschlüssel erzeugt.

## 4. Android-App bauen und installieren

Ordner `android` in Android Studio öffnen; Gradle synchronisieren und `Build APK(s)` verwenden. Es ist Quellcode, **keine fertige APK**. Die APK auf beiden eigenen Handys installieren und die Telefonberechtigung erlauben. Auf jedem Handy Tailscale einschalten. In der Signal-Monitor-App eintragen:

- Server-URL: `http://100.x.y.z:8787` (die Tailscale-IP des PCs).
- Fold7: Gerät `fold7`, zugehöriger Token aus `EINRICHTUNG-GEHEIM.txt`.
- XCover6 Pro: Gerät `xcover6`, dessen Token.

`Speichern und verbinden` drücken. Die App **sichtbar geöffnet lassen**, da der Prototyp beim Verlassen der App die Übertragung stoppt. Die Aktualisierung ist alle zehn Sekunden vorgesehen; nach 45 Sekunden ohne Daten wird das Gerät als Offline dargestellt. 5G NSA kann von Samsung je nach Netzbedingungen unterschiedlich gemeldet werden.

## 5. Hinweise und Grenzen

- Nicht zum Veröffentlichen vorgesehen. Android erlaubt hier HTTP-Klartext, daher **ausschließlich in Tailscale** verwenden, niemals auf öffentliche Server umkonfigurieren.
- Token nur lokal speichern; bei Verlust oder Weitergabe neu generieren und Geräte neu verbinden.
- Der PC-Server speichert die neuesten Werte nur im RAM. Neustart setzt die Anzeige zurück, bis die Handys wieder senden.
- Diese Version hat **keinen dauerhaften Hintergrunddienst**; gesperrte Telefone senden möglicherweise nicht weiter.
- Keine Tests auf echten Samsung-Geräten durchgeführt. SDK-Schnittstellen sind implementiert, ein APK-Build ist noch erforderlich.
- Für dauerhaften Einsatz: Windows-Autostart, signierte APK, Android-Foreground-Service mit entsprechendem Benachrichtigungstyp, sichere Geräteschlüsselspeicherung, sowie Härtung der Tailscale-Zugriffsregeln ergänzen.

## 6. Schnelltest PC-Server

```powershell
cd windows-server
node test-server.js
```

Offizielle Dokumentation: https://docs.elgato.com/streamdeck/sdk/ | https://tailscale.com/docs/install/windows | https://tailscale.com/docs/install/android
