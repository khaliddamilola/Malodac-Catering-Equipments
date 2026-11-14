/* ==========================================================================
   MALODAC VENTURES — admin.js
   Powers admin.html: email/password login (Firebase Auth) and adding,
   editing, hiding and deleting products (Firestore).
   Each product is one document in the "products" collection:
     { name, price, category, image, thumb, isPhoto, active, createdAt, updatedAt }
   ========================================================================== */

(() => {
    'use strict';

    const $ = (selector, root = document) => root.querySelector(selector);

    const COLLECTION = 'products';
    const CATEGORIES = window.MALODAC_CATEGORIES || [];
    const naira = (n) => '\u20a6' + Math.round(n).toLocaleString('en-NG');
    const categoryLabel = (key) => (CATEGORIES.find((c) => c.key === key) || { label: key || '-' }).label;

    /* Your original products (used once by "Import my original products") */
    const ORIGINAL_PRODUCTS = [
        { id: 'dinnerware-grey-ribbed', name: 'Grey Ribbed Dinner Set', price: 30000, category: 'dinnerware', image: 'images/malodacimage1.png' },
        { id: 'dispenser-double-drink', name: 'Double Drink Dispenser', price: 95000, category: 'dispensers', image: 'images/malodacimage2.png' },
        { id: 'chafing-rolltop-gold', name: 'Rolltop Chafing Dish (Gold)', price: 130000, category: 'chafing', image: 'images/malodacimage3.png' },
        { id: 'chafing-red-rectangular', name: 'Red Rectangular Chafing Dish', price: 75000, category: 'chafing', image: 'images/malodacimage4.png' },
        { id: 'serving-dome-stand', name: 'Serving Dome On Stand', price: 60000, category: 'serving', image: 'images/malodacimage5.png' },
        { id: 'dinnerware-goldrim-plates', name: 'Gold-Rim Serving Plates (Set of 3)', price: 35000, category: 'dinnerware', image: 'images/malodacimage6.png' },
        { id: 'serving-rosegold-warmer-set', name: 'Rose Gold Food Warmer Set', price: 150000, category: 'serving', image: 'images/bg2.png', isPhoto: true },
        { id: 'chafing-gold-round', name: 'Gold Round Chafing Dish', price: 85000, category: 'chafing', image: 'images/fornow.png', isPhoto: true },
        { id: 'serving-essentials-collection', name: 'Catering Essentials Collection', price: 200000, category: 'serving', image: 'images/background.png' },
        { id: 'round-silver-chaffen', name: 'Round Silver Chaffen Dish', price: 120000, category: 'chafing', image: 'images/malodacimage9.png' },
        { id: 'luxury-gold-chaffen-round', name: 'Gold Luxury Chaffen Dish', price: 150000, category: 'chafing', image: 'images/malodacimage10.png' },
        { id: 'red-fridge-cooler', name: 'Red Fridge Cooler', price: 350000, category: 'coolers', image: 'images/malodacimage11.png' },
        { id: 'two-portion-chaffen-dish', name: 'Two Portion Chaffen Dish', price: 200000, category: 'chafing', image: 'images/malodacimage12.png' },
        { id: 'silver-icing-bucket', name: 'Silver Icing Bowl', price: 50000, category: 'icingbucket', image: 'images/malodacimage13.png' },
        { id: 'gold-icing-bucket', name: 'Gold Icing Bowl', price: 60000, category: 'icingbucket', image: 'images/malodacimage15.png' },
        { id: 'black-icing-bucket', name: 'Black Icing Bowl', price: 70000, category: 'icingbucket', image: 'images/malodacimage14.png' },
    ];

    /* Elements */
    const loginView = $('#login-view');
    const dashView = $('#dashboard-view');
    const loginForm = $('#login-form');
    const loginStatus = $('#login-status');
    const dashStatus = $('#dash-status');
    const logoutBtn = $('#logout-btn');
    const emailLabel = $('#admin-email');

    const form = $('#product-form');
    const formTitle = $('#form-title');
    const formStatus = $('#form-status');
    const saveBtn = $('#save-btn');
    const cancelBtn = $('#cancel-btn');
    const nameInput = $('#p-name');
    const priceInput = $('#p-price');
    const categorySelect = $('#p-category');
    const fileInput = $('#p-file');
    const urlInput = $('#p-url');
    const photoCheck = $('#p-photo');
    const activeCheck = $('#p-active');
    const preview = $('#img-preview');
    const previewPlaceholder = $('#img-placeholder');

    const rows = $('#product-rows');
    const table = $('#product-table');
    const emptyState = $('#empty-state');
    const totalEl = $('#product-total');

    function setStatus(el, type, message) {
        el.className = `form-status is-visible is-${type}`;
        el.textContent = message;
    }
    function clearStatus(el) {
        el.className = 'form-status';
        el.textContent = '';
    }

    /* Stop here with a clear message if the config hasn't been filled in */
    if (!window.malodacConfigured || !window.malodacDb || !window.malodacAuth) {
        setStatus(loginStatus, 'error', 'Firebase is not connected yet. Open firebase-config.js and paste in your project details (see SETUP-GUIDE.md).');
        loginForm.querySelectorAll('input, button').forEach((el) => (el.disabled = true));
        return;
    }

    const db = window.malodacDb;
    const auth = window.malodacAuth;

    function friendlyError(err) {
        const code = (err && err.code) || '';
        if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-email') {
            return 'Email or password is incorrect.';
        }
        if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a few minutes and try again.';
        if (code === 'auth/network-request-failed') return 'No internet connection. Please try again.';
        if (code === 'permission-denied' || code === 'firestore/permission-denied') {
            return 'You are signed in, but this account is not allowed to manage products. Check that your admin UID is in the Firestore rules.';
        }
        return (err && err.message) || 'Something went wrong. Please try again.';
    }


    /* ---------------------------- LOGIN / LOGOUT --------------------------- */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = $('#login-email').value.trim();
        const password = $('#login-password').value;
        if (!email || !password) {
            setStatus(loginStatus, 'error', 'Please enter your email and password.');
            return;
        }
        const btn = $('#login-submit');
        btn.disabled = true;
        clearStatus(loginStatus);
        try {
            await auth.signInWithEmailAndPassword(email, password);
            loginForm.reset();
        } catch (err) {
            setStatus(loginStatus, 'error', friendlyError(err));
        } finally {
            btn.disabled = false;
        }
    });

    $('#reset-btn').addEventListener('click', async () => {
        const email = $('#login-email').value.trim();
        if (!email) {
            setStatus(loginStatus, 'error', 'Type your email address above first, then tap "Forgot your password?".');
            return;
        }
        try {
            await auth.sendPasswordResetEmail(email);
        } catch (err) {
            /* Show the same message either way so this can't be used to guess emails */
        }
        setStatus(loginStatus, 'success', 'If that email has an admin account, a password reset link is on its way.');
    });

    logoutBtn.addEventListener('click', () => auth.signOut());

    let unsubscribe = null;

    auth.onAuthStateChanged((user) => {
        if (user) {
            loginView.hidden = true;
            dashView.hidden = false;
            logoutBtn.hidden = false;
            emailLabel.textContent = user.email;
            startListening();
        } else {
            if (unsubscribe) { unsubscribe(); unsubscribe = null; }
            loginView.hidden = false;
            dashView.hidden = true;
            logoutBtn.hidden = true;
            emailLabel.textContent = '';
            resetForm();
        }
    });


    /* --------------------------- LIST OF PRODUCTS -------------------------- */
    let products = [];

    function startListening() {
        if (unsubscribe) return;
        clearStatus(dashStatus);
        unsubscribe = db.collection(COLLECTION).orderBy('createdAt', 'desc').onSnapshot(
            (snap) => {
                products = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                renderList();
            },
            (err) => {
                setStatus(dashStatus, 'error', friendlyError(err));
            }
        );
    }

    function renderList() {
        rows.textContent = '';
        totalEl.textContent = String(products.length);
        table.hidden = products.length === 0;
        emptyState.hidden = products.length > 0;

        products.forEach((p) => {
            const tr = document.createElement('tr');
            if (!p.active) tr.className = 'is-hidden-product';

            const picCell = document.createElement('td');
            const img = document.createElement('img');
            img.className = 'admin-thumb' + (p.isPhoto ? ' is-photo' : '');
            img.src = p.thumb || p.image || '';
            img.alt = '';
            img.loading = 'lazy';
            picCell.append(img);

            const nameCell = document.createElement('td');
            nameCell.textContent = p.name;
            nameCell.style.fontWeight = '700';

            const priceCell = document.createElement('td');
            priceCell.textContent = naira(p.price || 0);

            const catCell = document.createElement('td');
            catCell.textContent = categoryLabel(p.category);

            const statusCell = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'badge ' + (p.active ? 'badge-on' : 'badge-off');
            badge.textContent = p.active ? 'Showing' : 'Hidden';
            statusCell.append(badge);

            const actionCell = document.createElement('td');
            const actions = document.createElement('div');
            actions.className = 'row-actions';
            actions.append(
                makeButton('Edit', () => startEdit(p)),
                makeButton(p.active ? 'Hide' : 'Show', () => toggleActive(p)),
                makeButton('Delete', () => deleteProduct(p), 'danger')
            );
            actionCell.append(actions);

            tr.append(picCell, nameCell, priceCell, catCell, statusCell, actionCell);
            rows.append(tr);
        });
    }

    function makeButton(label, onClick, extraClass) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        if (extraClass) b.className = extraClass;
        b.addEventListener('click', onClick);
        return b;
    }

    async function toggleActive(p) {
        try {
            await db.collection(COLLECTION).doc(p.id).update({
                active: !p.active,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        } catch (err) {
            setStatus(dashStatus, 'error', friendlyError(err));
        }
    }

    async function deleteProduct(p) {
        if (!window.confirm(`Delete "${p.name}"? This cannot be undone.\n\n(Tip: use Hide instead if you may sell it again.)`)) return;
        try {
            await db.collection(COLLECTION).doc(p.id).delete();
            if (editingId === p.id) resetForm();
        } catch (err) {
            setStatus(dashStatus, 'error', friendlyError(err));
        }
    }

    $('#import-btn').addEventListener('click', async () => {
        if (!window.confirm('Import the original products from your old products.html into Firebase?')) return;
        const batch = db.batch();
        const base = Date.now();
        ORIGINAL_PRODUCTS.forEach((p, i) => {
            batch.set(db.collection(COLLECTION).doc(p.id), {
                name: p.name,
                price: p.price,
                category: p.category,
                image: p.image,
                thumb: p.image,
                isPhoto: Boolean(p.isPhoto),
                active: true,
                // Keeps the original order (first product = newest)
                createdAt: firebase.firestore.Timestamp.fromMillis(base - i * 1000),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        });
        try {
            await batch.commit();
            setStatus(dashStatus, 'success', `Imported ${ORIGINAL_PRODUCTS.length} products.`);
        } catch (err) {
            setStatus(dashStatus, 'error', friendlyError(err));
        }
    });


    /* ------------------------------ ADD / EDIT ----------------------------- */
    let editingId = null;
    let currentImage = null;   // { image, thumb } for the product being edited, or the new picture chosen
    let savedImage = null;     // the picture the product had before editing started

    CATEGORIES.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.key;
        opt.textContent = c.label;
        categorySelect.append(opt);
    });

    function showPreview() {
        if (currentImage && currentImage.image) {
            preview.src = currentImage.image;
            preview.hidden = false;
            previewPlaceholder.hidden = true;
        } else {
            preview.removeAttribute('src');
            preview.hidden = true;
            previewPlaceholder.hidden = false;
        }
        preview.classList.toggle('is-photo', photoCheck.checked);
    }
    photoCheck.addEventListener('change', showPreview);

    function fieldError(id, message) {
        const el = $(`#${id}`);
        el.textContent = message;
        el.closest('.field').classList.toggle('has-error', Boolean(message));
    }
    function clearFieldErrors() {
        ['p-name-error', 'p-price-error', 'p-category-error', 'p-image-error'].forEach((id) => fieldError(id, ''));
    }

    function resetForm() {
        editingId = null;
        currentImage = null;
        savedImage = null;
        form.reset();
        activeCheck.checked = true;
        formTitle.textContent = 'Add a product';
        saveBtn.textContent = 'Save product';
        cancelBtn.hidden = true;
        clearFieldErrors();
        showPreview();
    }

    cancelBtn.addEventListener('click', () => {
        resetForm();
        clearStatus(formStatus);
    });

    function startEdit(p) {
        editingId = p.id;
        savedImage = { image: p.image, thumb: p.thumb || p.image };
        currentImage = savedImage;
        nameInput.value = p.name || '';
        priceInput.value = p.price || '';
        categorySelect.value = p.category || '';
        photoCheck.checked = Boolean(p.isPhoto);
        activeCheck.checked = p.active !== false;
        fileInput.value = '';
        urlInput.value = '';
        formTitle.textContent = 'Edit product';
        saveBtn.textContent = 'Save changes';
        cancelBtn.hidden = false;
        clearFieldErrors();
        clearStatus(formStatus);
        showPreview();
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nameInput.focus({ preventScroll: true });
    }

    /* Shrinks a chosen picture so it's small enough to store in Firestore (1 MB
       limit per product). WebP keeps transparent backgrounds; Safari falls back to PNG. */
    function shrink(img, maxSide, quality, maxChars) {
        let side = maxSide;
        for (let attempt = 0; attempt < 6; attempt++) {
            const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

            let data = canvas.toDataURL('image/webp', quality);
            if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/png');
            if (data.length <= maxChars) return data;
            side = Math.round(side * 0.75);
        }
        throw new Error('That picture is too large to store. Please choose a smaller one.');
    }

    function processFile(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Please choose an image file (JPG, PNG or WebP).'));
                return;
            }
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                try {
                    resolve({
                        image: shrink(img, 800, 0.82, 700000),
                        thumb: shrink(img, 160, 0.8, 40000),
                    });
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('That file could not be read as a picture.'));
            };
            img.src = url;
        });
    }

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        fieldError('p-image-error', '');
        if (!file) return;
        try {
            currentImage = await processFile(file);
            urlInput.value = '';
            showPreview();
        } catch (err) {
            fileInput.value = '';
            fieldError('p-image-error', err.message);
        }
    });

    urlInput.addEventListener('input', () => {
        const value = urlInput.value.trim();
        fieldError('p-image-error', '');
        if (value) {
            fileInput.value = '';
            currentImage = { image: value, thumb: value };
        } else {
            currentImage = editingId ? savedImage : null;
        }
        showPreview();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors();
        clearStatus(formStatus);

        const name = nameInput.value.trim();
        const price = Number(priceInput.value);
        const category = categorySelect.value;
        let ok = true;

        if (name.length < 2) { fieldError('p-name-error', 'Please enter the product name.'); ok = false; }
        if (!Number.isFinite(price) || price <= 0) { fieldError('p-price-error', 'Please enter a price greater than 0.'); ok = false; }
        if (!category) { fieldError('p-category-error', 'Please choose a category.'); ok = false; }
        if (!currentImage || !currentImage.image) { fieldError('p-image-error', 'Please add a picture.'); ok = false; }
        if (!ok) return;

        const data = {
            name,
            price: Math.round(price),
            category,
            image: currentImage.image,
            thumb: currentImage.thumb || currentImage.image,
            isPhoto: photoCheck.checked,
            active: activeCheck.checked,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        saveBtn.disabled = true;
        try {
            if (editingId) {
                await db.collection(COLLECTION).doc(editingId).update(data);
                setStatus(formStatus, 'success', `Saved changes to "${name}".`);
            } else {
                await db.collection(COLLECTION).add({
                    ...data,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                setStatus(formStatus, 'success', `"${name}" has been added to your shop.`);
            }
            resetForm();
        } catch (err) {
            setStatus(formStatus, 'error', friendlyError(err));
        } finally {
            saveBtn.disabled = false;
        }
    });

    showPreview();
})();
