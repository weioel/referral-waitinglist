const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const app = express();
const PORT = process.env.PORT || 3003;
const BASE_URL = process.env.BASE_URL || (process.env.RAILWAY_STATIC_URL || `http://localhost:${PORT}`);

// Supabase Client initialisieren
const supabaseUrl = process.env.SUPABASE_URL || 'https://oqwqgvupmmgtgmkkovyq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3FndnVwbW1ndGdta2tvdnlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzI2MzUxNiwiZXhwIjoyMDY4ODM5NTE2fQ.PCp8NjZ3VXzykSSU2a3arNG8w9L79VSPnTbXr88v7H0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Brevo API Konfiguration
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY || 'xkeysib-2ba7b6c5c8b1e2e8f5a9b4c3d6e7f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7-Vz9wX8yA7bC6dE5fG4hI3jK2lM1nO0pQ9rS8tU7vW6xY5zA4bC3dE2fG1hI0jK9';

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('waitinglist')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) throw error;
    
  res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      port: PORT,
      env: process.env.NODE_ENV || 'development',
      database: 'Supabase',
      users: data || 0
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
    timestamp: new Date().toISOString(),
    port: PORT,
      env: process.env.NODE_ENV || 'development',
      database: 'Supabase'
  });
  }
});

// Datenbank initialisieren
async function initializeDatabase() {
  try {
    console.log('🔄 Prüfe Supabase Datenbank...');
    
    // Prüfe ob Tabelle existiert und hole Anzahl der Benutzer
    const { data, error } = await supabase
      .from('waitinglist')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Fehler beim Prüfen der Tabelle:', error);
      throw error;
    }
    
    console.log(`✅ Supabase verbunden - ${data || 0} Benutzer in der Warteliste`);
  } catch (error) {
    console.error('❌ Fehler bei der Datenbankinitialisierung:', error);
  }
}

/**
 * E-Mail-Funktionen
 */
async function sendWelcomeEmail(email, referralCode) {
  const referralLink = `${BASE_URL}/?ref=${referralCode}`;
  
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = "Willkommen bei CultShare! 🎉";
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Willkommen bei CultShare! 🎉</h1>
        <p>Hallo!</p>
      <p>Du bist jetzt auf der Warteliste für CultShare - die neue Art, Kultur zu teilen!</p>
      <p><strong>Dein persönlicher Referral-Link:</strong></p>
      <p><a href="${referralLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${referralLink}</a></p>
      <p>🚀 <strong>Teile diesen Link und springe in der Warteliste nach vorn!</strong></p>
      <p>Je mehr Leute du einlädst, desto früher bekommst du Zugang.</p>
      <p>Bis bald!<br>Das CultShare Team</p>
      </div>
    `;
  sendSmtpEmail.sender = { "name": "CultShare", "email": process.env.BREVO_SENDER_EMAIL || "noreply@cultshare.app" };
  sendSmtpEmail.to = [{ "email": email }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Willkommens-E-Mail gesendet an:', email);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Senden der Willkommens-E-Mail:', error);
    console.error('🔍 Fehler-Details:', error.message);
    console.error('📧 Empfänger:', email);
    console.error('🔑 API-Key vorhanden:', !!process.env.BREVO_API_KEY);
    console.error('📮 Sender E-Mail:', process.env.BREVO_SENDER_EMAIL);
    return false;
  }
}

async function sendWelcomeEmailWithPosition(email, referralCode, position, potentialJump) {
  const referralLink = `${BASE_URL}/?ref=${referralCode}`;
  
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = `Du bist auf Platz ${position + 1} bei CultShare! 🎉`;
    sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Willkommen bei CultShare! 🎉</h1>
      <p>Hallo!</p>
      <p>Du bist jetzt auf der Warteliste für CultShare!</p>
      <p><strong>🏆 Dein aktueller Platz: ${position + 1}</strong></p>
      ${potentialJump > 0 ? `<p>💡 Du könntest ${potentialJump} Plätze nach vorn springen, wenn du Freunde einlädst!</p>` : ''}
      <p><strong>Dein persönlicher Referral-Link:</strong></p>
      <p><a href="${referralLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${referralLink}</a></p>
      <p>🚀 <strong>Teile diesen Link und springe in der Warteliste nach vorn!</strong></p>
      <p>Je mehr Leute du einlädst, desto früher bekommst du Zugang.</p>
      <p>Bis bald!<br>Das CultShare Team</p>
        </div>
  `;
  sendSmtpEmail.sender = { "name": "CultShare", "email": process.env.BREVO_SENDER_EMAIL || "noreply@cultshare.app" };
  sendSmtpEmail.to = [{ "email": email }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Willkommens-E-Mail mit Position gesendet an:', email, 'Position:', position + 1);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Senden der Willkommens-E-Mail:', error);
    return false;
  }
}

async function sendPositionUpdateEmail(email, referralCode, position, jump) {
  const referralLink = `${BASE_URL}/?ref=${referralCode}`;
  
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = `🎉 Du bist auf Platz ${position + 1} gesprungen!`;
    sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Gratulation! 🎉</h1>
      <p>Hallo!</p>
      <p>Jemand hat deinen Referral-Link benutzt!</p>
      <p><strong>🏆 Dein neuer Platz: ${position + 1}</strong></p>
      <p>🚀 Du bist ${jump} Plätze nach vorn gesprungen!</p>
      <p><strong>Weiter so! Teile deinen Link:</strong></p>
      <p><a href="${referralLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${referralLink}</a></p>
      <p>Je mehr Leute du einlädst, desto früher bekommst du Zugang zu CultShare!</p>
      <p>Bis bald!<br>Das CultShare Team</p>
        </div>
  `;
  sendSmtpEmail.sender = { "name": "CultShare", "email": process.env.BREVO_SENDER_EMAIL || "noreply@cultshare.app" };
  sendSmtpEmail.to = [{ "email": email }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Position-Update-E-Mail gesendet an:', email, 'Neue Position:', position + 1);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Senden der Position-Update-E-Mail:', error);
    return false;
  }
}

async function sendFollowUpEmail(email, referralCode, position) {
  const referralLink = `${BASE_URL}/?ref=${referralCode}`;
  
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = `Dein CultShare Status - Platz ${position + 1}`;
    sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Dein CultShare Update 📊</h1>
      <p>Hallo!</p>
      <p>Hier ist dein aktueller Status auf der CultShare Warteliste:</p>
      <p><strong>🏆 Dein aktueller Platz: ${position + 1}</strong></p>
      <p>Möchtest du schneller Zugang bekommen? Teile deinen persönlichen Link:</p>
      <p><a href="${referralLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${referralLink}</a></p>
      <p>🚀 <strong>Pro Einladung springst du in der Warteliste nach vorn!</strong></p>
      <p>Bis bald!<br>Das CultShare Team</p>
        </div>
  `;
  sendSmtpEmail.sender = { "name": "CultShare", "email": process.env.BREVO_SENDER_EMAIL || "noreply@cultshare.app" };
  sendSmtpEmail.to = [{ "email": email }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Follow-up-E-Mail gesendet an:', email, 'Position:', position + 1);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Senden der Follow-up-E-Mail:', error);
    return false;
  }
}

/**
 * API-Endpunkt: Neue Anmeldung zur Warteliste
 */
app.post('/api/signup', async (req, res) => {
  const { email, referralCode } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'E-Mail ist erforderlich' });
  }

  const userReferralCode = uuidv4();
  
  try {
  // Prüfen ob E-Mail bereits existiert
    const { data: existingUser, error: fetchError } = await supabase
      .from('waitinglist')
      .select('*')
      .eq('email', email);

    if (fetchError) {
      console.error('Fehler beim Prüfen der E-Mail in Supabase:', fetchError);
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
    if (existingUser && existingUser.length > 0) {
      // Benutzer existiert bereits
      return res.json({
        success: true,
        message: 'Du bist bereits angemeldet!',
        user: {
          email: existingUser[0].email,
          referralCode: existingUser[0].referral_code,
        }
      });
    }
    
    // Neuen Benutzer erstellen
    const { data: newUser, error: insertError } = await supabase
      .from('waitinglist')
      .insert({
        email: email,
        referral_code: userReferralCode,
        referred_by: referralCode || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Fehler beim Einfügen des Benutzers in Supabase:', insertError);
        return res.status(500).json({ error: 'Fehler beim Erstellen des Eintrags' });
      }
      
      // Position für neue Anmeldung berechnen
    const positionData = await supabase
      .rpc('get_position_in_waitinglist', {
        user_referral_count: newUser.referral_count,
        user_created_at: newUser.created_at,
        user_id: newUser.id,
      });
    
    const jumpData = await supabase
      .rpc('get_potential_jump_in_waitinglist', {
        user_referral_count: newUser.referral_count,
        user_created_at: newUser.created_at,
        user_id: newUser.id,
      });
    
    const position = positionData.data?.peopleAhead || 0;
    const potentialJump = jumpData.data?.jump || 0;

    // Willkommens-E-Mail mit korrekter Position senden
    console.log('🚀 Versende Willkommens-E-Mail an:', email, 'Position:', position + 1, 'Nächster Sprung:', potentialJump);
    await sendWelcomeEmailWithPosition(email, userReferralCode, position, potentialJump);
    
      // Wenn ein Referral-Code verwendet wurde, den Referral-Zähler erhöhen
      if (referralCode) {
      const { data: referrer, error: referrerError } = await supabase
        .from('waitinglist')
        .select('*')
        .eq('referral_code', referralCode);

      if (referrerError) {
        console.error('Fehler beim Abrufen des Referrers in Supabase:', referrerError);
      } else if (referrer && referrer.length > 0) {
        const referrerUser = referrer[0];
        await supabase
          .from('waitinglist')
          .update({ referral_count: referrerUser.referral_count + 1 })
          .eq('referral_code', referralCode);

            // Positions-Update-E-Mail an den Referrer senden
        const { data: updatedReferrer, error: updatedReferrerError } = await supabase
          .from('waitinglist')
          .select('*')
          .eq('referral_code', referralCode);

        if (updatedReferrerError) {
          console.error('Fehler beim Abrufen des aktualisierten Referrers in Supabase:', updatedReferrerError);
        } else if (updatedReferrer && updatedReferrer.length > 0) {
          const updatedReferrerUser = updatedReferrer[0];
          
          const referrerPositionData = await supabase
            .rpc('get_position_in_waitinglist', {
              user_referral_count: updatedReferrerUser.referral_count,
              user_created_at: updatedReferrerUser.created_at,
              user_id: updatedReferrerUser.id,
            });
          
          const referrerJumpData = await supabase
            .rpc('get_next_jump_in_waitinglist', {
              user_referral_count: updatedReferrerUser.referral_count,
              user_created_at: updatedReferrerUser.created_at,
              user_id: updatedReferrerUser.id,
            });
          
          const referrerPosition = referrerPositionData.data?.peopleAhead || 0;
          const jump = referrerJumpData.data?.nextJump || 1;
          
          await sendPositionUpdateEmail(updatedReferrerUser.email, referralCode, referrerPosition, jump);
        }
      }
      }
      
      res.json({
        success: true,
        message: 'Erfolgreich zur Warteliste hinzugefügt!',
        user: {
          email: email,
          referralCode: userReferralCode,
        }
    });
    
  } catch (error) {
    console.error('Fehler bei der Anmeldung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Alias für Frontend Kompatibilität
app.post('/api/join', async (req, res) => {
  // Redirect to signup endpoint
  const { email, referralCode } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'E-Mail ist erforderlich' });
  }
  
  const userReferralCode = uuidv4();
  
  try {
    // Prüfen ob E-Mail bereits existiert
    const { data: existingUser, error: fetchError } = await supabase
      .from('waitinglist')
      .select('*')
      .eq('email', email);

    if (fetchError) {
      console.error('Fehler beim Prüfen der E-Mail in Supabase:', fetchError);
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
    if (existingUser && existingUser.length > 0) {
      // Benutzer existiert bereits
      return res.json({
        success: true,
        message: 'Du bist bereits angemeldet!',
        user: {
          email: existingUser[0].email,
          referralCode: existingUser[0].referral_code,
        }
      });
    }
    
    // Neuen Benutzer erstellen
    const { data: newUser, error: insertError } = await supabase
      .from('waitinglist')
      .insert({
        email: email,
        referral_code: userReferralCode,
        referred_by: referralCode || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Fehler beim Einfügen des Benutzers in Supabase:', insertError);
      return res.status(500).json({ error: 'Fehler beim Erstellen des Eintrags' });
    }
    
    // Position für neue Anmeldung berechnen
    const positionData = await supabase
      .rpc('get_position_in_waitinglist', {
        user_referral_count: newUser.referral_count,
        user_created_at: newUser.created_at,
        user_id: newUser.id,
      });
    
    const jumpData = await supabase
      .rpc('get_potential_jump_in_waitinglist', {
        user_referral_count: newUser.referral_count,
        user_created_at: newUser.created_at,
        user_id: newUser.id,
      });
    
    const position = positionData.data?.peopleAhead || 0;
    const potentialJump = jumpData.data?.jump || 0;

    // Willkommens-E-Mail mit korrekter Position senden
    console.log('🚀 Versende Willkommens-E-Mail an:', email, 'Position:', position + 1, 'Nächster Sprung:', potentialJump);
    await sendWelcomeEmailWithPosition(email, userReferralCode, position, potentialJump);
    
    // Wenn ein Referral-Code verwendet wurde, den Referral-Zähler erhöhen
    if (referralCode) {
      const { data: referrer, error: referrerError } = await supabase
        .from('waitinglist')
        .select('*')
        .eq('referral_code', referralCode);

      if (referrerError) {
        console.error('Fehler beim Abrufen des Referrers in Supabase:', referrerError);
      } else if (referrer && referrer.length > 0) {
        const referrerUser = referrer[0];
        await supabase
          .from('waitinglist')
          .update({ referral_count: referrerUser.referral_count + 1 })
          .eq('referral_code', referralCode);

        // Positions-Update-E-Mail an den Referrer senden
        const { data: updatedReferrer, error: updatedReferrerError } = await supabase
          .from('waitinglist')
          .select('*')
          .eq('referral_code', referralCode);

        if (updatedReferrerError) {
          console.error('Fehler beim Abrufen des aktualisierten Referrers in Supabase:', updatedReferrerError);
        } else if (updatedReferrer && updatedReferrer.length > 0) {
          const updatedReferrerUser = updatedReferrer[0];
          
          const referrerPositionData = await supabase
            .rpc('get_position_in_waitinglist', {
              user_referral_count: updatedReferrerUser.referral_count,
              user_created_at: updatedReferrerUser.created_at,
              user_id: updatedReferrerUser.id,
            });
          
          const referrerJumpData = await supabase
            .rpc('get_next_jump_in_waitinglist', {
              user_referral_count: updatedReferrerUser.referral_count,
              user_created_at: updatedReferrerUser.created_at,
              user_id: updatedReferrerUser.id,
            });
          
          const referrerPosition = referrerPositionData.data?.peopleAhead || 0;
          const jump = referrerJumpData.data?.nextJump || 1;
          
          await sendPositionUpdateEmail(updatedReferrerUser.email, referralCode, referrerPosition, jump);
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Erfolgreich zur Warteliste hinzugefügt!',
      user: {
        email: email,
        referralCode: userReferralCode,
      }
    });
    
  } catch (error) {
    console.error('Fehler bei der Anmeldung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

/**
 * API-Endpunkt: Benutzerinformationen abrufen
 */
app.get('/api/user/:referralCode', async (req, res) => {
  const { referralCode } = req.params;
  
  const { data: user, error: fetchError } = await supabase
    .from('waitinglist')
    .select('*')
    .eq('referral_code', referralCode)
    .single();

  if (fetchError) {
    console.error('Fehler beim Abrufen des Benutzers in Supabase:', fetchError);
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
  if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    
    // Position und potenziellen Sprung berechnen
  const positionData = await supabase
    .rpc('get_position_in_waitinglist', {
      user_referral_count: user.referral_count,
      user_created_at: user.created_at,
      user_id: user.id,
    });
  
  const jumpData = await supabase
    .rpc('get_potential_jump_in_waitinglist', {
      user_referral_count: user.referral_count,
      user_created_at: user.created_at,
      user_id: user.id,
    });
  
  const position = positionData.data?.peopleAhead || 0;
  const potentialJump = jumpData.data?.jump || 0;

        res.json({
          success: true,
          user: {
      email: user.email,
      referralCode: user.referral_code,
      referralCount: user.referral_count,
            position: position,
      potentialJump: potentialJump
          }
  });
});

/**
 * API-Endpunkt: Benutzer anhand des Referral-Codes löschen
 */
app.delete('/api/user/:referralCode', async (req, res) => {
  const { referralCode } = req.params;
  const { error } = await supabase
    .from('waitinglist')
    .delete()
    .eq('referral_code', referralCode);

    if (error) {
    console.error('Fehler beim Löschen des Benutzers in Supabase:', error);
    if (error.code === 'PGRST116') { // Supabase gibt PGRST116 zurück, wenn kein Datensatz gefunden wurde
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    return res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
  }
    console.log('Benutzer gelöscht mit referralCode:', referralCode);
    res.json({ success: true, message: 'Benutzer erfolgreich gelöscht' });
});

/**
 * Follow-up E-Mail Timer (nur in Produktion)
 */
async function checkFollowUpEmails() {
  console.log('🔍 Prüfe auf Follow-up E-Mails...');
  
  const { data: rows, error: fetchError } = await supabase
    .from('waitinglist')
    .select('email, referral_code, created_at')
    .eq('followup_sent', 0)
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (fetchError) {
    console.error('Fehler beim Prüfen der Follow-up E-Mails in Supabase:', fetchError);
    return;
  }
  
  console.log(`📧 ${rows.length} Follow-up E-Mails zu versenden`);
  
  for (const row of rows) {
    try {
      // Position berechnen
      const { data: user } = await supabase
        .from('waitinglist')
        .select('*')
        .eq('email', row.email)
        .single();
      
      if (user) {
        const positionData = await supabase
          .rpc('get_position_in_waitinglist', {
            user_referral_count: user.referral_count,
            user_created_at: user.created_at,
            user_id: user.id,
          });
        
        const position = positionData.data?.peopleAhead || 0;
        
        // Follow-up E-Mail senden
        const success = await sendFollowUpEmail(row.email, row.referral_code, position);
        
        if (success) {
          // Als versendet markieren
          await supabase
            .from('waitinglist')
            .update({ followup_sent: 1 })
            .eq('email', row.email);
        }
      }
      
      // Kurze Pause zwischen E-Mails
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Fehler beim Senden der Follow-up E-Mail:', error);
    }
  }
}

// Server starten
app.listen(PORT, async () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
  console.log(`🔗 Referral-Links Format: ${BASE_URL}/?ref=[referral-code]`);
  
  // Initialisiere Supabase Datenbank
  await initializeDatabase();
  
  // Starte Follow-up Timer nur in Produktion
  if (process.env.NODE_ENV === 'production') {
    console.log('🕐 Follow-up E-Mail Timer gestartet (alle 6 Stunden)');
    setInterval(checkFollowUpEmails, 6 * 60 * 60 * 1000); // Alle 6 Stunden
  }
});

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('Supabase Verbindung geschlossen.');
    process.exit(0);
}); 