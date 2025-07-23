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
apiKey.apiKey = process.env.BREVO_API_KEY || 'DEVELOPMENT_MODE_NO_EMAILS';

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('waitinglist')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Health check error:', error);
      throw error;
    }
    
  res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      port: PORT,
      env: process.env.NODE_ENV || 'development',
      database: 'Supabase',
      users: count || 0
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message || 'Database connection failed',
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
    const { count, error } = await supabase
      .from('waitinglist')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Fehler beim Prüfen der Tabelle:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      // Nicht werfen, damit Server trotzdem startet
      console.log('⚠️ Server startet trotzdem...');
      return;
    }
    
    console.log(`✅ Supabase verbunden - ${count || 0} Benutzer in der Warteliste`);
  } catch (error) {
    console.error('❌ Fehler bei der Datenbankinitialisierung:', error);
    console.log('⚠️ Server startet trotzdem...');
  }
}

/**
 * E-Mail-Funktionen
 */
async function sendWelcomeEmail(email, referralCode) {
  // E-Mails werden immer versendet (auch im Development-Modus)
  if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'DEVELOPMENT_MODE_NO_EMAILS') {
    console.log(`❌ Kein Brevo API-Key gesetzt! Setze BREVO_API_KEY Environment Variable.`);
    return false;
  }
  
  const referralLink = `${BASE_URL}/?ref=${referralCode}`;
  
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = "Willkommen zur Warteliste! 🎉";
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="only light">
      <title>Willkommen zur Warteliste</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFF !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000000 !important;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff !important; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border-radius: 12px; color: #000000 !important;">
        
        <!-- Header -->
        <div style="background: #FF90BF !important; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
            Willkommen zur Warteliste! 🎉
          </h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
            Du bist jetzt Teil unserer exklusiven Community
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          
          <!-- Referral Link Card -->
          <div style="background-color: #ffffff !important; border: 2px solid #F0F0F0 !important; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #FF90BF !important; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
              📎 Dein persönlicher Referral-Link
            </h3>
            <div style="background-color: #F8FAFF !important; border: 1px solid #E0E0E0 !important; border-radius: 8px; padding: 15px; font-family: 'Courier New', monospace; font-size: 14px; color: #333333 !important; word-break: break-all;">
              ${referralLink}
            </div>
            <p style="color: #666666; font-size: 14px; margin: 15px 0 0 0;">
              Teile diesen Link mit Freunden und steige in der Warteliste auf!
            </p>
          </div>
          
          <!-- How it works -->
          <div style="background-color: #ffffff !important; border: 2px solid #F0F0F0 !important; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #FF90BF !important; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
              💡 So funktioniert es
            </h3>
            <div style="display: flex; flex-direction: column; gap: 15px;">
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">1</div>
                <span style="color: #333333; line-height: 1.4;">Teile deinen Referral-Link mit Freunden</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">2</div>
                <span style="color: #333333; line-height: 1.4;">Für jede Anmeldung über deinen Link steigst du auf</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">3</div>
                <span style="color: #333333; line-height: 1.4;">Je mehr Empfehlungen, desto höher deine Position!</span>
              </div>
            </div>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${referralLink}" style="display: inline-block; background: #FF90BF; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(255, 144, 191, 0.25);">
              🚀 Jetzt Link teilen
            </a>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="background-color: #F8FAFF !important; padding: 30px; text-align: center; border-top: 1px solid rgba(0, 0, 0, 0.1) !important; border-radius: 0 0 12px 12px;">
          <p style="color: #666666 !important; margin: 0; font-size: 14px;">
            Viel Erfolg! Wir freuen uns darauf, dich bald zu sehen. 🚀
          </p>
          <p style="color: #999999; margin: 10px 0 0 0; font-size: 12px;">
            Du erhältst diese E-Mail, weil du dich zur Warteliste angemeldet hast.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
  sendSmtpEmail.sender = { "name": "CultShare", "email": process.env.BREVO_SENDER_EMAIL || "team@cultshare.app" };
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
  // E-Mails werden immer versendet (auch im Development-Modus)
  if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'DEVELOPMENT_MODE_NO_EMAILS') {
    console.log(`❌ Kein Brevo API-Key gesetzt! Setze BREVO_API_KEY Environment Variable.`);
    return false;
  }
  
  const referralLink = `${BASE_URL}/?ref=${referralCode}`;
  
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = "Willkommen zur Warteliste! 🎉";
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="only light">
      <title>Willkommen zur Warteliste</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFF !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000000 !important;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff !important; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border-radius: 12px; color: #000000 !important;">
        
        <!-- Header -->
        <div style="background: #FF90BF !important; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
            Willkommen zur Warteliste! 🎉
          </h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
            Du bist jetzt Teil unserer exklusiven Community
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          
          <!-- Position Card -->
          <div style="background: #ffffff !important; border: 2px solid #FF90BF !important; border-radius: 12px; padding: 30px; margin-bottom: 30px; text-align: center; color: #FF90BF !important;">
            <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 10px;">
              Deine aktuelle Position
            </div>
            <div style="font-size: 48px; font-weight: 700; margin-bottom: 10px;">
              #${position + 1}
            </div>
            <div style="font-size: 16px; opacity: 0.9;">
              ${position} Personen vor dir in der Warteliste
            </div>
          </div>
          
          <!-- Referral Link Card -->
          <div style="background-color: #ffffff !important; border: 2px solid #F0F0F0 !important; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #FF90BF !important; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
              📎 Dein persönlicher Referral-Link
            </h3>
            <div style="background-color: #F8FAFF !important; border: 1px solid #E0E0E0 !important; border-radius: 8px; padding: 15px; font-family: 'Courier New', monospace; font-size: 14px; color: #333333 !important; word-break: break-all;">
              ${referralLink}
            </div>
            <p style="color: #666666; font-size: 14px; margin: 15px 0 0 0;">
              Teile diesen Link mit Freunden und steige weiter auf!
            </p>
          </div>
          
          <!-- Next Jump Card -->
          <div style="background: #FF90BF !important; border-radius: 12px; padding: 25px; margin-bottom: 30px; color: #ffffff !important;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
              🚀 Mit der nächsten Anmeldung über deinen Link
            </h3>
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">
              +${potentialJump} ${potentialJump === 1 ? 'Platz' : 'Plätze'}
            </div>
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">
              Jede weitere Anmeldung über deinen Link bringt dich weiter nach vorne
            </p>
          </div>
          
          <!-- How it works -->
          <div style="background-color: #ffffff !important; border: 2px solid #F0F0F0 !important; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #FF90BF !important; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
              💡 So funktioniert es
            </h3>
            <div style="display: flex; flex-direction: column; gap: 15px;">
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">1</div>
                <span style="color: #333333; line-height: 1.4;">Teile deinen Referral-Link mit Freunden</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">2</div>
                <span style="color: #333333; line-height: 1.4;">Für jede Anmeldung über deinen Link steigst du weiter auf</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">3</div>
                <span style="color: #333333; line-height: 1.4;">Je mehr Empfehlungen, desto höher deine Position!</span>
              </div>
            </div>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${referralLink}" style="display: inline-block; background: #FF90BF; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(255, 144, 191, 0.25);">
              🚀 Weiter teilen
            </a>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="background-color: #F8FAFF !important; padding: 30px; text-align: center; border-top: 1px solid rgba(0, 0, 0, 0.1) !important; border-radius: 0 0 12px 12px;">
          <p style="color: #666666 !important; margin: 0; font-size: 14px;">
            Weiter so! Du machst das großartig. 🚀
          </p>
          <p style="color: #999999; margin: 10px 0 0 0; font-size: 12px;">
            Du erhältst diese E-Mail, weil du dich zur Warteliste angemeldet hast.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
  sendSmtpEmail.sender = { "name": "CultShare", "email": process.env.BREVO_SENDER_EMAIL || "team@cultshare.app" };
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
  sendSmtpEmail.subject = "Du bist in der Warteliste aufgestiegen! ⬆️";
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="only light">
      <title>Aufstieg in der Warteliste</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFF !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000000 !important;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff !important; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border-radius: 12px; color: #000000 !important;">
        
        <!-- Header -->
        <div style="background: #FF90BF !important; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
            Gratulation! 🎉
          </h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
            Du bist in der Warteliste aufgestiegen!
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          
          <!-- Position Card -->
          <div style="background: #ffffff !important; border: 2px solid #FF90BF !important; border-radius: 12px; padding: 30px; margin-bottom: 30px; text-align: center; color: #FF90BF !important;">
            <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 10px;">
              Deine neue Position
            </div>
            <div style="font-size: 48px; font-weight: 700; margin-bottom: 10px;">
              #${position + 1}
            </div>
            <div style="font-size: 16px; opacity: 0.9;">
              ${position} Personen vor dir in der Warteliste
            </div>
          </div>
          
          <!-- Referral Link Card -->
          <div style="background-color: #ffffff !important; border: 2px solid #F0F0F0 !important; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #FF90BF !important; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
              📎 Dein persönlicher Referral-Link
            </h3>
            <div style="background-color: #F8FAFF !important; border: 1px solid #E0E0E0 !important; border-radius: 8px; padding: 15px; font-family: 'Courier New', monospace; font-size: 14px; color: #333333 !important; word-break: break-all;">
              ${referralLink}
            </div>
            <p style="color: #666666; font-size: 14px; margin: 15px 0 0 0;">
              Teile diesen Link mit Freunden und steige weiter auf!
            </p>
          </div>
          
          <!-- Next Jump Card -->
          <div style="background: #FF90BF !important; border-radius: 12px; padding: 25px; margin-bottom: 30px; color: #ffffff !important;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
              🚀 Mit der nächsten Anmeldung über deinen Link
            </h3>
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">
              +${jump} ${jump === 1 ? 'Platz' : 'Plätze'}
            </div>
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">
              Jede weitere Anmeldung über deinen Link bringt dich weiter nach vorne
            </p>
          </div>
          
          <!-- How it works -->
          <div style="background-color: #ffffff !important; border: 2px solid #F0F0F0 !important; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #FF90BF !important; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
              💡 So funktioniert es
            </h3>
            <div style="display: flex; flex-direction: column; gap: 15px;">
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">1</div>
                <span style="color: #333333; line-height: 1.4;">Teile deinen Referral-Link mit Freunden</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">2</div>
                <span style="color: #333333; line-height: 1.4;">Für jede Anmeldung über deinen Link steigst du weiter auf</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">3</div>
                <span style="color: #333333; line-height: 1.4;">Je mehr Empfehlungen, desto höher deine Position!</span>
              </div>
            </div>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${referralLink}" style="display: inline-block; background: #FF90BF; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(255, 144, 191, 0.25);">
              🚀 Weiter teilen
            </a>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="background-color: #F8FAFF !important; padding: 30px; text-align: center; border-top: 1px solid rgba(0, 0, 0, 0.1) !important; border-radius: 0 0 12px 12px;">
          <p style="color: #666666 !important; margin: 0; font-size: 14px;">
            Weiter so! Du machst das großartig. 🚀
          </p>
          <p style="color: #999999; margin: 10px 0 0 0; font-size: 12px;">
            Du erhältst diese E-Mail, weil du dich zur Warteliste angemeldet hast.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
  sendSmtpEmail.sender = { "name": "CultShare", "email": process.env.BREVO_SENDER_EMAIL || "team@cultshare.app" };
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
  sendSmtpEmail.subject = "Sicher dir die ersten Tickets - Update";
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="only light">
      <title>Deine Position in der Warteliste</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFF !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000000 !important;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff !important; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border-radius: 12px; color: #000000 !important;">
        
        <!-- Header -->
        <div style="background: #FF90BF !important; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
            Sicher dir die ersten Tickets
          </h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
            Hier ist dein aktueller Status
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          
          <!-- Urgency Card -->
          <div style="background: #FF90BF !important; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center; color: #ffffff !important;">
            <h2 style="margin: 0 0 15px 0; font-size: 22px; font-weight: 600;">
              Exklusive Tickets verfügbar
            </h2>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">
              Die ersten 100 Plätze erhalten bevorzugten Zugang
            </p>
          </div>
          
          <!-- Position Card -->
          <div style="background: #ffffff !important; border: 2px solid #FF90BF !important; border-radius: 12px; padding: 30px; margin-bottom: 30px; text-align: center; color: #FF90BF !important;">
            <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 10px;">
              Deine aktuelle Position
            </div>
            <div style="font-size: 48px; font-weight: 700; margin-bottom: 10px;">
              #${position + 1}
            </div>
            <div style="font-size: 16px; opacity: 0.9;">
              ${position} Personen vor dir in der Warteliste
            </div>
          </div>
          
          <!-- Urgency Message -->
          <div style="background-color: #FFF3CD !important; border: 2px solid #FFEAA7 !important; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #856404 !important; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
              💡 Tipp für bessere Position
            </h3>
            <p style="color: #856404 !important; margin: 0; font-size: 16px; line-height: 1.5;">
              <strong>Du stehst aktuell auf Position #${position + 1}.</strong> Tipp: Teile deinen Link mit deinen Freunden um in die Top 100 aufzusteigen
            </p>
          </div>
          
          <!-- Referral Link Card -->
          <div style="background-color: #ffffff !important; border: 2px solid #F0F0F0 !important; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #FF90BF !important; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
              🔗 Dein persönlicher Referral-Link
            </h3>
            <div style="background-color: #F8FAFF !important; border: 1px solid #E0E0E0 !important; border-radius: 8px; padding: 15px; font-family: 'Courier New', monospace; font-size: 14px; color: #333333 !important; word-break: break-all;">
              ${referralLink}
            </div>
            <p style="color: #666666; font-size: 14px; margin: 15px 0 0 0;">
              Teile diesen Link mit Freunden und verbessere deine Position
            </p>
          </div>
          
          <!-- How it works -->
          <div style="background-color: #ffffff !important; border: 2px solid #F0F0F0 !important; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #FF90BF !important; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
              💡 So funktioniert es
            </h3>
            <div style="display: flex; flex-direction: column; gap: 15px;">
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">1</div>
                <span style="color: #333333; line-height: 1.4;">Teile deinen Referral-Link mit Freunden</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">2</div>
                <span style="color: #333333; line-height: 1.4;">Für jede Anmeldung über deinen Link steigst du auf</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #FF90BF; color: #ffffff; min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">3</div>
                <span style="color: #333333; line-height: 1.4;">Je mehr Empfehlungen, desto höher deine Position!</span>
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="background-color: #F8FAFF !important; padding: 30px; text-align: center; border-top: 1px solid rgba(0, 0, 0, 0.1) !important; border-radius: 0 0 12px 12px;">
          <p style="color: #666666 !important; margin: 0; font-size: 14px;">
            Vielen Dank für dein Interesse an unserer Warteliste!
          </p>
          <p style="color: #999999; margin: 10px 0 0 0; font-size: 12px;">
            Du erhältst diese E-Mail, weil du dich zur Warteliste angemeldet hast.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
  sendSmtpEmail.sender = { "name": "CultShare", "email": process.env.BREVO_SENDER_EMAIL || "team@cultshare.app" };
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

// Initialisiere Datenbank beim Start
initializeDatabase().then(() => {
  console.log('🚀 Datenbank initialisiert');
}).catch(err => {
  console.error('❌ Fehler bei der Datenbankinitialisierung:', err);
});

// Lokaler Server für Development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
    console.log(`🔗 Referral-Links Format: ${BASE_URL}/?ref=[referral-code]`);
    
    // Starte Follow-up Timer nur in lokaler Entwicklung
    if (process.env.NODE_ENV === 'production') {
      console.log('🕐 Follow-up E-Mail Timer gestartet (alle 6 Stunden)');
      setInterval(checkFollowUpEmails, 6 * 60 * 60 * 1000); // Alle 6 Stunden
    }
  });
}

// Export für Vercel Serverless Functions
module.exports = app;