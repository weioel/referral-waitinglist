const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Brevo SDK importieren
const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY || 'dummy-key-for-railway';
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const app = express();
const PORT = process.env.PORT || 3003;
const BASE_URL = process.env.BASE_URL || (process.env.RAILWAY_STATIC_URL || `http://localhost:${PORT}`);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Health check endpoint für Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

// Datenbank initialisieren
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('❌ Fehler beim Verbinden zur Datenbank:', err.message);
  } else {
    console.log('✅ Erfolgreich mit SQLite Datenbank verbunden.');
    initializeDatabase();
  }
});

/**
 * Initialisiert die Datenbanktabellen
 */
function initializeDatabase() {
  // Tabelle für Wartelisten-Einträge - NUR erstellen wenn sie nicht existiert
  db.run(`CREATE TABLE IF NOT EXISTS waitinglist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    referral_count INTEGER DEFAULT 0,
    followup_sent INTEGER DEFAULT 0
  )`, (err) => {
    if (err) {
      console.error('Fehler beim Erstellen der waitinglist Tabelle:', err.message);
    } else {
      // Prüfe ob die Tabelle bereits Daten hat
      db.get('SELECT COUNT(*) as count FROM waitinglist', (err, row) => {
        if (err) {
          console.error('Fehler beim Prüfen der Tabelle:', err.message);
        } else if (row.count > 0) {
          console.log(`✅ Warteliste-Tabelle bereits vorhanden mit ${row.count} Benutzern`);
        } else {
          console.log('waitinglist Tabelle erfolgreich erstellt oder bereits vorhanden.');
        }
      });
    }
  });
}

/**
 * E-Mail-Funktionen
 */
async function sendWelcomeEmail(email, referralCode) {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = "Willkommen zur Warteliste! 🎉";
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF90BF;">Willkommen zur Warteliste!</h2>
        <p>Hallo!</p>
        <p>Vielen Dank für deine Anmeldung zur Warteliste. Hier sind deine Details:</p>
        
        <div style="background: #F8FAFF; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #FF90BF; margin-top: 0;">Dein Referral-Link:</h3>
          <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
            ${BASE_URL}/?ref=${referralCode}
          </p>
        </div>
        
        <p><strong>So funktioniert es:</strong></p>
        <ul>
          <li>Teile deinen Referral-Link mit Freunden</li>
          <li>Für jede Person, die sich über deinen Link anmeldet, steigst du in der Warteliste auf</li>
          <li>Je mehr Empfehlungen, desto höher deine Position!</li>
        </ul>
        
        <p>Viel Erfolg! 🚀</p>
      </div>
    `;
    
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || "Warteliste",
      email: process.env.BREVO_SENDER_EMAIL || "noreply@example.com"
    };
    
    sendSmtpEmail.to = [{ email: email }];
    
    // Prüfe ob API-Key vorhanden ist
    if (!process.env.BREVO_API_KEY) {
      console.log('⚠️ Kein API-Key gesetzt - E-Mail wird nicht gesendet an:', email);
      return false;
    }
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Willkommens-E-Mail gesendet an:', email);
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

async function sendWelcomeEmailWithPosition(email, referralCode, position, nextJump) {
  try {
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
                ${BASE_URL}/?ref=${referralCode}
              </div>
              <p style="color: #666666; font-size: 14px; margin: 15px 0 0 0;">
                Teile diesen Link mit Freunden und steige in der Warteliste auf!
              </p>
            </div>
            
            <!-- Next Jump Card -->
            <div style="background: #FF90BF !important; border-radius: 12px; padding: 25px; margin-bottom: 30px; color: #ffffff !important;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                🚀 Mit der nächsten Anmeldung über deinen Link
              </h3>
              <div style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">
                +${nextJump} ${nextJump === 1 ? 'Platz' : 'Plätze'}
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
              <a href="${BASE_URL}/?ref=${referralCode}" style="display: inline-block; background: #FF90BF; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(255, 144, 191, 0.25);">
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
    
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || "Warteliste",
      email: process.env.BREVO_SENDER_EMAIL || "noreply@example.com"
    };
    
    sendSmtpEmail.to = [{ email: email }];
    
    // Prüfe ob API-Key vorhanden ist
    if (!process.env.BREVO_API_KEY) {
      console.log('⚠️ Kein API-Key gesetzt - E-Mail wird nicht gesendet an:', email);
      return false;
    }
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Willkommens-E-Mail mit Position gesendet an:', email, 'Position:', position);
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

async function sendPositionUpdateEmail(email, referralCode, position, jump) {
  try {
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
                ${BASE_URL}/?ref=${referralCode}
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
              <a href="${BASE_URL}/?ref=${referralCode}" style="display: inline-block; background: #FF90BF; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(255, 144, 191, 0.25);">
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
    
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || "Warteliste",
      email: process.env.BREVO_SENDER_EMAIL
    };
    
    sendSmtpEmail.to = [{ email: email }];
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Positions-Update-E-Mail gesendet an:', email, 'Neue Position:', position, 'Sprung:', jump);
    return true;
  } catch (error) {
    console.error('Fehler beim Senden der Positions-Update-E-Mail:', error);
    return false;
  }
}

async function sendFollowUpEmail(email, referralCode, position) {
  try {
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
                ${BASE_URL}/?ref=${referralCode}
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
    
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || "Warteliste",
      email: process.env.BREVO_SENDER_EMAIL
    };
    
    sendSmtpEmail.to = [{ email: email }];
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Follow-up E-Mail gesendet an:', email, 'Position:', position);
    return true;
  } catch (error) {
    console.error('Fehler beim Senden der Follow-up E-Mail:', error);
    return false;
  }
}

/**
 * API-Endpunkt: Neue Anmeldung zur Warteliste (erweitert)
 */
app.post('/api/join', async (req, res) => {
  const { email, referralCode } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Gültige E-Mail-Adresse erforderlich' });
  }

  const userReferralCode = uuidv4();
  
  // Prüfen ob E-Mail bereits existiert
  db.get('SELECT * FROM waitinglist WHERE email = ?', [email], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
    if (row) {
      // Benutzer existiert bereits
      return res.json({
        success: true,
        message: 'Du bist bereits angemeldet!',
        user: {
          email: row.email,
          referralCode: row.referral_code,
        }
      });
    }
    
    // Neuen Benutzer erstellen
    const stmt = db.prepare(`
      INSERT INTO waitinglist (email, referral_code, referred_by) 
      VALUES (?, ?, ?)
    `);
    
    stmt.run([email, userReferralCode, referralCode || null], async function(err) {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Erstellen des Eintrags' });
      }
      
      // Position für neue Anmeldung berechnen
      const newUser = { referral_code: userReferralCode, referral_count: 0, created_at: new Date().toISOString(), id: this.lastID };
      calculatePosition(newUser, (position) => {
        calculatePotentialJump(newUser, (potentialJump) => {
          // Willkommens-E-Mail mit korrekter Position senden
          console.log('🚀 Versende Willkommens-E-Mail an:', email, 'Position:', position, 'Nächster Sprung:', potentialJump);
          sendWelcomeEmailWithPosition(email, userReferralCode, position, potentialJump);
        });
      });
      
      // Wenn ein Referral-Code verwendet wurde, den Referral-Zähler erhöhen
      if (referralCode) {
        db.run('UPDATE waitinglist SET referral_count = referral_count + 1 WHERE referral_code = ?', 
          [referralCode], async (err) => {
          if (err) {
            console.error('Fehler beim Aktualisieren des Referral-Zählers:', err);
          } else {
            // Positions-Update-E-Mail an den Referrer senden
            db.get('SELECT * FROM waitinglist WHERE referral_code = ?', [referralCode], async (err, referrer) => {
              if (!err && referrer) {
                calculatePosition(referrer, (position) => {
                  calculatePotentialJump(referrer, (jump) => {
                    sendPositionUpdateEmail(referrer.email, referralCode, position, jump);
                  });
                });
              }
            });
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Erfolgreich zur Warteliste hinzugefügt!',
        user: {
          email: email,
          referralCode: userReferralCode,
        }
      });
    });
    
    stmt.finalize();
  });
});

/**
 * API-Endpunkt: Benutzerinformationen abrufen
 */
app.get('/api/user/:referralCode', (req, res) => {
  const { referralCode } = req.params;
  
  db.get('SELECT * FROM waitinglist WHERE referral_code = ?', [referralCode], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Datenbankfehler' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    
    // Position und potenziellen Sprung berechnen
    calculatePosition(row, (position) => {
      calculatePotentialJump(row, (jump) => {
        res.json({
          success: true,
          user: {
            email: row.email,
            referralCode: row.referral_code,
            referralCount: row.referral_count,
            position: position,
            potentialJump: jump
          }
        });
      });
    });
  });
});

/**
 * API-Endpunkt: Benutzer anhand des Referral-Codes löschen
 */
app.delete('/api/user/:referralCode', (req, res) => {
  const { referralCode } = req.params;
  db.run('DELETE FROM waitinglist WHERE referral_code = ?', [referralCode], function(err) {
    if (err) {
      console.error('Fehler beim Löschen des Benutzers:', err);
      return res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    console.log('Benutzer gelöscht mit referralCode:', referralCode);
    res.json({ success: true, message: 'Benutzer erfolgreich gelöscht' });
  });
});

/**
 * Hilfsfunktion: Anzahl der Personen vor einem Benutzer in der Warteliste berechnen
 * Sortierung: Erst nach Referral-Count (höher = besser), dann nach Anmeldedatum (früher = besser)
 */
function calculatePosition(user, callback) {
  const query = `
    SELECT COUNT(*) as peopleAhead
    FROM waitinglist 
    WHERE (referral_count > ?)
    OR (referral_count = ? AND created_at < ?)
    OR (referral_count = ? AND created_at = ? AND id < ?)
  `;
  
  db.get(query, [user.referral_count, user.referral_count, user.created_at, user.referral_count, user.created_at, user.id], (err, row) => {
    if (err) {
      console.error('Fehler bei der Positionsberechnung:', err);
      callback(null);
    } else {
      callback(row.peopleAhead);
    }
  });
}

/**
 * Hilfsfunktion: Berechnet den potenziellen Sprung in der Rangliste.
 * Zählt, wie viele Personen mit derselben Referral-Anzahl vor einem in der Liste sind.
 */
function calculatePotentialJump(user, callback) {
  const query = `
    SELECT COUNT(*) as jump
    FROM waitinglist
    WHERE referral_count = ? AND (created_at < ? OR (created_at = ? AND id < ?))
  `;
  
  db.get(query, [user.referral_count, user.created_at, user.created_at, user.id], (err, row) => {
    if (err) {
      console.error('Fehler bei der Berechnung des potenziellen Sprungs:', err);
      callback(null);
    } else {
      callback(row.jump);
    }
  });
}

/**
 * Hilfsfunktion: Berechnet wie viele Plätze man mit der nächsten Anmeldung überspringt
 */
function calculateNextJump(user, callback) {
  // Zähle Personen mit gleicher oder niedrigerer Referral-Anzahl, die vor einem in der Liste sind
  const query = `
    SELECT COUNT(*) as nextJump
    FROM waitinglist
    WHERE (referral_count < ?) 
    OR (referral_count = ? AND (created_at < ? OR (created_at = ? AND id < ?)))
  `;
  
  db.get(query, [user.referral_count, user.referral_count, user.created_at, user.created_at, user.id], (err, row) => {
    if (err) {
      console.error('Fehler bei der Berechnung des nächsten Sprungs:', err);
      callback(1); // Fallback: mindestens 1 Platz
    } else {
      // Mindestens 1 Platz, aber maximal die Anzahl der Personen vor einem
      const jump = Math.max(1, Math.min(row.nextJump, 10)); // Maximal 10 Plätze anzeigen
      callback(jump);
    }
  });
}

/**
 * Test-Endpunkt: Follow-up E-Mail direkt senden
 */
app.post('/api/test-followup', async (req, res) => {
  const testEmail = 'weissmueller.leo@gmail.com';
  const testReferralCode = 'test-followup-123';
  const testPosition = 150; // Beispielposition
  
  try {
    console.log('🧪 Sende Test Follow-up E-Mail an:', testEmail);
    const success = await sendFollowUpEmail(testEmail, testReferralCode, testPosition);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Test Follow-up E-Mail erfolgreich gesendet',
        email: testEmail,
        position: testPosition
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Senden der Test E-Mail' 
      });
    }
  } catch (error) {
    console.error('Fehler beim Test Follow-up:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Senden der Test E-Mail',
      error: error.message 
    });
  }
});

/**
 * Route für alle übrigen Anfragen, um die index.html auszuliefern
 * Das ermöglicht client-seitiges Routing.
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
  console.log(`🔗 Referral-Links Format: http://localhost:${PORT}/?ref=[referral-code]`);
  
  // Follow-up Timer deaktiviert für Stabilität
  // startFollowUpTimer();
});

// Follow-up Timer Funktionen entfernt für Stabilität

// Graceful Shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Fehler beim Schließen der Datenbank:', err.message);
    } else {
      console.log('Datenbankverbindung geschlossen.');
    }
    process.exit(0);
  });
}); 