# Malodac Ventures: Firebase + Admin Dashboard Setup Guide

After this setup you will add, edit, hide and delete products from **admin.html**
(login with email + password) and the **Products page updates itself**. No more editing HTML.

## Files in this package

| File | What to do |
|---|---|
| `firebase-config.js` | NEW. Paste your Firebase details into it. |
| `admin.html`, `admin.css`, `admin.js` | NEW. The admin dashboard. |
| `products.html` | REPLACE your old one (hardcoded products removed). |
| `script.js` | REPLACE your old one (only the Products section changed). |
| `firestore.rules` | NOT uploaded to your site. You paste it into the Firebase console (Step 5). |

All other files (`style.css`, `index.html`, etc.) stay as they are. Put the new files in the same folder as your other pages.

---

## Step 1: Create a Firebase project

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Create a project**, name it (e.g. `malodac-ventures`), click through the prompts. Google Analytics is not needed.

## Step 2: Connect your website to it

1. In your project, click the **Web icon `</>`** ("Add app" / "Web").
2. Give it a nickname (e.g. `malodac-website`). Do **not** tick "Firebase Hosting". Click **Register app**.
3. Firebase shows a `firebaseConfig = { apiKey: ..., authDomain: ..., ... }` block.
4. Open **`firebase-config.js`** and copy each value over the matching `PASTE_...` line.

These values are not secrets. Your data is protected by the rules in Step 5.

## Step 3: Turn on email/password login

1. Left menu: **Build > Authentication > Get started**.
2. **Sign-in method** tab > **Email/Password** > switch **Enable** on > **Save**.
3. **Users** tab > **Add user**. Enter *your* email and a strong password. This is your admin login.
4. After it is created, **copy the "User UID"** shown in that row (a long code). You need it in Step 5.


## Step 4: Create the database

1. Left menu: **Build > Firestore Database > Create database**.
2. Choose a location close to you (a Europe region is nearest to Nigeria; this cannot be changed later).
3. Choose **Production mode** > **Create**.

## Step 5: Lock it so only YOU can change products

1. In Firestore, open the **Rules** tab.
2. Delete everything there and paste in the contents of **`firestore.rules`**.
3. Replace `PASTE_ADMIN_UID_HERE` with the UID you copied in Step 3.
4. Click **Publish**.

Now visitors can only *read* products that are switched on. Only your admin account can add, edit or delete.

## Step 6: Allow your domain to log in (after you go live)

**Authentication > Settings > Authorized domains > Add domain**. Add your real website domain (e.g. `malodac.com`). `localhost` is already allowed for testing.

## Step 7: Test it on your computer

Firebase login does **not** work when you double-click a file (`file://...`). Use a local server instead:

- In VS Code, install the **Live Server** extension, right-click `admin.html` > **Open with Live Server**.

Then:
1. Log in with the email and password from Step 3.
2. Click **Import my original products** to load the 16 products that were in your old `products.html`.
3. Open `products.html`; they should appear, and the cart and filters work as before.
4. Try **Add a product** with a picture, price and category. It appears on the Products page after a refresh.

## Step 8: Upload to your hosting

Upload the new/replaced files. Your admin page is at `yourdomain.com/admin.html`.
It is marked "noindex" so search engines skip it, and nobody can do anything on it without your login.

---

## Day-to-day use

- **Add:** fill name, price, category, pick a photo, **Save product**.
- **Edit:** click **Edit** on a row, change things, **Save changes**.
- **Out of stock / seasonal:** click **Hide**. It disappears from the shop but stays saved. Click **Show** to bring it back.
- **Delete:** removes it permanently.
- **New category** (e.g. "Pots"): add one line to `window.MALODAC_CATEGORIES` in `firebase-config.js`. The filter button and the admin dropdown update automatically.

## Good to know

- **Pictures** you upload are shrunk automatically (max 800px) and stored inside the product record. This works on Firebase's **free plan**. Firebase Storage, the usual place for pictures, now requires a paid (Blaze) plan for new projects. If you later get 100+ products, ask me to switch it to Storage or Cloudinary.
- Pictures that already live in your `images/` folder still work. Type the path (e.g. `images/malodacimage1.png`) in the "image link / file path" box.
- **Changing a price** only affects new carts. A visitor who already has the item in their cart keeps the old price until they remove it and add it again.
- **Customer sign-up** (the "Sign Up" button) is still the old browser-only demo and is separate from admin login. Customers cannot access the admin area, because the rules only allow your UID.
- **Gallery** and **home page categories** are still written in HTML. They can be moved to Firebase the same way if you want.
- If you forget your password, use **Forgot your password?** on the admin login.
