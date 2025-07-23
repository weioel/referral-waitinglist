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
    
    // Supabase-Insert-Statements generieren
    const inserts = rows.map(row => {
      const referredBy = row.referred_by ? `'${row.referred_by}'` : 'null';
      return `INSERT INTO waitinglist (id, email, referral_code, referred_by, created_at, referral_count, followup_sent) VALUES (${row.id}, '${row.email}', '${row.referral_code}', ${referredBy}, '${row.created_at}', ${row.referral_count}, ${row.followup_sent});`;
    });
    
    // SQL-Datei für Supabase schreiben
    const sqlContent = `-- Supabase Datenbank-Export
-- Erstellt am: ${new Date().toISOString()}
-- Anzahl Benutzer: ${rows.length}

-- Bestehende Daten löschen (falls vorhanden)
DELETE FROM waitinglist;

-- Sequence zurücksetzen
ALTER SEQUENCE waitinglist_id_seq RESTART WITH 1;

-- Daten einfügen
${inserts.join('\n')}

-- Statistiken
SELECT COUNT(*) as total_users FROM waitinglist;
SELECT COUNT(*) as users_with_referrals FROM waitinglist WHERE referral_count > 0;
SELECT MAX(referral_count) as max_referrals FROM waitinglist;
SELECT MIN(created_at) as earliest_signup, MAX(created_at) as latest_signup FROM waitinglist;
`;

    fs.writeFileSync('supabase-import.sql', sqlContent);
    console.log('✅ Supabase-Export gespeichert in: supabase-import.sql');
    console.log('📋 Nächste Schritte:');
    console.log('1. Führe create-supabase-table.sql in Supabase SQL Editor aus');
    console.log('2. Führe supabase-import.sql in Supabase SQL Editor aus');
    console.log('3. Oder verwende die Supabase Console');
    
    // JSON-Export für alternative Methode
    const jsonData = rows.map(row => ({
      id: row.id,
      email: row.email,
      referral_code: row.referral_code,
      referred_by: row.referred_by,
      created_at: row.created_at,
      referral_count: row.referral_count,
      followup_sent: row.followup_sent
    }));
    
    fs.writeFileSync('supabase-data.json', JSON.stringify(jsonData, null, 2));
    console.log('✅ JSON-Export gespeichert in: supabase-data.json');
    
    db.close();
  });
} 