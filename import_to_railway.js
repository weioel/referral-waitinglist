const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parser');

// Verbindung zur Railway-Datenbank
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Fehler beim Verbinden zur Datenbank:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Erfolgreich mit Railway-Datenbank verbunden.');
  }
});

// Importiere Benutzer aus CSV
function importUsersFromCSV() {
  console.log('📥 Importiere Benutzer aus liste2.csv...');
  
  const users = [];
  
  fs.createReadStream('liste2.csv')
    .pipe(csv())
    .on('data', (row) => {
      users.push({
        email: row.email,
        referral_code: row.referral_code,
        referred_by: row.referred_by || null,
        created_at: row.created_at,
        referral_count: parseInt(row.referral_count) || 0,
        followup_sent: parseInt(row.followup_sent) || 0
      });
    })
    .on('end', () => {
      console.log(`📊 ${users.length} Benutzer aus CSV gelesen.`);
      insertUsers(users);
    })
    .on('error', (error) => {
      console.error('❌ Fehler beim Lesen der CSV:', error);
    });
}

// Füge Benutzer in die Datenbank ein
function insertUsers(users) {
  console.log('💾 Füge Benutzer in Railway-Datenbank ein...');
  
  // Lösche zuerst alle existierenden Benutzer
  db.run('DELETE FROM waitinglist', (err) => {
    if (err) {
      console.error('❌ Fehler beim Löschen alter Daten:', err);
      return;
    }
    
    console.log('🗑️ Alte Daten gelöscht.');
    
    // Füge neue Benutzer ein
    const stmt = db.prepare(`
      INSERT INTO waitinglist (email, referral_code, referred_by, created_at, referral_count, followup_sent) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    let inserted = 0;
    let errors = 0;
    
    users.forEach((user, index) => {
      stmt.run([
        user.email,
        user.referral_code,
        user.referred_by,
        user.created_at,
        user.referral_count,
        user.followup_sent
      ], function(err) {
        if (err) {
          console.error(`❌ Fehler beim Einfügen von ${user.email}:`, err.message);
          errors++;
        } else {
          inserted++;
        }
        
        // Wenn alle Benutzer verarbeitet wurden
        if (index === users.length - 1) {
          stmt.finalize((err) => {
            if (err) {
              console.error('❌ Fehler beim Finalisieren:', err);
            } else {
              console.log(`✅ ${inserted} Benutzer erfolgreich importiert.`);
              if (errors > 0) {
                console.log(`⚠️ ${errors} Fehler aufgetreten.`);
              }
              
              // Prüfe das Ergebnis
              verifyImport();
            }
          });
        }
      });
    });
  });
}

// Verifiziere den Import
function verifyImport() {
  console.log('🔍 Verifiziere Import...');
  
  db.get('SELECT COUNT(*) as count FROM waitinglist', (err, row) => {
    if (err) {
      console.error('❌ Fehler beim Verifizieren:', err.message);
    } else {
      console.log(`✅ Railway-Datenbank enthält jetzt ${row.count} Benutzer.`);
    }
    
    // Schließe Datenbankverbindung
    db.close((err) => {
      if (err) {
        console.error('❌ Fehler beim Schließen der Datenbank:', err.message);
      } else {
        console.log('✅ Datenbankverbindung geschlossen.');
        console.log('🎉 Import abgeschlossen!');
      }
    });
  });
}

// Starte Import
console.log('🚀 Starte Import in Railway-Datenbank...');
importUsersFromCSV(); 