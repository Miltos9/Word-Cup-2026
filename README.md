# ⚽ Μουντιάλ 2026 — Fun Προβλέψεις

Ένα 100% **δωρεάν** web app (χωρίς πιστωτική κάρτα πουθενά) για προβλέψεις στους αγώνες του Παγκοσμίου Κυπέλλου 2026 με την παρέα σου.

## Αρχιτεκτονική

| Κομμάτι | Τεχνολογία | Κόστος |
|---|---|---|
| Frontend | Στατικό HTML/CSS/JS σε **GitHub Pages** | Δωρεάν |
| Auth | **Firebase Authentication** (Google sign-in) | Δωρεάν (Spark) |
| Database | **Cloud Firestore** | Δωρεάν (Spark) |
| Backend job | **GitHub Actions** cron κάθε 30' → `scripts/sync.js` | Δωρεάν (public repo) |
| Δεδομένα αγώνων | **football-data.org** v4 API | Δωρεάν tier |

> ⚠️ ΔΕΝ χρησιμοποιούνται Cloud Functions ή Cloud Storage (θα απαιτούσαν Blaze plan/κάρτα). Τη δουλειά του "backend" την κάνει το GitHub Actions με το firebase-admin SDK.

## Δομή φακέλων

```
docs/                      # Το frontend (GitHub Pages σερβίρει από εδώ)
  index.html
  styles.css
  app.js                   # <-- εδώ κολλάς το firebaseConfig
scripts/sync.js            # Node script: fetch ματς + βαθμολόγηση
.github/workflows/sync.yml # Cron κάθε 30 λεπτά
firestore.rules            # Security rules για το Firestore
package.json               # Dependency: firebase-admin
```

## Πόντοι

- ✅ Σωστό σημείο **τελικού** (1/Χ/2): **+1**
- ⏱️ Σωστό σημείο **ημιχρόνου** (1/Χ/2): **+2**
- 🎯 **Ακριβές σκορ** τελικού: **+3**
- Αθροίζονται (μέγιστο **6** ανά ματς). Οι προβλέψεις κλειδώνουν στη σέντρα.

---

# 🚀 Setup βήμα-βήμα

## Βήμα 1 — GitHub repository

1. Φτιάξε ένα **public** repo στο GitHub (π.χ. `wc2026-predictions`). Public = απεριόριστα δωρεάν λεπτά Actions και δωρεάν Pages.
2. Ανέβασε όλα τα αρχεία αυτού του φακέλου:

```bash
git init
git add .
git commit -m "World Cup 2026 predictions app"
git branch -M main
git remote add origin https://github.com/<USERNAME>/wc2026-predictions.git
git push -u origin main
```

## Βήμα 2 — Firebase project

1. Πήγαινε στο [Firebase Console](https://console.firebase.google.com/) → **Add project**. Δώσε όνομα (π.χ. `wc2026-predictions`). Το Google Analytics μπορείς να το απενεργοποιήσεις.
2. Μέσα στο project: πάτα το εικονίδιο **Web** (`</>`) για να προσθέσεις Web app. Δώσε ένα nickname, **ΜΗΝ** τσεκάρεις το Hosting.
3. Θα σου εμφανίσει το **`firebaseConfig`** — ένα αντικείμενο σαν αυτό:

```js
const firebaseConfig = {
  apiKey: "AIza....",
  authDomain: "wc2026-xxxxx.firebaseapp.com",
  projectId: "wc2026-xxxxx",
  storageBucket: "wc2026-xxxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

4. **Άνοιξε το `docs/app.js`** και αντικατέστησε το placeholder αντικείμενο κάτω από το σχόλιο `PASTE YOUR firebaseConfig HERE` με το δικό σου. Commit & push.

> ℹ️ Το `apiKey` του Firebase web config ΔΕΝ είναι μυστικό — είναι public identifier. Η ασφάλεια έρχεται από τα security rules.

## Βήμα 3 — Ενεργοποίηση Google Sign-in

1. Firebase Console → **Build → Authentication → Get started**.
2. Tab **Sign-in method** → **Google** → Enable → διάλεξε support email → Save.
3. Tab **Settings → Authorized domains** → **Add domain** → πρόσθεσε το domain του GitHub Pages σου:
   `<USERNAME>.github.io`
   (Χωρίς αυτό, το popup σύνδεσης θα αποτυγχάνει με `auth/unauthorized-domain`.)

## Βήμα 4 — Δημιουργία Firestore

1. Firebase Console → **Build → Firestore Database → Create database**.
2. Διάλεξε location (π.χ. `eur3 (europe-west)`) και **Production mode** → Create.

## Βήμα 5 — Deploy των security rules

**Τρόπος Α (πιο εύκολος — μέσω Console):**
1. Firestore Database → tab **Rules**.
2. Σβήσε ό,τι υπάρχει, κάνε paste **όλο** το περιεχόμενο του αρχείου `firestore.rules` → **Publish**.

**Τρόπος Β (μέσω Firebase CLI):**
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # διάλεξε το project σου, δέξου το υπάρχον firestore.rules
firebase deploy --only firestore:rules
```

## Βήμα 6 — API key από football-data.org

1. Πήγαινε στο [football-data.org](https://www.football-data.org/client/register) και κάνε δωρεάν εγγραφή.
2. Θα λάβεις με email το **API token**. Το δωρεάν tier καλύπτει το World Cup (κωδικός διοργάνωσης `WC`) με 10 requests/λεπτό — το script κάνει 1 request ανά 30 λεπτά, άρα είμαστε άνετα.

## Βήμα 7 — Firebase Service Account (για το sync script)

1. Firebase Console → ⚙️ **Project settings → Service accounts**.
2. Πάτα **Generate new private key** → κατεβαίνει ένα JSON αρχείο.
3. Άνοιξέ το με ένα text editor και αντίγραψε **ΟΛΟ** το περιεχόμενό του (από το `{` έως το `}`).

> 🔒 ΠΡΟΣΟΧΗ: Αυτό το JSON είναι ΑΠΟΛΥΤΑ μυστικό — δίνει πλήρη πρόσβαση στη βάση. ΜΗΝ το κάνεις ποτέ commit (το `.gitignore` ήδη το μπλοκάρει). Μπαίνει ΜΟΝΟ ως GitHub Secret.

## Βήμα 8 — GitHub Secrets

Στο repo σου: **Settings → Secrets and variables → Actions → New repository secret**. Φτιάξε **δύο** secrets:

| Name | Value |
|---|---|
| `FOOTBALL_API_KEY` | Το token από το football-data.org (Βήμα 6) |
| `FIREBASE_SERVICE_ACCOUNT` | Ολόκληρο το JSON του service account (Βήμα 7), όπως είναι, multiline |

## Βήμα 9 — Ενεργοποίηση GitHub Pages

1. Repo → **Settings → Pages**.
2. **Source**: `Deploy from a branch`.
3. **Branch**: `main`, **Folder**: `/docs` → Save.
4. Σε 1-2 λεπτά το app θα είναι live στο: `https://<USERNAME>.github.io/wc2026-predictions/`

## Βήμα 10 — Πρώτο γέμισμα της βάσης (χειροκίνητο τρέξιμο)

Το cron τρέχει μόνο του κάθε 30', αλλά για να γεμίσει η βάση ΤΩΡΑ:

1. Repo → tab **Actions**.
2. Αριστερά διάλεξε **"Sync World Cup matches & scoring"**.
3. Πάτα **Run workflow → Run workflow** (πράσινο κουμπί).
4. Όταν πρασινίσει το run, τα ματς υπάρχουν στο Firestore και εμφανίζονται στο app. ✅

> ℹ️ Αν το run αποτύχει, άνοιξέ το και δες τα logs — συνήθως φταίει λάθος copy-paste σε κάποιο secret.

---

## 🔄 Πώς δουλεύει το sync

Κάθε 30 λεπτά το `scripts/sync.js`:

1. Ζητάει από το football-data.org τα ματς του WC από **χθες έως +2 μέρες** (το "χθες" πιάνει ματς που τελείωσαν μετά τα μεσάνυχτα UTC) και κάνει upsert στη συλλογή `matches`.
2. Για κάθε ματς με `status=FINISHED` και `scored=false`:
   - Διαβάζει όλες τις προβλέψεις του ματς και υπολογίζει πόντους (1/2/3 όπως παραπάνω).
   - Γράφει `points` σε κάθε πρόβλεψη και κάνει **atomic increment** στο `users.totalPoints`.
   - Στο τέλος βάζει `scored=true`.
   - Είναι **idempotent**: προβλέψεις που έχουν ήδη `points != null` παραλείπονται, οπότε ακόμα κι αν το script κρασάρει στη μέση και ξανατρέξει, κανείς δεν διπλομετριέται.

## 🔐 Ασφάλεια (firestore.rules)

- `matches`: read για όλους, write **μόνο** από το service account (το admin SDK παρακάμπτει τα rules).
- `users`: read για όλους (leaderboard). Ο χρήστης γράφει μόνο το δικό του `displayName`/`photoURL` — **ποτέ** το `totalPoints` — και μόνο αν είναι στο allowlist.
- `predictions`: read για συνδεδεμένους χρήστες. Write μόνο στη δική σου πρόβλεψη (`uid_matchId`), μόνο αν είσαι στο **allowlist**, **μόνο** όσο `matches.utcDate > τώρα` (server-side έλεγχος — δεν κλειδώνει απλώς το UI), και το πεδίο `points` δεν αλλάζει ποτέ από client.
- `allowlist`: read για συνδεδεμένους, **κανένα** write από client — το διαχειρίζεσαι μόνο εσύ από το Console (δες παρακάτω).

## 🔑 Πώς δίνω πρόσβαση σε παίκτη (allowlist)

Το app έχει access control με βάση το email: όποιος συνδεθεί με Google βλέπει κανονικά ματς και βαθμολογία, αλλά για να **αποθηκεύσει προβλέψεις** πρέπει το email του να υπάρχει στο collection `allowlist`. Αν δεν υπάρχει, το app του δείχνει μήνυμα με το email του και κουμπί αντιγραφής, για να σου το στείλει.

**Βήματα (Firebase Console):**

1. Firebase Console → **Build → Firestore Database** → tab **Data**.
2. Πάτα **Start collection** (ή **Add collection** αν υπάρχουν ήδη) και δώσε Collection ID: `allowlist` (ακριβώς έτσι, με μικρά).
3. Στο **Document ID** βάλε το email του παίκτη **σε lowercase**, π.χ. `giorgos@gmail.com`.
   ⚠️ ΟΧΙ κεφαλαία και χωρίς κενά — πρέπει να ταιριάζει ακριβώς με το email του Google λογαριασμού.
4. Το Console απαιτεί τουλάχιστον ένα πεδίο: πρόσθεσε π.χ. field `addedAt` (type: string) με τιμή την ημερομηνία. Το περιεχόμενο δεν έχει σημασία — μετράει μόνο ότι το doc **υπάρχει**.
5. **Save**. Από την επόμενη στιγμή ο παίκτης μπορεί να αποθηκεύει προβλέψεις (αν είναι ήδη μέσα στο app, αρκεί ένα refresh).

Για νέους παίκτες: επαναλαμβάνεις τα βήματα 3-5 με **Add document** μέσα στο `allowlist`. Για να κόψεις πρόσβαση, διαγράφεις το αντίστοιχο document.

> 💡 Μην ξεχάσεις να προσθέσεις και το **δικό σου** email στο allowlist — αλλιώς ούτε εσύ θα μπορείς να παίξεις! Σημ.: τα rules απαιτούν και `email_verified` — με Google sign-in αυτό είναι πάντα αληθές, οπότε δεν χρειάζεται καμία ενέργεια.

## 🧪 Τοπικό τρέξιμο του sync (προαιρετικό)

```bash
npm install
# PowerShell:
$env:FOOTBALL_API_KEY = "το_token_σου"
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content serviceAccountKey.json -Raw
node scripts/sync.js
```

## ❓ Troubleshooting

| Πρόβλημα | Λύση |
|---|---|
| `auth/unauthorized-domain` στη σύνδεση | Πρόσθεσε `<USERNAME>.github.io` στα Authorized domains (Βήμα 3) |
| "Σφάλμα αποθήκευσης" στο app | Έλεγξε ότι έγινε publish το `firestore.rules` (Βήμα 5) και ότι το ματς δεν έχει ξεκινήσει |
| Κουμπί "🔑 Χωρίς πρόσβαση ακόμα" | Το email του χρήστη δεν είναι στο `allowlist` — δες την ενότητα "Πώς δίνω πρόσβαση σε παίκτη" |
| Δεν φαίνονται ματς | Τρέξε χειροκίνητα το workflow (Βήμα 10) και δες τα logs του |
| Workflow κόκκινο: `Λείπουν τα env vars` | Έλεγξε ονόματα/τιμές των δύο secrets (Βήμα 8) |
| Το cron δεν τρέχει ακριβώς κάθε 30' | Φυσιολογικό — το GitHub μπορεί να καθυστερεί τα scheduled runs σε ώρες αιχμής |
| Το cron σταμάτησε μετά από καιρό | Σε repos χωρίς δραστηριότητα 60 ημερών το GitHub απενεργοποιεί τα scheduled workflows — πάτα "Enable" στο Actions tab |

Καλή διασκέδαση και καλές προβλέψεις! 🏆🎉
