-- Supabase Setup für Warteliste
-- Alle notwendigen Tabellen und Funktionen

-- 1. Tabelle erstellen
CREATE TABLE IF NOT EXISTS waitinglist (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  referral_count INTEGER DEFAULT 0,
  followup_sent INTEGER DEFAULT 0
);

-- 2. Indices für Performance
CREATE INDEX IF NOT EXISTS idx_waitinglist_email ON waitinglist(email);
CREATE INDEX IF NOT EXISTS idx_waitinglist_referral_code ON waitinglist(referral_code);
CREATE INDEX IF NOT EXISTS idx_waitinglist_referral_count ON waitinglist(referral_count);
CREATE INDEX IF NOT EXISTS idx_waitinglist_created_at ON waitinglist(created_at);

-- 3. RPC-Funktion für Positionsberechnung
CREATE OR REPLACE FUNCTION get_position_in_waitinglist(
  user_referral_count INTEGER,
  user_created_at TIMESTAMP WITH TIME ZONE,
  user_id BIGINT
) RETURNS JSON AS $$
DECLARE
  people_ahead INTEGER;
BEGIN
  SELECT COUNT(*) INTO people_ahead
  FROM waitinglist 
  WHERE (referral_count > user_referral_count)
    OR (referral_count = user_referral_count AND created_at < user_created_at)
    OR (referral_count = user_referral_count AND created_at = user_created_at AND id < user_id);
    
  RETURN json_build_object('peopleAhead', people_ahead);
END;
$$ LANGUAGE plpgsql;

-- 4. RPC-Funktion für potenziellen Sprung
CREATE OR REPLACE FUNCTION get_potential_jump_in_waitinglist(
  user_referral_count INTEGER,
  user_created_at TIMESTAMP WITH TIME ZONE,
  user_id BIGINT
) RETURNS JSON AS $$
DECLARE
  jump_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO jump_count
  FROM waitinglist
  WHERE referral_count = user_referral_count 
    AND (created_at < user_created_at OR (created_at = user_created_at AND id < user_id));
    
  RETURN json_build_object('jump', jump_count);
END;
$$ LANGUAGE plpgsql;

-- 5. RPC-Funktion für nächsten Sprung
CREATE OR REPLACE FUNCTION get_next_jump_in_waitinglist(
  user_referral_count INTEGER,
  user_created_at TIMESTAMP WITH TIME ZONE,
  user_id BIGINT
) RETURNS JSON AS $$
DECLARE
  next_jump INTEGER;
BEGIN
  SELECT COUNT(*) INTO next_jump
  FROM waitinglist
  WHERE (referral_count < user_referral_count)
    OR (referral_count = user_referral_count AND (created_at < user_created_at OR (created_at = user_created_at AND id < user_id)));
    
  RETURN json_build_object('nextJump', next_jump);
END;
$$ LANGUAGE plpgsql;

-- 6. RLS Policies (Row Level Security)
ALTER TABLE waitinglist ENABLE ROW LEVEL SECURITY;

-- Policy für Lesen (alle können lesen)
DROP POLICY IF EXISTS "Allow read access" ON waitinglist;
CREATE POLICY "Allow read access" ON waitinglist
  FOR SELECT USING (true);

-- Policy für Einfügen (alle können einfügen)
DROP POLICY IF EXISTS "Allow insert access" ON waitinglist;
CREATE POLICY "Allow insert access" ON waitinglist
  FOR INSERT WITH CHECK (true);

-- Policy für Aktualisieren (alle können aktualisieren)
DROP POLICY IF EXISTS "Allow update access" ON waitinglist;
CREATE POLICY "Allow update access" ON waitinglist
  FOR UPDATE USING (true);

-- Policy für Löschen (alle können löschen)
DROP POLICY IF EXISTS "Allow delete access" ON waitinglist;
CREATE POLICY "Allow delete access" ON waitinglist
  FOR DELETE USING (true);

-- 7. Kommentare für Dokumentation
COMMENT ON TABLE waitinglist IS 'Warteliste für Referral-System';
COMMENT ON COLUMN waitinglist.id IS 'Eindeutige ID des Benutzers';
COMMENT ON COLUMN waitinglist.email IS 'E-Mail-Adresse des Benutzers';
COMMENT ON COLUMN waitinglist.referral_code IS 'Eindeutiger Referral-Code des Benutzers';
COMMENT ON COLUMN waitinglist.referred_by IS 'Referral-Code des einladenden Benutzers';
COMMENT ON COLUMN waitinglist.created_at IS 'Erstellungsdatum des Eintrags';
COMMENT ON COLUMN waitinglist.referral_count IS 'Anzahl der erfolgreichen Referrals';
COMMENT ON COLUMN waitinglist.followup_sent IS 'Flag für gesendete Follow-up E-Mails'; 