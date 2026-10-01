/* ==========================================================================
   MALODAC VENTURES — script.js
   Loaded on every page with <script src="script.js" defer></script>.
   Each feature is its own small function and only runs if the elements it
   needs exist on the current page.

   Features
   0. Preloader (logo + rolling border, shown on load and page changes)
   1. Mobile menu (hamburger)
   2. Highlight the current page in the menus
   3. Header shadow when scrolling
   4. Fade-in on scroll
   5. Contact form: validation + pre-fill + send via WhatsApp
   6. Account: log in / create account / log out (native <dialog>)
   7. Footer year
   8. Services page: FAQ accordion
   9. Gallery page: category filter + lightbox
  10. Cart: shared storage helpers used by the products page and the drawer
  11. Products page: category filter + quantity steppers + add to cart
  12. Cart drawer: view / update / remove items, checkout via WhatsApp
   ========================================================================== */

(() => {
    'use strict';

    /* ---- Edit your business details here --------------------------------- */
    const CONFIG = {
        whatsappNumber: '2348023053256',            // country code + number, no "+" or spaces
        businessEmail: 'malodacventures@gmail.com',
    };

    /* ---- Tiny helpers ---------------------------------------------------- */
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));


    /* 0. PRELOADER ----------------------------------------------------------
       Shows the logo with a spinning border while the page loads, and again
       for a moment when the visitor clicks a link to another page, so the
       hand-off between pages feels smooth instead of a blank flash. ------- */
    function initPreloader() {
        const preloader = $('#preloader');
        if (!preloader) return;

        const MIN_VISIBLE_MS = 400;   // avoids an instant flash on fast loads
        const shownAt = Date.now();
        let hidden = false;

        function hide() {
            if (hidden) return;
            hidden = true;
            const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
            setTimeout(() => preloader.classList.add('is-hidden'), wait);
        }

        function show() {
            hidden = false;
            preloader.classList.remove('is-hidden');
        }

        // Hide once the page (images included) has finished loading
        if (document.readyState === 'complete') {
            hide();
        } else {
            window.addEventListener('load', hide);
            // Safety net: never let a slow image keep it up forever
            setTimeout(hide, 4000);
        }

        // Show it again right before leaving for another page on this site
        document.addEventListener('click', (e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const link = e.target.closest('a[href]');
            if (!link) return;
            if (link.target && link.target !== '_self') return;      // opens a new tab
            if (link.hasAttribute('download')) return;

            let url;
            try {
                url = new URL(link.href, window.location.href);
            } catch (err) {
                return;
            }
            if (url.origin !== window.location.origin) return;        // external site
            if (url.protocol === 'tel:' || url.protocol === 'mailto:') return;

            // Same page, just jumping to an anchor: no preloader needed
            if (url.pathname === window.location.pathname && (url.hash || url.search === window.location.search)) return;

            show();
        });

        // Coming back via the browser's Back/Forward cache: make sure it's hidden
        window.addEventListener('pageshow', (e) => {
            if (e.persisted) hide();
        });
    }


    /* 1. MOBILE MENU ------------------------------------------------------- */
    function initNav() {
        const toggle = $('.nav-toggle');
        const nav = $('#site-nav');
        if (!toggle || !nav) return;

        const desktop = window.matchMedia('(min-width: 1024px)');

        function setOpen(open) {
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            nav.classList.toggle('is-open', open);
            document.body.classList.toggle('nav-open', open);
        }
 
        const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

        toggle.addEventListener('click', () => setOpen(!isOpen()));

        // Close after choosing a link / button inside the menu
        nav.addEventListener('click', (e) => {
            if (e.target.closest('a, button')) setOpen(false);
        });

        // Close with Escape (and return focus to the hamburger button)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen()) {
                setOpen(false);
                toggle.focus();
            }
        });

        // Close when tapping anywhere outside the header
        document.addEventListener('click', (e) => {
            if (isOpen() && !e.target.closest('.site-header')) setOpen(false);
        });

        // If the window is resized up to desktop width, reset the mobile state
        desktop.addEventListener('change', (e) => {
            if (e.matches) setOpen(false);
        });
    }


    /* 2. HIGHLIGHT CURRENT PAGE ------------------------------------------- */
    function markActiveLink() {
        // "/about.html", "/about" and "/" all become "about" / "index"
        const pageName = (path) => (path.split('/').pop() || 'index').replace(/\.html$/, '');
        const current = pageName(window.location.pathname);

        $$('.nav a, .footer-links a').forEach((link) => {
            const url = new URL(link.href, window.location.href);
            if (url.hash || link.getAttribute('href') === '#') return;   // skip anchors & placeholders
            if (pageName(url.pathname) === current) link.setAttribute('aria-current', 'page');
        });
    }


    /* 3. HEADER SHADOW ON SCROLL ------------------------------------------ */
    function initHeaderShadow() {
        const header = $('.site-header');
        if (!header) return;

        const update = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
        update();
        window.addEventListener('scroll', update, { passive: true });
    }


    /* 4. FADE-IN ON SCROLL ------------------------------------------------- */
    function initReveal() {
        const items = $$('[data-reveal]');
        if (!items.length) return;

        // Very old browsers: just show everything
        if (!('IntersectionObserver' in window)) {
            items.forEach((el) => el.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);                // animate once, then stop watching
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        items.forEach((el) => observer.observe(el));
    }


    /* SHARED FORM VALIDATION (used by the contact form AND the sign-up form) */
    const validators = {
        name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your full name.'),
        email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address, e.g. name@email.com.'),
        phone: (v) => {
            const digits = v.replace(/\D/g, '');
            return v.trim() === '' || (digits.length >= 10 && digits.length <= 15) ? '' : 'Please enter a valid phone number.';
        },
        message: (v) => (v.trim().length >= 10 ? '' : 'Please write at least 10 characters so we can help you.'),
        password: (v) => (v.length >= 6 ? '' : 'Password must be at least 6 characters.'),
    };

    // Checks ONE input, shows/clears its error message, returns true if valid
    function validateField(input) {
        const rule = validators[input.dataset.validate];
        if (!rule) return true;

        const message = rule(input.value);
        const field = input.closest('.field');
        const errorEl = $('.error-msg', field);

        field.classList.toggle('has-error', Boolean(message));
        input.setAttribute('aria-invalid', String(Boolean(message)));
        if (errorEl) errorEl.textContent = message;
        return !message;
    }

    // Wires up live validation on a form and returns a function that checks the whole form
    function attachValidation(form) {
        const inputs = $$('[data-validate]', form);

        inputs.forEach((input) => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                if (input.closest('.field').classList.contains('has-error')) validateField(input);
            });
        });

        return function validateAll() {
            let firstInvalid = null;
            inputs.forEach((input) => {
                if (!validateField(input) && !firstInvalid) firstInvalid = input;
            });
            if (firstInvalid) firstInvalid.focus();
            return !firstInvalid;
        };
    }

    function clearErrors(form) {
        $$('.field', form).forEach((f) => f.classList.remove('has-error'));
        $$('.error-msg', form).forEach((e) => (e.textContent = ''));
        $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
    }

    function setStatus(el, type, content) {
        el.className = `form-status is-visible is-${type}`;
        el.textContent = '';
        if (content instanceof Node) el.append(content);
        else el.textContent = content;
    }


    /* 5. CONTACT FORM ------------------------------------------------------ */
    function initContactForm() {
        const form = $('#contact-form');
        if (!form) return;

        const status = $('.form-status', form);
        const validateAll = attachValidation(form);

        // Category cards link here as contact.html?product=Red%20chafing%20dish
        // -> pre-fill the message so the customer only has to add their details.
        // The Services page links here as contact.html?service=Bulk%20and%20event%20orders
        const params = new URLSearchParams(window.location.search);
        const product = params.get('product');
        const service = params.get('service');
        if (!form.elements.message.value) {
            if (product) {
                form.elements.message.value =
                    `Hello Malodac Ventures, I'm interested in the ${product.slice(0, 80)}. ` +
                    'Please send me more details (price, availability and delivery).';
            } else if (service) {
                form.elements.message.value =
                    `Hello Malodac Ventures, I'd like to enquire about your ${service.slice(0, 80).toLowerCase()} service. ` +
                    'Please get in touch with more details.';
            }
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!validateAll()) {
                setStatus(status, 'error', 'Please fix the highlighted fields and try again.');
                return;
            }

            const data = new FormData(form);
            const text = [
                'Hello Malodac Ventures,',
                '',
                `Name: ${data.get('name').trim()}`,
                `Email: ${data.get('email').trim()}`,
                '',
                data.get('message').trim(),
            ].join('\n');

            // There's no server yet, so the message is sent through WhatsApp.
            const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
            window.open(whatsappUrl, '_blank', 'noopener');

            // Friendly confirmation with a fallback link in case the pop-up was blocked
            const note = document.createElement('span');
            note.append('Thank you! WhatsApp is opening with your message. Just tap Send. Nothing happened? ');
            const link = document.createElement('a');
            link.href = whatsappUrl;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = 'Open WhatsApp';
            note.append(link, ' or email us at ', CONFIG.businessEmail, '.');

            setStatus(status, 'success', note);
            form.reset();
            clearErrors(form);
        });
    }


    /* 6. ACCOUNT: LOG IN / CREATE ACCOUNT / LOG OUT -------------------------
       Everything is stored in THIS visitor's browser (localStorage) — there
       is no server yet, so this is a front-end demo of accounts rather than
       real authentication. Passwords are run through a quick, NON-secure
       hash below just so a raw password isn't sitting in localStorage in
       plain text; that is not real password security. Before this handles
       real customers, swap the storage in this section for calls to a real
       backend that hashes and checks passwords on the server. ------------ */
    const ACCOUNTS_KEY = 'malodac_accounts';
    const CURRENT_USER_KEY = 'malodac_current_user';

    // A quick non-cryptographic hash (NOT secure encryption) so the password
    // itself isn't stored as plain text. See the note above.
    function obscurePassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            hash = (hash << 5) - hash + password.charCodeAt(i);
            hash |= 0;
        }
        return String(hash);
    }

    function readAccounts() {
        try {
            const saved = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
            return Array.isArray(saved) ? saved : [];
        } catch (err) {
            return [];
        }
    }

    function writeAccounts(accounts) {
        try {
            localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        } catch (err) {
            /* storage blocked (private mode): accounts just won't be remembered */
        }
    }

    function getCurrentUser() {
        try {
            const email = localStorage.getItem(CURRENT_USER_KEY);
            if (!email) return null;
            return readAccounts().find((acc) => acc.email === email) || null;
        } catch (err) {
            return null;
        }
    }

    function setCurrentUser(email) {
        try {
            if (email) localStorage.setItem(CURRENT_USER_KEY, email);
            else localStorage.removeItem(CURRENT_USER_KEY);
        } catch (err) {
            /* storage blocked: the visitor will just need to log in again */
        }
    }

    // Reflects the logged-in state on the header button, on every page
    function updateAccountUI() {
        const user = getCurrentUser();
        $$('[data-open-account]').forEach((btn) => {
            btn.textContent = user ? `Hi, ${user.name.split(' ')[0]}` : 'Sign Up';
        });
    }

    function buildAccountDialog() {
        const dialog = document.createElement('dialog');
        dialog.className = 'modal';
        dialog.setAttribute('aria-label', 'Your account');
        // Static markup only (no user data goes into this template)
        dialog.innerHTML = `
            <div class="modal-body">
                <button class="modal-close" type="button" aria-label="Close account panel">&times;</button>

                <div class="auth-guest">
                    <div class="auth-tabs" role="tablist">
                        <button type="button" class="auth-tab" data-tab="login" role="tab" aria-selected="true">Log in</button>
                        <button type="button" class="auth-tab" data-tab="signup" role="tab" aria-selected="false">Create account</button>
                    </div>

                    <form id="login-form" class="auth-panel" data-panel="login" novalidate>
                        <h2>Welcome back</h2>
                        <div class="field">
                            <label for="login-email">Email address</label>
                            <input type="email" id="login-email" name="email" autocomplete="email" placeholder="your@email.com"
                                   data-validate="email" aria-describedby="login-email-error" required>
                            <p class="error-msg" id="login-email-error"></p>
                        </div>
                        <div class="field">
                            <label for="login-password">Password</label>
                            <input type="password" id="login-password" name="password" autocomplete="current-password" placeholder="Your password"
                                   data-validate="password" aria-describedby="login-password-error" required>
                            <p class="error-msg" id="login-password-error"></p>
                        </div>
                        <button class="btn btn-primary" type="submit">Log in</button>
                        <div class="form-status" role="status" aria-live="polite"></div>
                        <p class="auth-switch">New here? <button type="button" data-switch-tab="signup">Create an account</button></p>
                    </form>

                    <form id="signup-form" class="auth-panel" data-panel="signup" novalidate hidden>
                        <h2>Create your account</h2>
                        <div class="field">
                            <label for="su-name">Full name</label>
                            <input type="text" id="su-name" name="name" autocomplete="name" placeholder="Your name"
                                   data-validate="name" aria-describedby="su-name-error" required>
                            <p class="error-msg" id="su-name-error"></p>
                        </div>
                        <div class="field">
                            <label for="su-email">Email address</label>
                            <input type="email" id="su-email" name="email" autocomplete="email" placeholder="your@email.com"
                                   data-validate="email" aria-describedby="su-email-error" required>
                            <p class="error-msg" id="su-email-error"></p>
                        </div>
                        <div class="field">
                            <label for="su-phone">Phone / WhatsApp <small>(optional)</small></label>
                            <input type="tel" id="su-phone" name="phone" autocomplete="tel" placeholder="0802 000 0000"
                                   data-validate="phone" aria-describedby="su-phone-error">
                            <p class="error-msg" id="su-phone-error"></p>
                        </div>
                        <div class="field">
                            <label for="su-password">Password</label>
                            <input type="password" id="su-password" name="password" autocomplete="new-password" placeholder="At least 6 characters"
                                   data-validate="password" aria-describedby="su-password-error" required>
                            <p class="error-msg" id="su-password-error"></p>
                        </div>
                        <div class="field">
                            <label for="su-confirm">Confirm password</label>
                            <input type="password" id="su-confirm" name="confirm" autocomplete="new-password" placeholder="Type it again"
                                   aria-describedby="su-confirm-error" required>
                            <p class="error-msg" id="su-confirm-error"></p>
                        </div>
                        <button class="btn btn-primary" type="submit">Create account</button>
                        <div class="form-status" role="status" aria-live="polite"></div>
                        <p class="auth-switch">Already have an account? <button type="button" data-switch-tab="login">Log in</button></p>
                    </form>
                </div>

                <div class="account-panel" hidden>
                    <h2>Hi, <span data-account-name>there</span>!</h2>
                    <p class="account-email" data-account-email></p>
                    <p class="account-note">You're logged in on this device.</p>
                    <button class="btn btn-outline" type="button" data-logout>Log out</button>
                </div>
            </div>`;
        return dialog;
    }

    function initAccount() {
        const triggers = $$('[data-open-account]');
        if (!triggers.length) return;

        const dialog = buildAccountDialog();
        document.body.append(dialog);

        const guestView = $('.auth-guest', dialog);
        const accountView = $('.account-panel', dialog);
        const tabs = $$('.auth-tab', dialog);
        const panels = $$('.auth-panel', dialog);
        const loginForm = $('#login-form', dialog);
        const signupForm = $('#signup-form', dialog);
        const loginStatus = $('.form-status', loginForm);
        const signupStatus = $('.form-status', signupForm);
        const validateLogin = attachValidation(loginForm);
        const validateSignup = attachValidation(signupForm);
        let closeTimer;

        // Browsers without <dialog> support: send people to the contact page instead
        const supportsDialog = typeof dialog.showModal === 'function';

        function setTab(tab) {
            tabs.forEach((btn) => btn.setAttribute('aria-selected', String(btn.dataset.tab === tab)));
            panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== tab; });
        }

        // Shows the log-in/create-account tabs for a guest, or the account
        // panel for someone already logged in on this device
        function renderView() {
            const user = getCurrentUser();
            if (user) {
                guestView.hidden = true;
                accountView.hidden = false;
                $('[data-account-name]', accountView).textContent = user.name.split(' ')[0];
                $('[data-account-email]', accountView).textContent = user.email;
            } else {
                accountView.hidden = true;
                guestView.hidden = false;
                setTab('login');
                loginForm.reset();
                signupForm.reset();
                clearErrors(loginForm);
                clearErrors(signupForm);
                loginStatus.className = 'form-status';
                loginStatus.textContent = '';
                signupStatus.className = 'form-status';
                signupStatus.textContent = '';
            }
        }

        triggers.forEach((btn) =>
            btn.addEventListener('click', () => {
                if (!supportsDialog) {
                    window.location.href = 'contact.html';
                    return;
                }
                renderView();
                dialog.showModal();
            })
        );

        tabs.forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
        $$('[data-switch-tab]', dialog).forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.switchTab)));

        $('.modal-close', dialog).addEventListener('click', () => dialog.close());

        // Click on the dark backdrop closes the dialog
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.close();
        });

        dialog.addEventListener('close', () => clearTimeout(closeTimer));

        $('[data-logout]', dialog).addEventListener('click', () => {
            setCurrentUser(null);
            updateAccountUI();
            renderView();
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validateLogin()) return;

            const data = new FormData(loginForm);
            const email = data.get('email').trim().toLowerCase();
            const password = data.get('password');
            const account = readAccounts().find((acc) => acc.email === email);

            if (!account || account.passwordHash !== obscurePassword(password)) {
                setStatus(loginStatus, 'error', 'Email or password is incorrect.');
                return;
            }

            setCurrentUser(account.email);
            updateAccountUI();
            setStatus(loginStatus, 'success', `Welcome back, ${account.name.split(' ')[0]}!`);
            closeTimer = setTimeout(() => dialog.close(), 1200);
        });

        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validateSignup()) return;

            const data = new FormData(signupForm);
            const name = data.get('name').trim();
            const email = data.get('email').trim().toLowerCase();
            const phone = data.get('phone').trim();
            const password = data.get('password');
            const confirm = data.get('confirm');
            const confirmField = $('#su-confirm').closest('.field');

            if (!confirm) {
                confirmField.classList.add('has-error');
                $('.error-msg', confirmField).textContent = 'Please confirm your password.';
                $('#su-confirm').focus();
                return;
            }
            if (password !== confirm) {
                confirmField.classList.add('has-error');
                $('.error-msg', confirmField).textContent = "Passwords don't match.";
                $('#su-confirm').focus();
                return;
            }

            const accounts = readAccounts();
            if (accounts.some((acc) => acc.email === email)) {
                setStatus(signupStatus, 'error', 'An account with that email already exists. Try logging in instead.');
                return;
            }

            // TODO: replace this with a real request to your backend, e.g.
            //   fetch('/api/accounts', { method: 'POST', body: JSON.stringify({ name, email, phone, password }) })
            // For now the account only exists in THIS visitor's browser (localStorage).
            const account = { name, email, phone, passwordHash: obscurePassword(password), date: new Date().toISOString() };
            accounts.push(account);
            writeAccounts(accounts);
            setCurrentUser(account.email);
            updateAccountUI();

            setStatus(signupStatus, 'success', `Welcome, ${name.split(' ')[0]}! Your account is ready.`);
            closeTimer = setTimeout(() => dialog.close(), 1200);
        });
    }


    /* 7. FOOTER YEAR ------------------------------------------------------- */
    function setYear() {
        $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
    }


    /* 8. SERVICES PAGE: FAQ ACCORDION ---------------------------------------- */
    // The <details> elements already open/close on their own. This just makes
    // sure only ONE answer is open at a time.
    function initFaq() {
        const items = $$('.faq-item');
        if (!items.length) return;

        items.forEach((item) => {
            item.addEventListener('toggle', () => {
                if (!item.open) return;
                items.forEach((other) => {
                    if (other !== item) other.open = false;
                });
            });
        });
    }


    /* 9. GALLERY PAGE: FILTER + LIGHTBOX ------------------------------------- */
    function buildLightbox() {
        const dialog = document.createElement('dialog');
        dialog.className = 'lightbox';
        dialog.setAttribute('aria-label', 'Photo viewer');
        // Static markup only (photo details are filled in later with textContent / setAttribute)
        dialog.innerHTML = `
            <div class="lightbox-stage">
                <img class="lightbox-img" src="" alt="">
                <button class="lightbox-btn lightbox-close" type="button" aria-label="Close photo viewer">&times;</button>
                <button class="lightbox-btn lightbox-prev" type="button" aria-label="Previous photo">&#10094;</button>
                <button class="lightbox-btn lightbox-next" type="button" aria-label="Next photo">&#10095;</button>
            </div>
            <div class="lightbox-bar">
                <div>
                    <p class="lightbox-title"></p>
                    <p class="lightbox-meta"></p>
                </div>
                <a class="btn btn-primary lightbox-enquire" href="contact.html">Enquire about this</a>
            </div>`;
        return dialog;
    }

    function initGallery() {
        const grid = $('.gallery-grid');
        if (!grid) return;

        const cells = $$('.gallery-cell', grid);
        const filterButtons = $$('.filter-btn');
        const countEl = $('#gallery-count');
        const emptyEl = $('#gallery-empty');
        let visible = cells;                          // the cells currently shown (changes with the filter)

        // ---- Filter ----
        function applyFilter(category) {
            cells.forEach((cell) => {
                cell.hidden = !(category === 'all' || cell.dataset.category === category);
            });
            visible = cells.filter((cell) => !cell.hidden);

            filterButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.filter === category)));
            countEl.textContent = `Showing ${visible.length} of ${cells.length} items`;
            emptyEl.hidden = visible.length > 0;
        }

        filterButtons.forEach((btn) => btn.addEventListener('click', () => applyFilter(btn.dataset.filter)));

        // gallery.html#chafing opens with that filter already selected
        const fromHash = window.location.hash.slice(1);
        if (filterButtons.some((btn) => btn.dataset.filter === fromHash)) applyFilter(fromHash);

        // ---- Lightbox ----
        const dialog = buildLightbox();
        document.body.append(dialog);

        const img = $('.lightbox-img', dialog);
        const title = $('.lightbox-title', dialog);
        const meta = $('.lightbox-meta', dialog);
        const enquire = $('.lightbox-enquire', dialog);
        const stage = $('.lightbox-stage', dialog);
        const supportsDialog = typeof dialog.showModal === 'function';
        let index = 0;

        // Friendly category names come from the filter buttons ("chafing" -> "Chafing dishes")
        const categoryName = (key) => {
            const btn = filterButtons.find((b) => b.dataset.filter === key);
            return btn ? btn.textContent.trim() : '';
        };

        function show(i) {
            index = (i + visible.length) % visible.length;      // wraps around at both ends
            const cell = visible[index];
            const photo = $('img', cell);

            img.src = photo.currentSrc || photo.src;
            img.alt = photo.alt;
            title.textContent = cell.dataset.title;
            meta.textContent = `${categoryName(cell.dataset.category)}  |  ${index + 1} of ${visible.length}`;
            enquire.href = `contact.html?product=${encodeURIComponent(cell.dataset.title)}`;

            // With only one photo showing there is nothing to flip through
            $('.lightbox-prev', dialog).hidden = $('.lightbox-next', dialog).hidden = visible.length < 2;
        }

        grid.addEventListener('click', (e) => {
            const cell = e.target.closest('.gallery-cell');
            if (!cell || !supportsDialog) return;
            show(visible.indexOf(cell));
            dialog.showModal();
        });

        $('.lightbox-prev', dialog).addEventListener('click', () => show(index - 1));
        $('.lightbox-next', dialog).addEventListener('click', () => show(index + 1));
        $('.lightbox-close', dialog).addEventListener('click', () => dialog.close());

        // Click the dark area outside the viewer to close
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.close();
        });

        // Left / right arrow keys (Escape is handled by <dialog> itself)
        document.addEventListener('keydown', (e) => {
            if (!dialog.open) return;
            if (e.key === 'ArrowLeft') show(index - 1);
            if (e.key === 'ArrowRight') show(index + 1);
        });

        // Swipe left / right on touch screens
        let touchStartX = 0;
        stage.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
        stage.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 50) show(dx < 0 ? index + 1 : index - 1);
        }, { passive: true });
    }


    /* 10. CART: SHARED STORAGE HELPERS --------------------------------------
       Used by both the Products page (adding items) and the cart drawer
       (viewing / changing / removing items), so they're kept here at the
       top level rather than inside either init function. Saved to THIS
       visitor's browser only (localStorage) — there's no backend yet. --- */
    const CART_STORAGE_KEY = 'malodac_cart';

    function formatNaira(amount) {
        return '\u20a6' + Math.round(amount).toLocaleString('en-NG');
    }

    function readCart() {
        try {
            const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
            return Array.isArray(saved) ? saved : [];
        } catch (err) {
            return [];                                  // storage blocked or corrupted: just start empty
        }
    }

    function writeCart(cart) {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        } catch (err) {
            /* storage blocked (private mode): the cart just won't be remembered */
        }
    }

    function cartCount(cart) {
        return cart.reduce((sum, item) => sum + item.qty, 0);
    }

    function cartTotal(cart) {
        return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    }

    function updateCartBadge() {
        const count = cartCount(readCart());
        $$('[data-cart-count]').forEach((el) => {
            el.textContent = String(count);
            el.hidden = count === 0;
        });
    }

    // Adds a product to the cart, or increases its quantity if it's already there
    function addToCart(product, qty) {
        const cart = readCart();
        const existing = cart.find((item) => item.id === product.id);
        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({ ...product, qty });
        }
        writeCart(cart);
        updateCartBadge();
    }


    /* 11. PRODUCTS PAGE ------------------------------------------------------
       Category filter (same pattern as the Gallery page's filter buttons),
       a quantity stepper on each card, and an "Add to cart" button. ------- */
    function initProducts() {
        const grid = $('.product-grid');
        if (!grid) return;

        const cards = $$('.product-card', grid);
        const filterButtons = $$('.filter-btn');
        const countEl = $('#product-count');

        function applyFilter(category) {
            cards.forEach((card) => {
                card.hidden = !(category === 'all' || card.dataset.category === category);
            });
            const visible = cards.filter((card) => !card.hidden);

            filterButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.filter === category)));
            if (countEl) countEl.textContent = `Showing ${visible.length} of ${cards.length} products`;
        }

        filterButtons.forEach((btn) => btn.addEventListener('click', () => applyFilter(btn.dataset.filter)));

        // products.html#chafing opens with that filter already selected
        const fromHash = window.location.hash.slice(1);
        applyFilter(filterButtons.some((btn) => btn.dataset.filter === fromHash) ? fromHash : 'all');

        // One delegated listener handles every card's stepper + Add to cart button
        grid.addEventListener('click', (e) => {
            const decreaseBtn = e.target.closest('[data-qty-decrease]');
            const increaseBtn = e.target.closest('[data-qty-increase]');
            const addBtn = e.target.closest('[data-add-to-cart]');

            if (decreaseBtn || increaseBtn) {
                const input = $('.qty-input', e.target.closest('.qty-stepper'));
                let value = parseInt(input.value, 10) || 1;
                value = decreaseBtn ? Math.max(1, value - 1) : Math.min(99, value + 1);
                input.value = value;
                return;
            }

            if (addBtn) {
                const card = addBtn.closest('.product-card');
                const qtyInput = $('.qty-input', card);
                const qty = Math.max(1, parseInt(qtyInput ? qtyInput.value : '1', 10) || 1);

                addToCart({
                    id: addBtn.dataset.id,
                    name: addBtn.dataset.name,
                    price: Number(addBtn.dataset.price),
                    image: addBtn.dataset.image,
                }, qty);

                // Brief "Added" confirmation, then back to normal
                const original = addBtn.innerHTML;
                addBtn.disabled = true;
                addBtn.classList.add('is-added');
                addBtn.innerHTML = 'Added to cart <i class="fa-solid fa-check" aria-hidden="true"></i>';
                setTimeout(() => {
                    addBtn.disabled = false;
                    addBtn.classList.remove('is-added');
                    addBtn.innerHTML = original;
                }, 1300);
            }
        });
    }


    /* 12. CART DRAWER --------------------------------------------------------
       A slide-in panel (built with the native <dialog> element, same
       approach as the sign-up pop-up) that lists what's in the cart and
       lets the visitor change quantities, remove items, or check out by
       sending an itemised order over WhatsApp — there's no payment step
       yet, so this mirrors how the contact form already hands off orders. */
    function buildCartDrawer() {
        const dialog = document.createElement('dialog');
        dialog.className = 'cart-drawer';
        dialog.setAttribute('aria-labelledby', 'cart-title');
        dialog.innerHTML = `
            <div class="cart-drawer-inner">
                <div class="cart-drawer-head">
                    <h2 id="cart-title">Your cart</h2>
                    <button class="modal-close cart-close" type="button" aria-label="Close cart">&times;</button>
                </div>
                <div class="cart-drawer-body"></div>
                <div class="cart-drawer-footer" hidden>
                    <div class="cart-total-row">
                        <span>Total</span>
                        <span class="cart-total-amount">${formatNaira(0)}</span>
                    </div>
                    <button class="btn btn-primary cart-checkout-btn" type="button" data-cart-checkout>
                        Checkout via WhatsApp <i class="fa-brands fa-whatsapp" aria-hidden="true"></i>
                    </button>
                    <button class="cart-clear-btn" type="button" data-cart-clear>Clear cart</button>
                </div>
            </div>`;
        return dialog;
    }

    function renderCartDrawer(dialog) {
        const cart = readCart();
        const body = $('.cart-drawer-body', dialog);
        const footer = $('.cart-drawer-footer', dialog);

        if (!cart.length) {
            body.innerHTML = '<p class="cart-empty">Your cart is empty.<br>Browse our <a href="products.html">products</a> to get started.</p>';
            footer.hidden = true;
            return;
        }

        footer.hidden = false;
        body.innerHTML = '';

        cart.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'cart-item';
            row.dataset.id = item.id;
            row.innerHTML = `
                <img class="cart-item-thumb" src="${item.image}" alt="">
                <div class="cart-item-info">
                    <p class="cart-item-name">${item.name}</p>
                    <p class="cart-item-price">${formatNaira(item.price)} each</p>
                    <div class="qty-stepper qty-stepper-sm">
                        <button class="qty-btn" type="button" data-cart-decrease aria-label="Decrease quantity">&minus;</button>
                        <span class="qty-value">${item.qty}</span>
                        <button class="qty-btn" type="button" data-cart-increase aria-label="Increase quantity">+</button>
                    </div>
                </div>
                <div class="cart-item-end">
                    <p class="cart-item-line-total">${formatNaira(item.price * item.qty)}</p>
                    <button class="cart-item-remove" type="button" data-cart-remove aria-label="Remove ${item.name} from cart">
                        <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                    </button>
                </div>`;
            body.append(row);
        });

        $('.cart-total-amount', footer).textContent = formatNaira(cartTotal(cart));
    }

    function initCart() {
        const triggers = $$('[data-open-cart]');
        if (!triggers.length) return;

        const dialog = buildCartDrawer();
        document.body.append(dialog);
        renderCartDrawer(dialog);

        const supportsDialog = typeof dialog.showModal === 'function';

        function openDrawer() {
            if (!supportsDialog) {
                window.location.href = 'products.html';
                return;
            }
            renderCartDrawer(dialog);
            dialog.showModal();
            requestAnimationFrame(() => dialog.classList.add('is-open'));
        }

        function closeDrawer() {
            dialog.classList.remove('is-open');
            setTimeout(() => {
                if (dialog.open) dialog.close();
            }, 300);
        }

        triggers.forEach((btn) => btn.addEventListener('click', openDrawer));
        $('.cart-close', dialog).addEventListener('click', closeDrawer);

        // Click the dark area outside the drawer to close it
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) closeDrawer();
        });

        // Pressing Escape closes the dialog directly; keep our class in sync
        dialog.addEventListener('close', () => dialog.classList.remove('is-open'));

        dialog.addEventListener('click', (e) => {
            const decreaseBtn = e.target.closest('[data-cart-decrease]');
            const increaseBtn = e.target.closest('[data-cart-increase]');
            const removeBtn = e.target.closest('[data-cart-remove]');
            const clearBtn = e.target.closest('[data-cart-clear]');
            const checkoutBtn = e.target.closest('[data-cart-checkout]');

            if (decreaseBtn || increaseBtn || removeBtn) {
                const row = e.target.closest('.cart-item');
                const cart = readCart();
                const item = cart.find((p) => p.id === row.dataset.id);
                if (!item) return;

                if (decreaseBtn) item.qty = Math.max(1, item.qty - 1);
                if (increaseBtn) item.qty += 1;
                if (removeBtn) cart.splice(cart.indexOf(item), 1);

                writeCart(cart);
                renderCartDrawer(dialog);
                updateCartBadge();
                return;
            }

            if (clearBtn) {
                writeCart([]);
                renderCartDrawer(dialog);
                updateCartBadge();
                return;
            }

            if (checkoutBtn) {
                const cart = readCart();
                if (!cart.length) return;

                const lines = cart.map((item) => `- ${item.name} x${item.qty} \u2014 ${formatNaira(item.price * item.qty)}`);
                const text = [
                    'Hello Malodac Ventures, I would like to order:',
                    '',
                    ...lines,
                    '',
                    `Total: ${formatNaira(cartTotal(cart))}`,
                    '',
                    'Please confirm availability and delivery.',
                ].join('\n');

                const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
                window.open(whatsappUrl, '_blank', 'noopener');
            }
        });
    }


    /* START ---------------------------------------------------------------- */
    initPreloader();
    initNav();
    markActiveLink();
    initHeaderShadow();
    initReveal();
    initContactForm();
    initAccount();
    initCart();
    initProducts();
    initFaq();
    initGallery();
    setYear();
    updateAccountUI();
    updateCartBadge();
})();
