/* ==========================================================================
   MALODAC VENTURES — script.js
   Loaded on every page with <script src="script.js" defer></script>.
   Each feature is its own small function and only runs if the elements it
   needs exist on the current page.

   Features
   1. Mobile menu (hamburger)
   2. Highlight the current page in the menus
   3. Header shadow when scrolling
   4. Fade-in on scroll
   5. Contact form: validation + pre-fill + send via WhatsApp
   6. Sign Up pop-up (native <dialog>)
   7. Footer year
   8. Services page: FAQ accordion
   9. Gallery page: category filter + lightbox
   ========================================================================== */

(() => {
    'use strict';

    /* ---- Edit your business details here --------------------------------- */
    const CONFIG = {
        whatsappNumber: '2348023053256',            // country code + number, no "+" or spaces
        businessEmail: 'malodacventures@gmail.com',
        signupStorageKey: 'malodac_signups',
    };

    /* ---- Tiny helpers ---------------------------------------------------- */
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));


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


    /* 6. SIGN-UP POP-UP ---------------------------------------------------- */
    function buildSignupDialog() {
        const dialog = document.createElement('dialog');
        dialog.className = 'modal';
        dialog.setAttribute('aria-labelledby', 'signup-title');
        // Static markup only (no user data goes into this template)
        dialog.innerHTML = `
            <div class="modal-body">
                <button class="modal-close" type="button" aria-label="Close sign-up form">&times;</button>
                <h2 id="signup-title">Create your account</h2>
                <p class="modal-intro">Get updates on new equipment and special offers.</p>

                <form id="signup-form" novalidate>
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
                    <button class="btn btn-primary" type="submit">Sign up</button>
                    <div class="form-status" role="status" aria-live="polite"></div>
                </form>
            </div>`;
        return dialog;
    }

    function initSignup() {
        const triggers = $$('[data-open-signup]');
        if (!triggers.length) return;

        const dialog = buildSignupDialog();
        document.body.append(dialog);

        const form = $('#signup-form', dialog);
        const status = $('.form-status', form);
        const validateAll = attachValidation(form);
        let closeTimer;

        // Browsers without <dialog> support: send people to the contact page instead
        const supportsDialog = typeof dialog.showModal === 'function';

        triggers.forEach((btn) =>
            btn.addEventListener('click', () => {
                if (!supportsDialog) {
                    window.location.href = 'contact.html';
                    return;
                }
                dialog.showModal();
                $('input', form).focus();
            })
        );

        $('.modal-close', dialog).addEventListener('click', () => dialog.close());

        // Click on the dark backdrop closes the dialog
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.close();
        });

        // Reset everything each time it closes
        dialog.addEventListener('close', () => {
            clearTimeout(closeTimer);
            form.reset();
            clearErrors(form);
            status.className = 'form-status';
            status.textContent = '';
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validateAll()) return;

            const data = new FormData(form);
            const signup = {
                name: data.get('name').trim(),
                email: data.get('email').trim(),
                phone: data.get('phone').trim(),
                date: new Date().toISOString(),
            };

            // TODO: replace this with a real request to your backend, e.g.
            //   fetch('/api/signup', { method: 'POST', body: JSON.stringify(signup) })
            // For now the sign-up is only saved in THIS visitor's browser (localStorage).
            try {
                const saved = JSON.parse(localStorage.getItem(CONFIG.signupStorageKey) || '[]');
                saved.push(signup);
                localStorage.setItem(CONFIG.signupStorageKey, JSON.stringify(saved));
            } catch (err) {
                /* storage blocked (private mode): ignore, the demo still continues */
            }

            setStatus(status, 'success', `Thank you, ${signup.name.split(' ')[0]}! You're signed up.`);
            closeTimer = setTimeout(() => dialog.close(), 2200);
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


    /* START ---------------------------------------------------------------- */
    initNav();
    markActiveLink();
    initHeaderShadow();
    initReveal();
    initContactForm();
    initSignup();
    initFaq();
    initGallery();
    setYear();
})();
