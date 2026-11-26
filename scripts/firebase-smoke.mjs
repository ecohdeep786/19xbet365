const base = "http://127.0.0.1:4000";
const firebaseKey = "AIzaSyDwOe2YCKvrhzuxwQnSD_XEF7g23_8iOf8";
const stamp = Date.now();
let cookie = "";
let firebaseUser = null;
let linkedUser = null;
let staffUser = null;

async function backend(path, options = {}, expected = 200) {
  const res = await fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) }
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  for (const c of res.headers.getSetCookie?.() || []) cookie = c.split(";")[0];
  if (res.status !== expected) throw new Error(`${path}: expected ${expected}, got ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function firebase(path, body) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${firebaseKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: res.status, body: await res.json() };
}

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass, detail });
  if (!pass) throw new Error(`${name}: ${detail}`);
}

try {
  const created = await firebase("accounts:signUp", {
    email: `firebase.qa.${stamp}@qa.19xbet365.com`,
    password: "Firebase#2026",
    returnSecureToken: true
  });
  firebaseUser = created.body;
  check("Firebase test identity created", created.status === 200 && Boolean(created.body.idToken), created.status);

  const secured = await backend("/api/auth/firebase", {
    method: "POST",
    body: JSON.stringify({ idToken: created.body.idToken, marketingOptIn: false })
  }, 201);
  check("Firebase identity creates a server player", secured.user?.email === created.body.email && secured.isNew === true, secured.user?.email);
  check("Welcome coin allocation applied", Number(secured.user.balance) === 10500, secured.user.balance);
  check("Account is marked Firebase-managed", secured.user.authProvider === "firebase" && secured.user.firebaseLinked === true, secured.user.authProvider);
  check("Unverified email is recorded", secured.user.emailVerified === false, secured.user.emailVerified);

  const me = await backend("/api/auth/me");
  check("Server session issued after Firebase exchange", me.user?.id === secured.user.id, me.user?.id);

  const deposit = await backend("/api/deposits", {
    method: "POST",
    body: JSON.stringify({ amount: 500, reference: `FIREBASE-QA-${stamp}` })
  }, 403);
  check("Unverified email blocks deposits", deposit.error === "email_verification_required", deposit.error);

  const returned = await backend("/api/auth/firebase", {
    method: "POST",
    body: JSON.stringify({ idToken: created.body.idToken })
  });
  check("Returning Firebase sign-in reuses the player", returned.user?.id === secured.user.id && returned.isNew === false, returned.user?.id);

  // Linking an existing legacy account requires a verified Firebase email.
  cookie = "";
  const existing = await backend("/api/auth/firebase", {
    method: "POST",
    body: JSON.stringify({ idToken: created.body.idToken })
  });
  check("Firebase session can be re-established", existing.user?.id === secured.user.id, existing.user?.id);

  const collision = await firebase("accounts:signUp", {
    email: "player@19xbet365.test",
    password: "Firebase#2026",
    returnSecureToken: true
  });
  if (collision.status === 200) {
    linkedUser = collision.body;
    cookie = "";
    const denied = await backend("/api/auth/firebase", {
      method: "POST",
      body: JSON.stringify({ idToken: collision.body.idToken })
    }, 403);
    check("Unverified email cannot take over an existing player", denied.error === "email_verification_required", denied.error);
  } else {
    check("Existing player email cannot be registered again in Firebase", collision.status === 400, collision.status);
  }

  const invalid = await backend("/api/auth/firebase", { method: "POST", body: JSON.stringify({ idToken: "not-a-real-token" }) }, 401);
  check("Invalid Firebase token is rejected", invalid.error === "invalid_firebase_token", invalid.error);

  const staff = await firebase("accounts:signUp", {
    email: "admin@19xbet365.test",
    password: "Firebase#2026",
    returnSecureToken: true
  });
  if (staff.status === 200) {
    staffUser = staff.body;
    cookie = "";
    const denied = await backend("/api/auth/firebase", {
      method: "POST",
      body: JSON.stringify({ idToken: staff.body.idToken })
    }, 403);
    check("Staff accounts cannot be auto-linked from Firebase", denied.error === "staff_firebase_link_forbidden", denied.error);
  } else {
    check("Staff Firebase test identity unavailable", false, JSON.stringify(staff.body));
  }

  console.log(JSON.stringify({ checks, pass: checks.every((item) => item.pass) }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ checks, pass: false, error: String(error) }, null, 2));
  process.exitCode = 1;
} finally {
  if (staffUser?.idToken) await firebase("accounts:delete", { idToken: staffUser.idToken });
  if (linkedUser?.idToken) await firebase("accounts:delete", { idToken: linkedUser.idToken });
  if (firebaseUser?.idToken) await firebase("accounts:delete", { idToken: firebaseUser.idToken });
}
