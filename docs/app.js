// ============================================================
// Μουντιάλ 2026 — Προβλέψεις (frontend)
// Firebase v10 modular SDK μέσω CDN — χωρίς build step.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ============================================================
// ⚠️ PASTE YOUR firebaseConfig HERE ⚠️
// Firebase Console -> Project settings -> Your apps -> Web app
// Αντικατέστησε ΟΛΟ το αντικείμενο παρακάτω με το δικό σου:
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDyui8-wJrZo1kv_O-bOMP8wqtMupPt7qI",
  authDomain: "world-cup-predictions-2026-1.firebaseapp.com",
  projectId: "world-cup-predictions-2026-1",
  storageBucket: "world-cup-predictions-2026-1.firebasestorage.app",
  messagingSenderId: "463558998883",
  appId: "1:463558998883:web:2239a054323553a67b7156",
  measurementId: "G-CF3H7ZESHR"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ---------- Σημαίες & ελληνικά ονόματα ομάδων ----------
// Κλειδιά = ονόματα όπως έρχονται από το football-data.org.
// Fallback: ⚽ + αγγλικό όνομα.
const TEAMS = {
  "United States": { flag: "🇺🇸", gr: "ΗΠΑ" },
  "USA": { flag: "🇺🇸", gr: "ΗΠΑ" },
  "Mexico": { flag: "🇲🇽", gr: "Μεξικό" },
  "Canada": { flag: "🇨🇦", gr: "Καναδάς" },
  "Argentina": { flag: "🇦🇷", gr: "Αργεντινή" },
  "Brazil": { flag: "🇧🇷", gr: "Βραζιλία" },
  "Uruguay": { flag: "🇺🇾", gr: "Ουρουγουάη" },
  "Colombia": { flag: "🇨🇴", gr: "Κολομβία" },
  "Ecuador": { flag: "🇪🇨", gr: "Εκουαδόρ" },
  "Paraguay": { flag: "🇵🇾", gr: "Παραγουάη" },
  "Peru": { flag: "🇵🇪", gr: "Περού" },
  "Chile": { flag: "🇨🇱", gr: "Χιλή" },
  "Bolivia": { flag: "🇧🇴", gr: "Βολιβία" },
  "Venezuela": { flag: "🇻🇪", gr: "Βενεζουέλα" },
  "France": { flag: "🇫🇷", gr: "Γαλλία" },
  "England": { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", gr: "Αγγλία" },
  "Scotland": { flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", gr: "Σκωτία" },
  "Wales": { flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", gr: "Ουαλία" },
  "Spain": { flag: "🇪🇸", gr: "Ισπανία" },
  "Germany": { flag: "🇩🇪", gr: "Γερμανία" },
  "Portugal": { flag: "🇵🇹", gr: "Πορτογαλία" },
  "Netherlands": { flag: "🇳🇱", gr: "Ολλανδία" },
  "Belgium": { flag: "🇧🇪", gr: "Βέλγιο" },
  "Croatia": { flag: "🇭🇷", gr: "Κροατία" },
  "Italy": { flag: "🇮🇹", gr: "Ιταλία" },
  "Switzerland": { flag: "🇨🇭", gr: "Ελβετία" },
  "Austria": { flag: "🇦🇹", gr: "Αυστρία" },
  "Denmark": { flag: "🇩🇰", gr: "Δανία" },
  "Sweden": { flag: "🇸🇪", gr: "Σουηδία" },
  "Norway": { flag: "🇳🇴", gr: "Νορβηγία" },
  "Poland": { flag: "🇵🇱", gr: "Πολωνία" },
  "Ukraine": { flag: "🇺🇦", gr: "Ουκρανία" },
  "Czechia": { flag: "🇨🇿", gr: "Τσεχία" },
  "Czech Republic": { flag: "🇨🇿", gr: "Τσεχία" },
  "Turkey": { flag: "🇹🇷", gr: "Τουρκία" },
  "Türkiye": { flag: "🇹🇷", gr: "Τουρκία" },
  "Greece": { flag: "🇬🇷", gr: "Ελλάδα" },
  "Serbia": { flag: "🇷🇸", gr: "Σερβία" },
  "Hungary": { flag: "🇭🇺", gr: "Ουγγαρία" },
  "Romania": { flag: "🇷🇴", gr: "Ρουμανία" },
  "Slovakia": { flag: "🇸🇰", gr: "Σλοβακία" },
  "Slovenia": { flag: "🇸🇮", gr: "Σλοβενία" },
  "Albania": { flag: "🇦🇱", gr: "Αλβανία" },
  "Georgia": { flag: "🇬🇪", gr: "Γεωργία" },
  "North Macedonia": { flag: "🇲🇰", gr: "Β. Μακεδονία" },
  "Kosovo": { flag: "🇽🇰", gr: "Κόσοβο" },
  "Bosnia and Herzegovina": { flag: "🇧🇦", gr: "Βοσνία" },
  "Finland": { flag: "🇫🇮", gr: "Φινλανδία" },
  "Ireland": { flag: "🇮🇪", gr: "Ιρλανδία" },
  "Republic of Ireland": { flag: "🇮🇪", gr: "Ιρλανδία" },
  "Israel": { flag: "🇮🇱", gr: "Ισραήλ" },
  "Japan": { flag: "🇯🇵", gr: "Ιαπωνία" },
  "South Korea": { flag: "🇰🇷", gr: "Ν. Κορέα" },
  "Korea Republic": { flag: "🇰🇷", gr: "Ν. Κορέα" },
  "Australia": { flag: "🇦🇺", gr: "Αυστραλία" },
  "Iran": { flag: "🇮🇷", gr: "Ιράν" },
  "IR Iran": { flag: "🇮🇷", gr: "Ιράν" },
  "Saudi Arabia": { flag: "🇸🇦", gr: "Σ. Αραβία" },
  "Qatar": { flag: "🇶🇦", gr: "Κατάρ" },
  "Uzbekistan": { flag: "🇺🇿", gr: "Ουζμπεκιστάν" },
  "Jordan": { flag: "🇯🇴", gr: "Ιορδανία" },
  "Iraq": { flag: "🇮🇶", gr: "Ιράκ" },
  "United Arab Emirates": { flag: "🇦🇪", gr: "ΗΑΕ" },
  "Morocco": { flag: "🇲🇦", gr: "Μαρόκο" },
  "Senegal": { flag: "🇸🇳", gr: "Σενεγάλη" },
  "Tunisia": { flag: "🇹🇳", gr: "Τυνησία" },
  "Algeria": { flag: "🇩🇿", gr: "Αλγερία" },
  "Egypt": { flag: "🇪🇬", gr: "Αίγυπτος" },
  "Nigeria": { flag: "🇳🇬", gr: "Νιγηρία" },
  "Ghana": { flag: "🇬🇭", gr: "Γκάνα" },
  "Cameroon": { flag: "🇨🇲", gr: "Καμερούν" },
  "Ivory Coast": { flag: "🇨🇮", gr: "Ακτή Ελεφαντοστού" },
  "Côte d'Ivoire": { flag: "🇨🇮", gr: "Ακτή Ελεφαντοστού" },
  "South Africa": { flag: "🇿🇦", gr: "Ν. Αφρική" },
  "Cape Verde": { flag: "🇨🇻", gr: "Πράσινο Ακρωτήριο" },
  "Cape Verde Islands": { flag: "🇨🇻", gr: "Πράσινο Ακρωτήριο" },
  "DR Congo": { flag: "🇨🇩", gr: "ΛΔ Κονγκό" },
  "Congo DR": { flag: "🇨🇩", gr: "ΛΔ Κονγκό" },
  "Panama": { flag: "🇵🇦", gr: "Παναμάς" },
  "Costa Rica": { flag: "🇨🇷", gr: "Κόστα Ρίκα" },
  "Honduras": { flag: "🇭🇳", gr: "Ονδούρα" },
  "Jamaica": { flag: "🇯🇲", gr: "Τζαμάικα" },
  "Curaçao": { flag: "🇨🇼", gr: "Κουρασάο" },
  "Curacao": { flag: "🇨🇼", gr: "Κουρασάο" },
  "Haiti": { flag: "🇭🇹", gr: "Αϊτή" },
  "New Zealand": { flag: "🇳🇿", gr: "Ν. Ζηλανδία" },
};

function teamInfo(name) {
  const t = TEAMS[name];
  return { flag: t ? t.flag : "⚽", name: t ? t.gr : name };
}

// ---------- State ----------
let currentUser = null;
let matches = []; // [{id, ...data}]
let myPredictions = {}; // matchId -> prediction data

// ---------- DOM helpers ----------
const $ = (sel) => document.querySelector(sel);

function showToast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  $("#toast-container").appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 450);
  }, 3200);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`#tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "leaderboard") loadLeaderboard();
  });
});

// ---------- Auth ----------
$("#login-btn").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error(err);
    showToast("Η σύνδεση απέτυχε. Δοκίμασε ξανά.", "error");
  }
});

$("#logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  showToast("Αποσυνδέθηκες. Τα λέμε! 👋", "info");
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  const loggedIn = !!user;
  $("#login-btn").hidden = loggedIn;
  $("#user-chip").hidden = !loggedIn;
  $("#login-hint").hidden = loggedIn;

  if (loggedIn) {
    $("#user-avatar").src = user.photoURL || "";
    $("#user-name").textContent = user.displayName || "Παίκτης";
    await ensureUserDoc(user);
    await loadMyPredictions();
  } else {
    myPredictions = {};
  }
  renderMatches();
});

// Δημιουργεί/ενημερώνει το users/{uid}. Το totalPoints το γράφει ΜΟΝΟ
// στη δημιουργία (=0) — μετά το διαχειρίζεται αποκλειστικά το sync script.
async function ensureUserDoc(user) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: user.displayName || "Παίκτης",
        photoURL: user.photoURL || "",
        totalPoints: 0,
      });
    } else if (
      snap.data().displayName !== user.displayName ||
      snap.data().photoURL !== user.photoURL
    ) {
      await setDoc(
        ref,
        { displayName: user.displayName || "Παίκτης", photoURL: user.photoURL || "" },
        { merge: true }
      );
    }
  } catch (err) {
    console.error("ensureUserDoc:", err);
  }
}

// ---------- Φόρτωση δεδομένων ----------
async function loadMatches() {
  try {
    const snap = await getDocs(query(collection(db, "matches"), orderBy("utcDate", "asc")));
    const now = Date.now();
    const horizon = now + 3 * 24 * 3600 * 1000;
    matches = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      // κρατάμε το παράθυρο: από χθες (για live/πρόσφατα τελικά) έως +3 μέρες
      .filter((m) => {
        const t = m.utcDate?.toDate?.()?.getTime() ?? 0;
        return t > now - 36 * 3600 * 1000 && t < horizon;
      });
  } catch (err) {
    console.error(err);
    showToast("Σφάλμα φόρτωσης αγώνων.", "error");
    matches = [];
  }
  renderMatches();
}

async function loadMyPredictions() {
  if (!currentUser) return;
  try {
    const snap = await getDocs(
      query(collection(db, "predictions"), where("userId", "==", currentUser.uid))
    );
    myPredictions = {};
    snap.docs.forEach((d) => {
      myPredictions[d.data().matchId] = d.data();
    });
  } catch (err) {
    console.error("loadMyPredictions:", err);
  }
}

// ---------- Rendering ματς ----------
const STATUS_LABELS = {
  IN_PLAY: "🔴 Σε εξέλιξη",
  PAUSED: "⏸️ Ημίχρονο",
  FINISHED: "✅ Τελικό",
  SUSPENDED: "⚠️ Διεκόπη",
  POSTPONED: "📅 Αναβλήθηκε",
  CANCELLED: "❌ Ακυρώθηκε",
};

function isLocked(m) {
  const kickoff = m.utcDate?.toDate?.() ?? new Date(0);
  return kickoff.getTime() <= Date.now() || !["SCHEDULED", "TIMED"].includes(m.status);
}

function dayKey(date) {
  return new Intl.DateTimeFormat("el-GR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function renderMatches() {
  const list = $("#matches-list");
  if (!matches.length) {
    list.innerHTML = `<div class="empty-state glass">
      <span class="big">📭</span>
      Δεν υπάρχουν αγώνες στις επόμενες ημέρες.<br>
      Πέρνα ξανά αργότερα!
    </div>`;
    return;
  }

  list.innerHTML = "";
  let lastDay = "";
  for (const m of matches) {
    const day = dayKey(m.utcDate.toDate());
    if (day !== lastDay) {
      const h = document.createElement("div");
      h.className = "day-heading";
      h.textContent = `📅 ${day}`;
      list.appendChild(h);
      lastDay = day;
    }
    list.appendChild(buildMatchCard(m));
  }
}

function buildMatchCard(m) {
  const locked = isLocked(m);
  const pred = myPredictions[m.id];
  const home = teamInfo(m.homeTeam);
  const away = teamInfo(m.awayTeam);
  const kickoff = m.utcDate.toDate();
  const timeStr = new Intl.DateTimeFormat("el-GR", { hour: "2-digit", minute: "2-digit" }).format(kickoff);

  const card = document.createElement("div");
  card.className = `match-card ${locked ? "locked" : ""}`;

  const statusLabel = STATUS_LABELS[m.status] || `🕒 ${timeStr}`;
  const statusClass =
    m.status === "IN_PLAY" || m.status === "PAUSED" ? "live" :
    m.status === "FINISHED" ? "finished" : locked ? "lockedtxt" : "";

  const hasScore = m.ftHome !== null && m.ftHome !== undefined;
  const scoreHtml = hasScore
    ? `<div class="match-score">${m.ftHome} - ${m.ftAway}
         ${m.htHome !== null && m.htHome !== undefined ? `<small>ημχ. ${m.htHome}-${m.htAway}</small>` : ""}
       </div>`
    : `<div class="match-score">VS<small>${timeStr}</small></div>`;

  card.innerHTML = `
    <div class="match-top">
      <span>Μουντιάλ 2026</span>
      <span class="match-status ${statusClass}">${statusLabel}</span>
    </div>
    <div class="match-teams">
      <div class="team"><span class="flag">${home.flag}</span><span class="name">${escapeHtml(home.name)}</span></div>
      ${scoreHtml}
      <div class="team"><span class="flag">${away.flag}</span><span class="name">${escapeHtml(away.name)}</span></div>
    </div>
    <div class="pred-form">
      <div class="pred-row">
        <span class="pred-label">⏱️ Ημίχρονο</span>
        <div class="pick-group" data-kind="ht">
          <button class="pick-btn" data-val="1">1</button>
          <button class="pick-btn" data-val="X">X</button>
          <button class="pick-btn" data-val="2">2</button>
        </div>
      </div>
      <div class="pred-row">
        <span class="pred-label">🏁 Τελικό</span>
        <div class="pick-group" data-kind="ft">
          <button class="pick-btn" data-val="1">1</button>
          <button class="pick-btn" data-val="X">X</button>
          <button class="pick-btn" data-val="2">2</button>
        </div>
      </div>
      <div class="pred-row">
        <span class="pred-label">🎯 Ακριβές σκορ</span>
        <div class="score-inputs">
          <input type="number" min="0" max="20" inputmode="numeric" data-kind="scoreHome" placeholder="0" />
          <span class="dash">—</span>
          <input type="number" min="0" max="20" inputmode="numeric" data-kind="scoreAway" placeholder="0" />
        </div>
      </div>
    </div>
  `;

  // Προ-συμπλήρωση υπάρχουσας πρόβλεψης
  if (pred) {
    card.querySelectorAll(`[data-kind="ht"] .pick-btn`).forEach((b) =>
      b.classList.toggle("selected", b.dataset.val === pred.htPick));
    card.querySelectorAll(`[data-kind="ft"] .pick-btn`).forEach((b) =>
      b.classList.toggle("selected", b.dataset.val === pred.ftPick));
    card.querySelector(`[data-kind="scoreHome"]`).value = pred.scoreHome;
    card.querySelector(`[data-kind="scoreAway"]`).value = pred.scoreAway;
  }

  const form = card.querySelector(".pred-form");

  if (locked) {
    // Κλείδωμα όλων των inputs
    form.querySelectorAll("button, input").forEach((el) => (el.disabled = true));
    const banner = document.createElement("div");
    if (pred && typeof pred.points === "number") {
      banner.className = "points-badge";
      banner.textContent = `🏅 Πήρες ${pred.points} ${pred.points === 1 ? "πόντο" : "πόντους"}!`;
    } else {
      banner.className = "locked-banner";
      banner.textContent = pred ? "🔒 Κλειδωμένο — η πρόβλεψή σου μετράει!" : "🔒 Κλειδωμένο";
    }
    form.appendChild(banner);
  } else {
    // Επιλογή 1/Χ/2 (toggle ανά ομάδα κουμπιών)
    form.querySelectorAll(".pick-group").forEach((group) => {
      group.querySelectorAll(".pick-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          group.querySelectorAll(".pick-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
        });
      });
    });

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-save";
    saveBtn.textContent = pred ? "💾 Ενημέρωση πρόβλεψης" : "💾 Αποθήκευση πρόβλεψης";
    saveBtn.addEventListener("click", () => savePrediction(m, card, saveBtn));
    form.appendChild(saveBtn);
  }

  return card;
}

// ---------- Αποθήκευση πρόβλεψης ----------
async function savePrediction(m, card, saveBtn) {
  if (!currentUser) {
    showToast("Συνδέσου πρώτα με Google για να παίξεις!", "error");
    return;
  }
  if (isLocked(m)) {
    showToast("Το ματς έχει ξεκινήσει — κλειδωμένο! 🔒", "error");
    return;
  }

  const htPick = card.querySelector(`[data-kind="ht"] .pick-btn.selected`)?.dataset.val;
  const ftPick = card.querySelector(`[data-kind="ft"] .pick-btn.selected`)?.dataset.val;
  const shRaw = card.querySelector(`[data-kind="scoreHome"]`).value;
  const saRaw = card.querySelector(`[data-kind="scoreAway"]`).value;
  const scoreHome = parseInt(shRaw, 10);
  const scoreAway = parseInt(saRaw, 10);

  if (!htPick || !ftPick) {
    showToast("Διάλεξε 1/Χ/2 για ημίχρονο ΚΑΙ τελικό.", "error");
    return;
  }
  if (
    shRaw === "" || saRaw === "" ||
    !Number.isInteger(scoreHome) || !Number.isInteger(scoreAway) ||
    scoreHome < 0 || scoreAway < 0 || scoreHome > 20 || scoreAway > 20
  ) {
    showToast("Βάλε έγκυρο σκορ (0–20).", "error");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "⏳ Αποθήκευση…";
  try {
    const existing = myPredictions[m.id];
    await setDoc(doc(db, "predictions", `${currentUser.uid}_${m.id}`), {
      userId: currentUser.uid,
      matchId: m.id,
      htPick,
      ftPick,
      scoreHome,
      scoreAway,
      // Το points ΔΕΝ το ορίζει ποτέ ο χρήστης — μένει null μέχρι το scoring.
      points: existing?.points ?? null,
      createdAt: existing?.createdAt ?? serverTimestamp(),
    });
    myPredictions[m.id] = { userId: currentUser.uid, matchId: m.id, htPick, ftPick, scoreHome, scoreAway, points: existing?.points ?? null };
    showToast("Η πρόβλεψη αποθηκεύτηκε! ⚽🎉", "success");
    saveBtn.textContent = "💾 Ενημέρωση πρόβλεψης";
  } catch (err) {
    console.error(err);
    showToast("Σφάλμα αποθήκευσης. Μήπως ξεκίνησε το ματς;", "error");
    saveBtn.textContent = "💾 Αποθήκευση πρόβλεψης";
  } finally {
    saveBtn.disabled = false;
  }
}

// ---------- Leaderboard ----------
async function loadLeaderboard() {
  const el = $("#leaderboard-list");
  el.innerHTML = `<div class="loader"><div class="spinner"></div>Φόρτωση βαθμολογίας…</div>`;
  try {
    const snap = await getDocs(
      query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(100))
    );
    if (snap.empty) {
      el.innerHTML = `<div class="empty-state glass"><span class="big">🏆</span>
        Κανείς δεν έχει παίξει ακόμα. Γίνε ο πρώτος!</div>`;
      return;
    }
    const medals = ["🥇", "🥈", "🥉"];
    el.innerHTML = "";
    snap.docs.forEach((d, i) => {
      const u = d.data();
      const row = document.createElement("div");
      row.className = `lb-row ${currentUser && d.id === currentUser.uid ? "me" : ""}`;
      row.style.animationDelay = `${Math.min(i * 0.05, 0.8)}s`;
      row.innerHTML = `
        <span class="lb-rank">${medals[i] || i + 1}</span>
        <img class="avatar" src="${escapeHtml(u.photoURL || "")}" alt="" referrerpolicy="no-referrer"
             onerror="this.style.visibility='hidden'" />
        <span class="lb-name">${escapeHtml(u.displayName || "Παίκτης")}</span>
        <span class="lb-points">${u.totalPoints ?? 0} <small>πόντοι</small></span>
      `;
      el.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="empty-state glass"><span class="big">😵</span>Σφάλμα φόρτωσης βαθμολογίας.</div>`;
  }
}

// ---------- Εκκίνηση ----------
loadMatches();
// Ανανέωση κατάστασης κλειδώματος κάθε λεπτό (χωρίς νέο read στο Firestore)
setInterval(renderMatches, 60 * 1000);
