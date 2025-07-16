const sqlite3 = require('sqlite3').verbose();

// Verbindung zur Railway-Datenbank (Railway verwendet dieselbe Datei)
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Fehler beim Verbinden zur Datenbank:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Erfolgreich mit Railway-Datenbank verbunden.');
  }
});

// Migration: Spalte followup_sent hinzufügen
function addFollowupSentColumn() {
  console.log('🔧 Füge followup_sent Spalte hinzu...');
  
  db.run(`ALTER TABLE waitinglist ADD COLUMN followup_sent INTEGER DEFAULT 0`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✅ Spalte followup_sent existiert bereits.');
      } else {
        console.error('❌ Fehler beim Hinzufügen der Spalte:', err.message);
      }
    } else {
      console.log('✅ Spalte followup_sent erfolgreich hinzugefügt.');
    }
    
    // Prüfe die aktuelle Tabellenstruktur
    checkTableStructure();
  });
}

// Prüfe die Tabellenstruktur
function checkTableStructure() {
  console.log('📋 Prüfe Tabellenstruktur...');
  
  db.all(`PRAGMA table_info(waitinglist)`, (err, rows) => {
    if (err) {
      console.error('❌ Fehler beim Prüfen der Tabellenstruktur:', err.message);
    } else {
      console.log('📊 Aktuelle Tabellenstruktur:');
      rows.forEach(row => {
        console.log(`  - ${row.name} (${row.type})`);
      });
    }
    
    // Zähle Benutzer
    countUsers();
  });
}

// Zähle Benutzer in der Datenbank
function countUsers() {
  console.log('👥 Zähle Benutzer...');
  
  db.get('SELECT COUNT(*) as count FROM waitinglist', (err, row) => {
    if (err) {
      console.error('❌ Fehler beim Zählen der Benutzer:', err.message);
    } else {
      console.log(`✅ Datenbank enthält ${row.count} Benutzer.`);
    }
    
    // Schließe Datenbankverbindung
    db.close((err) => {
      if (err) {
        console.error('❌ Fehler beim Schließen der Datenbank:', err.message);
      } else {
        console.log('✅ Datenbankverbindung geschlossen.');
        console.log('🎉 Migration abgeschlossen!');
      }
    });
  });
}

// Führe Migration aus
console.log('🚀 Starte Railway-Datenbank Migration...');
addFollowupSentColumn(); 