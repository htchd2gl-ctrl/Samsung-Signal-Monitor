# APK erstellen (ohne Android Studio)

Der Android-Quellcode befindet sich im Ordner `android/`. Eine APK ist in diesem ZIP **noch nicht enthalten**.

## Mit GitHub Actions

1. Ein neues **privates** GitHub-Repository anlegen und den **Inhalt** dieses ZIPs hochladen (nicht nur die ZIP-Datei).
2. In GitHub **Actions** öffnen, den Workflow **Android APK erstellen** auswählen und auf **Run workflow** klicken. Alternativ startet der Build nach dem Hochladen automatisch, wenn Dateien unter `android/` übertragen wurden.
3. Warten bis der Build erfolgreich (grün) ist. Unter **Artifacts** das Paket **Samsung-Signal-Monitor-APK** herunterladen, entpacken und `app-debug.apk` auf die beiden eigenen Samsung-Geräte übertragen.
4. Auf beiden Geräten die APK installieren. Android kann dafür die Berechtigung **Apps aus dieser Quelle installieren** verlangen.
5. Auf beiden Geräten Tailscale aktivieren und die Windows-Server-Adresse und jeweils den eigenen Token aus `EINRICHTUNG-GEHEIM.txt` konfigurieren.

**Achtung:** Das ist eine *Debug-APK* zum privaten Testen, nicht für die Veröffentlichung. Vor Installation nur Builds aus dem eigenen Repository verwenden. Die Anwendung sendet aktuell nur, solange sie geöffnet ist.

## Lokal mit Android Studio

Ordner `android` in Android Studio öffnen, Gradle-Version 8.9 mit Android Gradle Plugin 8.7.3 verwenden, SDK 35 installieren, dann `Build > Build APK(s)` ausführen. Das Ergebnis liegt unter `android/app/build/outputs/apk/debug/app-debug.apk`.

## Wenn der Build fehlschlägt

Im GitHub-Workflow den Schritt **APK bauen** anklicken und die Fehlermeldung prüfen. Das Projekt wurde hier nicht auf einem Android-SDK kompiliert, daher sind verbleibende Kompilierprobleme möglich.
