/**
 * Referral Wartelisten-System Frontend
 * Minimalistisches Design
 */

class ReferralApp {
    constructor() {
        this.currentUser = null;
        this.apiBaseUrl = ''; // Kann für die Produktion konfiguriert werden

        // DOM-Elemente
        this.elements = {
            signupView: document.getElementById('signup-view'),
            statusView: document.getElementById('status-view'),
            signupForm: document.getElementById('signup-form'),
            emailInput: document.getElementById('email'),
            userPosition: document.getElementById('user-position'),
            userEmailInfo: document.getElementById('user-email-info'),
            notYouLink: document.getElementById('not-you-link'),
            referralLinkInput: document.getElementById('referral-link'),
            socialShare: document.getElementById('social-share'),
            loadingOverlay: document.getElementById('loading-overlay'),
            messageContainer: document.getElementById('message-container'),
            jumpText: document.getElementById('jump-text'),
        };

        this.init();
    }

    /**
     * Initialisiert die Anwendung
     */
    init() {
        this.setupEventListeners();
        this.checkForReferralCode();
        this.checkStoredUser();
    }

    /**
     * Event-Listener einrichten
     */
    setupEventListeners() {
        this.elements.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        this.elements.notYouLink.addEventListener('click', (e) => this.resetView(e));
        this.elements.referralLinkInput.addEventListener('click', () => this.copyReferralLink());
    }

    /**
     * Prüft URL auf Referral-Code
     */
    checkForReferralCode() {
        const urlPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        
        let refCode = urlParams.get('ref');
        
        if (!refCode) {
            const pathParts = urlPath.split('/');
            if (pathParts.length > 2 && pathParts[1] === 'ref') {
                refCode = pathParts[2];
            }
        }
        
        if (refCode) {
            localStorage.setItem('referralCode', refCode);
            // URL bereinigen, um den Code zu entfernen
            window.history.replaceState({}, document.title, "/");
        }
    }

    /**
     * Prüft gespeicherten Benutzer im localStorage
     */
    checkStoredUser() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                this.showView('status');
                this.loadUserData();
            } catch (error) {
                this.resetToSignup();
            }
        } else {
            this.showView('signup');
        }
    }

    /**
     * Behandelt die Anmeldung zur Warteliste
     */
    async handleSignup(event) {
        event.preventDefault();
        const email = this.elements.emailInput.value.trim();
        const referralCode = localStorage.getItem('referralCode');

        if (!email || !email.includes('@')) {
            this.showMessage('Bitte gib eine gültige E-Mail-Adresse ein.', 'error');
            return;
        }

        this.showLoading(true);
        console.log('Starting signup process...');

        try {
            const response = await fetch('/api/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, referralCode }),
            });

            const data = await response.json();
            console.log('API response:', data);

            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                localStorage.removeItem('referralCode');
                this.elements.signupForm.reset();
                
                console.log('Switching to status view...');
                this.showView('status');
                
                try {
                    await this.loadUserData();
                } catch (loadError) {
                    console.error('Error loading user data:', loadError);
                    this.showMessage('Fehler beim Laden der Benutzerdaten, aber Anmeldung erfolgreich.', 'info');
                }
            } else {
                this.showMessage(data.error || 'Ein Fehler ist aufgetreten.', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showMessage('Verbindungsfehler. Bitte versuche es erneut.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Lädt Benutzerdaten und aktualisiert das Dashboard
     */
    async loadUserData() {
        if (!this.currentUser?.referralCode) return;

        this.showLoading(true);
        try {
            const oldUser = this.currentUser ? { ...this.currentUser } : null;

            const response = await fetch(`/api/user/${this.currentUser.referralCode}`);
            const data = await response.json();

            if (data.success) {
                const newUser = data.user;
                this.currentUser = newUser;
                localStorage.setItem('currentUser', JSON.stringify(newUser));
                this.updateDashboard();

                if (oldUser &&
                    oldUser.position !== null && newUser.position !== null &&
                    newUser.referralCount > (oldUser.referralCount || 0) &&
                    newUser.position < oldUser.position) {
                    
                    const jump = oldUser.position - newUser.position;
                    const jumpText = jump === 1 ? "1 Platz" : `${jump} Plätze`;
                    this.showMessage(`🎉 Du bist ${jumpText} nach oben gerutscht!`, 'success');
                }

            } else {
                this.resetToSignup();
            }
        } catch (error) {
            this.showMessage('Fehler beim Laden der Benutzerdaten.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Zeigt das Benutzer-Dashboard an
     */
    showUserDashboard() {
        document.getElementById('signup-section').classList.add('hidden');
        document.getElementById('user-dashboard').classList.remove('hidden');
        this.updateDashboard();
    }

    /**
     * Slot-Machine-Effekt für Zahlen
     */
    async animateNumber(element, finalNumber, duration = 3000) {
        const startTime = Date.now();
        const startNumber = 0;
        
        // Zuerst schnell rotieren (0-9) für 1 Sekunde
        const fastPhase = 1000; // 1 Sekunde für schnelle Phase
        const slowPhase = 2000; // 2 Sekunden für langsame Phase
        
        let frameCount = 0;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            frameCount++;
            
            if (elapsed < fastPhase) {
                // Schnelle Phase: Zufällige Zahlen 0-9
                const randomNumber = Math.floor(Math.random() * 10);
                element.textContent = this.formatNumber(randomNumber);
                requestAnimationFrame(animate);
            } else if (elapsed < duration) {
                // Langsame Phase: Allmählich zur Zielzahl
                const slowElapsed = elapsed - fastPhase;
                const slowProgress = slowElapsed / slowPhase;
                
                // Easing-Funktion für natürliche Verlangsamung
                const easeOut = 1 - Math.pow(1 - slowProgress, 3);
                const currentNumber = Math.floor(startNumber + (finalNumber - startNumber) * easeOut);
                
                element.textContent = this.formatNumber(currentNumber);
                
                // Verlangsamung der Animation gegen Ende
                const slowdownFactor = 1 + (slowProgress * 8); // 1x bis 9x langsamer
                setTimeout(() => {
                    requestAnimationFrame(animate);
                }, slowdownFactor * 16); // 16ms = 60fps, wird bis zu 144ms = 7fps
            } else {
                // Finale Zahl anzeigen
                element.textContent = this.formatNumber(finalNumber);
            }
        };
        
        animate();
    }

    /**
     * Erstellt animierten Jump-Text mit Slot-Machine-Effekt
     */
    createAnimatedJumpText(jump) {
        const plural = jump === 1 ? 'Wartenden' : 'Wartende';
        const jumpElementId = 'animated-jump-number';
        
        return `
            <div class="text-center">
                <div class="text-sm text-black/70 mb-4">
                    <span class="font-extrabold text-[#FF90BF]">Überhol <span id="${jumpElementId}">?</span> ${plural}</span> <span class="font-normal text-black/70">mit der nächsten</span><br>
                    <span>Anmeldung über dein persönlichen Link!</span>
                </div>
            </div>
        `;
    }

    /**
     * Aktualisiert das Dashboard mit aktuellen Daten
     */
    updateDashboard() {
        console.log('Updating dashboard with user:', this.currentUser);
        
        if (!this.currentUser) {
            console.error('No current user found');
            return;
        }
        
        try {
            const peopleAhead = this.currentUser.position;
            console.log('People ahead:', peopleAhead);

            // Position anzeigen (peopleAhead + 1 = Platz-Nummer)
            const displayPosition = peopleAhead + 1;
            this.animateNumber(this.elements.userPosition, displayPosition, 3000);

            this.elements.userEmailInfo.textContent = this.currentUser.email;
            const referralLink = `${window.location.origin}/?ref=${this.currentUser.referralCode}`;
            this.elements.referralLinkInput.value = referralLink;
            this.updateShareLinks(referralLink);
            
            const jump = this.currentUser.potentialJump;
            if (jump > 0) {
                // Animierten Jump-Text erstellen
                this.elements.jumpText.innerHTML = this.createAnimatedJumpText(jump);
                
                // Slot-Machine-Effekt für die Jump-Zahl starten nach der Hauptzahl
                setTimeout(() => {
                    const jumpElement = document.getElementById('animated-jump-number');
                    if (jumpElement) {
                        this.animateNumber(jumpElement, jump, 3000);
                    }
                }, 3500); // 3,5s Verzögerung - startet 0,5s nach Ende der ersten Animation
            } else {
                this.elements.jumpText.innerHTML = '';
            }
            
            console.log('Dashboard updated successfully');
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }

        // Motivations-Text unterhalb des Referral-Links anzeigen
        const referralLinkInput = document.getElementById('referral-link');
        let motivationText = document.getElementById('motivation-text');
        if (!motivationText) {
            motivationText = document.createElement('p');
            motivationText.id = 'motivation-text';
            motivationText.className = 'text-xs text-black/50 leading-relaxed text-center mt-6';
            referralLinkInput.parentNode.parentNode.appendChild(motivationText);
        }
        motivationText.textContent = 'Jede Anmeldung über deinen Link bringt dich in der Warteliste weiter nach vorne';
    }

    updateShareLinks(url) {
        const whatsappText = encodeURIComponent(`Ich bin auf der Warteliste für ein neues Produkt. Melde dich über meinen Link an, um uns beiden einen besseren Platz zu sichern: ${url}`);
        const mailSubject = encodeURIComponent("Tritt mit mir der Warteliste bei!");
        const mailBody = encodeURIComponent(`Hi,\n\nich bin auf der Warteliste für ein spannendes neues Produkt. Wenn du dich über meinen Link anmeldest, klettern wir beide auf der Liste nach oben:\n${url}\n\nLG`);

        const html = `
            <a href="https://api.whatsapp.com/send?text=${whatsappText}" target="_blank" class="flex-1 bg-[#F8FAFF] hover:bg-black/10 text-black font-bold px-4 py-2.5 rounded-lg flex items-center justify-center transition duration-200 gap-2 border border-black/10">
                <img src="whatsapp.webp" alt="WhatsApp" width="16" height="16" class="w-4 h-4">
                <span>WhatsApp</span>
            </a>
            <a href="mailto:?subject=${mailSubject}&body=${mailBody}" class="flex-1 bg-[#F8FAFF] hover:bg-black/10 text-black font-bold px-4 py-2.5 rounded-lg flex items-center justify-center transition duration-200 gap-2 border border-black/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mail"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <span>Email</span>
            </a>
        `;
        this.elements.socialShare.innerHTML = html;
        this.elements.socialShare.className = "flex items-stretch justify-center gap-3 w-full mb-3";
    }
    
    async resetView(event) {
        if(event) event.preventDefault();
        
        // Bestätigung vom Benutzer einholen
        if (!confirm('Möchtest du deine E-Mail-Adresse wirklich aus der Warteliste entfernen?')) {
            return;
        }
        
        this.showLoading(true);
        
        try {
            // E-Mail aus der Datenbank löschen
            if (this.currentUser?.referralCode) {
                const response = await fetch(`/api/user/${this.currentUser.referralCode}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.resetToSignup();
                    this.showMessage('Deine E-Mail-Adresse wurde erfolgreich aus der Warteliste entfernt.', 'success');
                } else {
                    this.showMessage('Fehler beim Entfernen der E-Mail-Adresse.', 'error');
                }
            } else {
                this.resetToSignup();
                this.showMessage('Du wurdest abgemeldet.', 'info');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showMessage('Fehler beim Entfernen der E-Mail-Adresse.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    resetToSignup() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('referralCode');
        this.currentUser = null;
        this.showView('signup');
    }

    showView(viewName) {
        console.log('showView called with:', viewName);
        console.log('Elements:', this.elements);
        
        if (viewName === 'signup') {
            this.elements.signupView.classList.remove('hidden');
            this.elements.statusView.classList.add('hidden');
            console.log('Showing signup view');
        } else if (viewName === 'status') {
            this.elements.signupView.classList.add('hidden');
            this.elements.statusView.classList.remove('hidden');
            console.log('Showing status view');
        }
        
        console.log('After switch:');
        console.log('Signup hidden:', this.elements.signupView.classList.contains('hidden'));
        console.log('Status hidden:', this.elements.statusView.classList.contains('hidden'));
    }

    /**
     * Zeigt Loading-Overlay an/aus
     */
    showLoading(isLoading) {
        this.elements.loadingOverlay.classList.toggle('hidden', !isLoading);
    }

    /**
     * Zeigt eine Toast-Nachricht an
     */
    showMessage(message, type = 'info') {
        const p = document.createElement('p');
        
        const typeClasses = {
            info: 'bg-[#F8FAFF] border-[#FF90BF]',
            success: 'bg-green-100 border-green-500',
            error: 'bg-red-100 border-red-500'
        };
        
        p.className = `max-w-sm w-full text-sm text-black rounded-lg shadow-md p-4 mb-3 border-l-4 transition-all duration-300 transform ${typeClasses[type]}`;
        p.textContent = message;

        this.elements.messageContainer.appendChild(p);

        const timeout = setTimeout(() => {
            p.classList.add('opacity-0', 'translate-x-8');
            setTimeout(() => {
                p.remove();
            }, 300);
        }, 4000);

        p.addEventListener('click', () => {
            clearTimeout(timeout);
            p.classList.add('opacity-0', 'translate-x-8');
            setTimeout(() => {
                p.remove();
            }, 300);
        });
    }

    /**
     * Formatiert eine Zahl mit Trennzeichen
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    
    /**
     * Kopiert den Referral-Link und zeigt eine Nachricht an
     */
    copyReferralLink() {
        const linkInput = this.elements.referralLinkInput;
        linkInput.select();
        linkInput.setSelectionRange(0, 99999);
        try {
            navigator.clipboard.writeText(linkInput.value);
            this.showMessage('Link in die Zwischenablage kopiert!', 'info');
        } catch (err) {
            this.showMessage('Fehler beim Kopieren des Links.', 'error');
        }
    }
}

// Initialisierung der App, wenn das DOM geladen ist.
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ReferralApp();
}); 