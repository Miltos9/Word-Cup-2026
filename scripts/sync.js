// ============================================================
// sync.js — Τρέχει από GitHub Actions κάθε 30'.
// 1) Φέρνει ματς του WC 2026 από το football-data.org και κάνει
//    upsert στη συλλογή matches.
// 2) Για κάθε FINISHED ματς που δεν έχει βαθμολογηθεί, υπολογίζει
//    πόντους για όλες τις προβλέψεις (idempotent).
//
// Απαιτούμενα env vars:
//   FIREBASE_SERVICE_ACCOUNT  -> ολόκληρο το JSON του service account
//   FOOTBALL_API_KEY          -> API key από football-data.org
// ============================================================

const admin = require("firebase-admin");

const { FIREBASE_SERVICE_ACCOUNT, FOOTBALL_API_KEY } = process.env;
if (!FIREBASE_SERVICE_ACCOUNT || !FOOTBALL_API_KEY) {
  console.error("Λείπουν τα env vars FIREBASE_SERVICE_ACCOUNT ή/και FOOTBALL_API_KEY.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)),
});
const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

const API_BASE = "https://api.football-data.org/v4";

function isoDate(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// 1/X/2 από ένα ζεύγος σκορ
function pickFromScore(home, away) {
  if (home > away) return "1";
  if (home < away) return "2";
  return "X";
}

// ------------------------------------------------------------
// Βήμα 1: Φέρε ματς και κάνε upsert στο matches
// ------------------------------------------------------------
async function fetchAndUpsertMatches() {
  // Παράθυρο: από ΧΘΕΣ (για να πιάσουμε ματς που τελείωσαν μετά τα
  // μεσάνυχτα UTC και θέλουν βαθμολόγηση) έως +2 μέρες.
  const from = new Date(Date.now() - 24 * 3600 * 1000);
  const to = new Date(Date.now() + 2 * 24 * 3600 * 1000);

  const url = `${API_BASE}/competitions/WC/matches?dateFrom=${isoDate(from)}&dateTo=${isoDate(to)}`;
  console.log(`Fetching: ${url}`);

  const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_KEY } });
  if (!res.ok) {
    throw new Error(`football-data.org error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const apiMatches = data.matches || [];
  console.log(`Βρέθηκαν ${apiMatches.length} ματς στο παράθυρο.`);
  if (!apiMatches.length) return;

  // Διαβάζουμε τα υπάρχοντα docs για να ΜΗΝ πατήσουμε το scored flag.
  const refs = apiMatches.map((m) => db.collection("matches").doc(String(m.id)));
  const existingSnaps = await db.getAll(...refs);
  const existsById = new Map(existingSnaps.map((s) => [s.id, s.exists]));

  const batch = db.batch();
  for (const m of apiMatches) {
    const ref = db.collection("matches").doc(String(m.id));
    const docData = {
      homeTeam: m.homeTeam?.name || "TBD",
      awayTeam: m.awayTeam?.name || "TBD",
      // Αποθηκεύεται ως Firestore Timestamp ώστε τα security rules να
      // μπορούν να συγκρίνουν με request.time (κλείδωμα μετά τη σέντρα).
      utcDate: Timestamp.fromDate(new Date(m.utcDate)),
      status: m.status,
      ftHome: m.score?.fullTime?.home ?? null,
      ftAway: m.score?.fullTime?.away ?? null,
      htHome: m.score?.halfTime?.home ?? null,
      htAway: m.score?.halfTime?.away ?? null,
    };
    // Το scored μπαίνει ΜΟΝΟ στη δημιουργία — δεν το ξαναγράφουμε ποτέ
    // εδώ, αλλιώς θα διπλομετρούσαμε πόντους.
    if (!existsById.get(String(m.id))) docData.scored = false;
    batch.set(ref, docData, { merge: true });
  }
  await batch.commit();
  console.log("Upsert ματς: OK");
}

// ------------------------------------------------------------
// Βήμα 2: Βαθμολόγηση τελειωμένων ματς (idempotent)
// ------------------------------------------------------------
function calcPoints(pred, match) {
  let points = 0;
  // Σημείο τελικού: +1
  if (pred.ftPick === pickFromScore(match.ftHome, match.ftAway)) points += 1;
  // Σημείο ημιχρόνου: +2 (μόνο αν υπάρχει σκορ ημιχρόνου)
  if (
    match.htHome !== null && match.htAway !== null &&
    pred.htPick === pickFromScore(match.htHome, match.htAway)
  ) points += 2;
  // Ακριβές σκορ τελικού: +3
  if (pred.scoreHome === match.ftHome && pred.scoreAway === match.ftAway) points += 3;
  return points; // max 6
}

async function scoreFinishedMatches() {
  const snap = await db
    .collection("matches")
    .where("status", "==", "FINISHED")
    .where("scored", "==", false)
    .get();

  if (snap.empty) {
    console.log("Δεν υπάρχουν ματς προς βαθμολόγηση.");
    return;
  }

  for (const matchDoc of snap.docs) {
    const match = matchDoc.data();
    const matchId = matchDoc.id;

    if (match.ftHome === null || match.ftAway === null) {
      console.log(`Ματς ${matchId}: FINISHED αλλά χωρίς σκορ — παράλειψη προς το παρόν.`);
      continue;
    }

    console.log(`Βαθμολόγηση: ${match.homeTeam} - ${match.awayTeam} (${match.ftHome}-${match.ftAway})`);

    const predsSnap = await db
      .collection("predictions")
      .where("matchId", "==", matchId)
      .get();

    // Γράφουμε σε batches (όριο 500 ops/batch). Idempotency σε 2 επίπεδα:
    //  α) όλο το ματς προστατεύεται από το scored flag,
    //  β) κάθε πρόβλεψη με points != null παραλείπεται, οπότε αν το script
    //     κρασάρει στη μέση και ξανατρέξει, δεν διπλομετράει κανέναν.
    let batch = db.batch();
    let ops = 0;
    const commitIfNeeded = async (force = false) => {
      if (ops >= 400 || (force && ops > 0)) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    };

    let scoredCount = 0;
    for (const predDoc of predsSnap.docs) {
      const pred = predDoc.data();
      if (pred.points !== null && pred.points !== undefined) continue; // ήδη μετρημένη

      const points = calcPoints(pred, match);
      batch.update(predDoc.ref, { points });
      // set+merge+increment: δουλεύει ακόμα κι αν λείπει το user doc.
      batch.set(
        db.collection("users").doc(pred.userId),
        { totalPoints: FieldValue.increment(points) },
        { merge: true }
      );
      ops += 2;
      scoredCount++;
      await commitIfNeeded();
    }
    await commitIfNeeded(true);

    // Το scored flag γράφεται ΤΕΛΕΥΤΑΙΟ, αφού μετρηθούν όλες οι προβλέψεις.
    await matchDoc.ref.update({ scored: true });
    console.log(`  -> ${scoredCount} προβλέψεις βαθμολογήθηκαν.`);
  }
}

// ------------------------------------------------------------
(async () => {
  try {
    await fetchAndUpsertMatches();
    await scoreFinishedMatches();
    console.log("Sync ολοκληρώθηκε. ✅");
    process.exit(0);
  } catch (err) {
    console.error("Sync απέτυχε:", err);
    process.exit(1);
  }
})();
