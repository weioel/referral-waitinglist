-- Erstelle die waitinglist Tabelle in Supabase
-- Diese Tabelle hat die gleiche Struktur wie die SQLite Version

CREATE TABLE IF NOT EXISTS waitinglist (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  referral_count INTEGER DEFAULT 0,
  followup_sent INTEGER DEFAULT 0
);

-- Erstelle Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_waitinglist_email ON waitinglist(email);
CREATE INDEX IF NOT EXISTS idx_waitinglist_referral_code ON waitinglist(referral_code);
CREATE INDEX IF NOT EXISTS idx_waitinglist_referral_count ON waitinglist(referral_count);
CREATE INDEX IF NOT EXISTS idx_waitinglist_created_at ON waitinglist(created_at);

-- Erstelle RLS (Row Level Security) Policies
ALTER TABLE waitinglist ENABLE ROW LEVEL SECURITY;

-- Policy für Lesen (alle können lesen)
CREATE POLICY "Allow read access" ON waitinglist
  FOR SELECT USING (true);

-- Policy für Einfügen (alle können einfügen)
CREATE POLICY "Allow insert access" ON waitinglist
  FOR INSERT WITH CHECK (true);

-- Policy für Aktualisieren (nur eigene Einträge)
CREATE POLICY "Allow update own records" ON waitinglist
  FOR UPDATE USING (true);

-- Policy für Löschen (nur eigene Einträge)
CREATE POLICY "Allow delete own records" ON waitinglist
  FOR DELETE USING (true);

-- Kommentare für Dokumentation
COMMENT ON TABLE waitinglist IS 'Warteliste für Referral-System';
COMMENT ON COLUMN waitinglist.id IS 'Eindeutige ID des Benutzers';
COMMENT ON COLUMN waitinglist.email IS 'E-Mail-Adresse des Benutzers';
COMMENT ON COLUMN waitinglist.referral_code IS 'Eindeutiger Referral-Code des Benutzers';
COMMENT ON COLUMN waitinglist.referred_by IS 'Referral-Code des einladenden Benutzers';
COMMENT ON COLUMN waitinglist.created_at IS 'Erstellungsdatum des Eintrags';
COMMENT ON COLUMN waitinglist.referral_count IS 'Anzahl der erfolgreichen Referrals';
COMMENT ON COLUMN waitinglist.followup_sent IS 'Flag für gesendete Follow-up E-Mails'; 