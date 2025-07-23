const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Lokale Datenbank öffnen
const db = new sqlite3.Database('./database.sqlite', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Fehler beim Öffnen der Datenbank:', err.message);
    process.exit(1);
  }
  console.log('✅ Lokale Datenbank geöffnet');
  exportData();
});

function exportData() {
  // Alle Benutzer exportieren
  db.all('SELECT * FROM waitinglist ORDER BY id', [], (err, rows) => {
    if (err) {
      console.error('Fehler beim Exportieren:', err.message);
      process.exit(1);
    }
    
    console.log(`📊 ${rows.length} Benutzer gefunden`);
    
    // SQL-Insert-Statements generieren
    const inserts = rows.map(row => {
      return `INSERT INTO waitinglist (id, email, referral_code, referred_by, created_at, referral_count, followup_sent) VALUES (${row.id}, '${row.email}', '${row.referral_code}', ${row.referred_by ? `'${row.referred_by}'` : 'NULL'}, '${row.created_at}', ${row.referral_count}, ${row.followup_sent});`;
    });
    
    // SQL-Datei schreiben
    const sqlContent = `-- Datenbank-Export für Railway
-- Erstellt am: ${new Date().toISOString()}
-- Anzahl Benutzer: ${rows.length}

-- Tabelle erstellen (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS waitinglist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  referral_count INTEGER DEFAULT 0,
  followup_sent INTEGER DEFAULT 0
);

-- Bestehende Daten löschen (falls vorhanden)
DELETE FROM waitinglist;

-- Daten einfügen
${inserts.join('\n')}

-- Statistiken
SELECT COUNT(*) as total_users FROM waitinglist;
SELECT COUNT(*) as users_with_referrals FROM waitinglist WHERE referral_count > 0;
SELECT MAX(referral_count) as max_referrals FROM waitinglist;
`;

    fs.writeFileSync('database-export.sql', sqlContent);
    console.log('✅ Export gespeichert in: database-export.sql');
    console.log('📋 Nächste Schritte:');
    console.log('1. Lade database-export.sql auf Railway hoch');
    console.log('2. Führe das SQL-Script in der Railway-Datenbank aus');
    console.log('3. Oder verwende das Script in der Railway-Konsole');
    
    db.close();
  });
} 