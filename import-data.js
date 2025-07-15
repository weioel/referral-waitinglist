const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Datenbank verbinden
const db = new sqlite3.Database('./waitinglist.db', (err) => {
  if (err) {
    console.error('Fehler beim Verbinden zur Datenbank:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Erfolgreich mit SQLite Datenbank verbunden.');
    importData();
  }
});

/**
 * Importiert die CSV-Daten in die Datenbank
 */
function importData() {
  try {
    // CSV-Datei lesen
    const csvData = fs.readFileSync('./bmails.csv', 'utf8');
    const lines = csvData.split('\n');
    
    // Header überspringen
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    
    console.log(`📊 Importiere ${dataLines.length} E-Mail-Adressen...`);
    
    let imported = 0;
    let skipped = 0;
    
    // Jede Zeile verarbeiten
    dataLines.forEach((line, index) => {
      const [email, referralCount] = line.split(',');
      
      if (!email || !email.includes('@')) {
        console.log(`⚠️  Ungültige E-Mail in Zeile ${index + 2}: ${email}`);
        skipped++;
        return;
      }
      
      const referralCode = uuidv4();
      const referralCountNum = parseInt(referralCount) || 0;
      
      // Zufälliges Datum in den letzten 30 Tagen generieren
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
      const createdAt = randomDate.toISOString().slice(0, 19).replace('T', ' ');
      
      // In Datenbank einfügen
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO waitinglist (email, referral_code, referral_count, created_at) 
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run([email.trim(), referralCode, referralCountNum, createdAt], function(err) {
        if (err) {
          console.error(`❌ Fehler beim Einfügen von ${email}:`, err.message);
          skipped++;
        } else if (this.changes > 0) {
          imported++;
          if (imported % 10 === 0) {
            console.log(`✅ ${imported} E-Mails importiert...`);
          }
        } else {
          skipped++;
        }
        
        // Wenn alle Zeilen verarbeitet wurden
        if (imported + skipped === dataLines.length) {
          finishImport();
        }
      });
      
      stmt.finalize();
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Lesen der CSV-Datei:', error.message);
    process.exit(1);
  }
}

/**
 * Beendet den Import und zeigt Statistiken
 */
function finishImport() {
  // Gesamtanzahl der Einträge abrufen
  db.get('SELECT COUNT(*) as total FROM waitinglist', [], (err, row) => {
    if (err) {
      console.error('Fehler beim Abrufen der Statistiken:', err.message);
    } else {
      console.log('\n🎉 Import abgeschlossen!');
      console.log(`📊 Gesamtanzahl Einträge in der Datenbank: ${row.total}`);
      
      // Top 5 Referrals anzeigen
      db.all(`
        SELECT email, referral_count, created_at 
        FROM waitinglist 
        ORDER BY referral_count DESC, created_at ASC 
        LIMIT 5
      `, [], (err, rows) => {
        if (err) {
          console.error('Fehler beim Abrufen der Top 5:', err.message);
        } else {
          console.log('\n🏆 Top 5 Referrals:');
          rows.forEach((row, index) => {
            const maskedEmail = maskEmail(row.email);
            console.log(`${index + 1}. ${maskedEmail} - ${row.referral_count} Referrals`);
          });
        }
        
        // Datenbank schließen
        db.close((err) => {
          if (err) {
            console.error('Fehler beim Schließen der Datenbank:', err.message);
          } else {
            console.log('\n✅ Datenbankverbindung geschlossen.');
            console.log('🚀 Du kannst jetzt http://localhost:3000 öffnen!');
          }
        });
      });
    }
  });
}

/**
 * Maskiert E-Mail-Adressen für die Anzeige
 */
function maskEmail(email) {
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.length > 2 
    ? localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1)
    : localPart;
  return `${maskedLocal}@${domain}`;
} 