# 🚀 Referral Wartelisten-System

Ein einfaches und effektives Wartelisten-System mit Referral-Mechanismus, das es Nutzern ermöglicht, durch Empfehlungen in der Warteliste aufzusteigen.

## ✨ Features

- **Einfache Anmeldung**: Nutzer können sich mit ihrer E-Mail-Adresse zur Warteliste anmelden
- **Automatische Referral-Links**: Jeder Nutzer erhält einen individuellen Empfehlungslink
- **Intelligente Rangliste**: Sortierung nach Anzahl der Referrals und Anmeldezeitpunkt
- **Persistente Erkennung**: Nutzer werden automatisch erkannt und ihr Dashboard angezeigt
- **Responsive Design**: Funktioniert auf Desktop und Mobile
- **Datenschutz**: E-Mail-Adressen werden in der Rangliste maskiert angezeigt

## 🏆 Ranglisten-Logik

1. **Hauptkriterium**: Anzahl der erfolgreichen Referral-Anmeldungen
2. **Bei Gleichstand**: Zeitstempel der Anmeldung (frühere Anmeldungen werden höher platziert)

## 🛠️ Technische Details

- **Backend**: Node.js mit Express
- **Datenbank**: SQLite (einfach zu deployen)
- **Frontend**: Vanilla JavaScript mit Tailwind CSS
- **Referral-Links**: UUID-basierte eindeutige Identifikation

## 📦 Installation

### Voraussetzungen

- Node.js (Version 14 oder höher)
- npm oder yarn

### Schritte

1. **Repository klonen oder Dateien herunterladen**

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Server starten**
   ```bash
   # Entwicklung (mit Auto-Reload)
   npm run dev
   
   # Produktion
   npm start
   ```

4. **Anwendung öffnen**
   - Öffne http://localhost:3000 in deinem Browser

## 🔧 Konfiguration

### Umgebungsvariablen

Du kannst folgende Umgebungsvariablen setzen:

- `PORT`: Port für den Server (Standard: 3000)

Beispiel:
```bash
PORT=8080 npm start
```

### Datenbank

Die SQLite-Datenbank wird automatisch erstellt:
- Datei: `waitinglist.db`
- Tabelle: `waitinglist`

## 📱 Verwendung

### Für Nutzer

1. **Anmeldung**: E-Mail-Adresse eingeben und anmelden
2. **Dashboard**: Position, Referral-Zähler und persönlicher Link werden angezeigt
3. **Teilen**: Referral-Link mit Freunden teilen
4. **Aufsteigen**: Je mehr Freunde sich über den Link anmelden, desto höher die Position

### Referral-Links

- Format: `http://localhost:3000/ref/[referral-code]`
- Beispiel: `http://localhost:3000/ref/550e8400-e29b-41d4-a716-446655440000`

### API-Endpunkte

- `POST /api/join` - Neue Anmeldung
- `GET /api/user/:referralCode` - Benutzerinformationen
- `GET /api/leaderboard` - Rangliste

## 🚀 Deployment

### Lokale Entwicklung
```bash
npm run dev
```

### Produktion
```bash
npm start
```

### Mit PM2 (empfohlen für Produktion)
```bash
npm install -g pm2
pm2 start server.js --name "referral-waitinglist"
pm2 startup
pm2 save
```

## 📁 Projektstruktur

```
referral-waitinglist/
├── server.js              # Hauptserver-Datei
├── package.json           # Dependencies und Scripts
├── waitinglist.db         # SQLite Datenbank (wird automatisch erstellt)
├── public/
│   ├── index.html         # Hauptseite
│   └── app.js            # Frontend-Logik
└── README.md             # Diese Datei
```

## 🔒 Sicherheit & Datenschutz

- **E-Mail-Validierung**: Nur gültige E-Mail-Adressen werden akzeptiert
- **Duplikat-Prävention**: Jede E-Mail-Adresse kann nur einmal verwendet werden
- **Datenschutz**: E-Mail-Adressen werden in der Rangliste maskiert angezeigt
- **UUID**: Sichere, eindeutige Referral-Codes

## 🎯 Erweiterungsmöglichkeiten

Das System ist modular aufgebaut und kann einfach erweitert werden:

- **E-Mail-Benachrichtigungen**: Bei neuen Referrals
- **Admin-Panel**: Zur Verwaltung der Warteliste
- **Analytics**: Detaillierte Statistiken
- **Gamification**: Belohnungen für Top-Referrer
- **Social Media Integration**: Direktes Teilen auf Social Media
- **Export-Funktionen**: CSV/Excel Export der Warteliste

## 🐛 Troubleshooting

### Häufige Probleme

1. **Port bereits belegt**
   ```bash
   # Anderen Port verwenden
   PORT=8080 npm start
   ```

2. **Datenbankfehler**
   ```bash
   # Datenbank-Datei löschen und neu erstellen
   rm waitinglist.db
   npm start
   ```

3. **Dependencies nicht gefunden**
   ```bash
   # Node modules neu installieren
   rm -rf node_modules package-lock.json
   npm install
   ```

## 📄 Lizenz

MIT License - siehe LICENSE Datei für Details.

## 🤝 Beitragen

Verbesserungen und Bugfixes sind willkommen! Bitte erstelle ein Issue oder Pull Request.

## 📞 Support

Bei Fragen oder Problemen:
1. Überprüfe die Troubleshooting-Sektion
2. Erstelle ein Issue im Repository
3. Kontaktiere den Entwickler

---

**Viel Erfolg mit deinem Referral-Wartelisten-System! 🚀** # Updated Wed Jul 23 15:06:09 CEST 2025
# Force Vercel redeploy Wed Jul 23 17:19:41 CEST 2025
