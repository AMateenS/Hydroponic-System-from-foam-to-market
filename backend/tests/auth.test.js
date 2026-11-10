// Run with:  node tests/auth.test.js   (no database, Firebase or npm install needed: they use in-memory fakes)
const Module = require("module"), path = require("path"), assert = require("assert");

const users = []; let n = 1;
const verifyCalls = [];
const tokens = {}; // fake Firebase ID tokens -> claims
let failNextCreate = false;

const wrap = (d) => { if (d && !d.save) Object.defineProperty(d, "save", { value: async () => d, enumerable: false }); return d; };
const User = {
  findOne: (q) => {
    const d = q.firebaseUid !== undefined
      ? users.find((u) => u.firebaseUid === q.firebaseUid)
      : users.find((u) => u.email.toLowerCase() === String(q.email).toLowerCase());
    const p = Promise.resolve(wrap(d) || null); p.collation = () => p; return p;
  },
  create: async (data) => {
    if (failNextCreate) { // simulate losing a race: someone else created it first
      failNextCreate = false;
      users.push({ _id: String(n), id: String(n++), isVerified: true, ...data });
      const e = new Error("dup"); e.code = 11000; throw e;
    }
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) { const e = new Error("dup"); e.code = 11000; throw e; }
    const d = { _id: String(n), id: String(n++), ...data }; users.push(d); return wrap(d);
  },
};

const orig = Module._load;
Module._load = function (req, parent) {
  const from = parent && parent.filename ? path.basename(parent.filename) : "";
  if (from === "Auth.js") {
    if (req === "../models/User") return User;
    if (req === "jsonwebtoken") return { sign: (payload) => "jwt:" + JSON.stringify(payload) };
    if (req === "jose") return {
      createRemoteJWKSet: () => "jwks",
      jwtVerify: async (token, jwks, opts) => { verifyCalls.push(opts); if (!tokens[token]) throw new Error("bad token"); return { payload: tokens[token] }; },
    };
    if (req === "../utils/mailer") return { sendMail: async () => {} };
  }
  return orig.apply(this, arguments);
};
process.env.FIREBASE_PROJECT_ID = "test-project";
process.env.JWT_SECRET = "secret";
process.env.ADMIN_EMAILS = "Boss@Example.com, other@example.com";
const a = require(path.join(__dirname, "..", "controllers", "Auth.js"));

const mk = () => ({ code: 200, body: null, cookies: {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, cookie(k, v) { this.cookies[k] = v; } });
const call = async (body) => { const r = mk(); await a.session({ body }, r); return r; };
const claims = (o) => ({ sub: "uid-" + (o.email || "x"), email_verified: true, ...o });
let pass = 0;
const test = async (name, fn) => { try { await fn(); pass++; console.log("  ok  " + name); } catch (e) { console.log("FAIL  " + name + "\n      " + e.message); process.exitCode = 1; } };

(async () => {
  await test("garbage / missing token is refused", async () => {
    assert.strictEqual((await call({})).code, 400);
    assert.strictEqual((await call({ idToken: "nope" })).code, 401);
    assert.strictEqual(users.length, 0);
  });
  await test("token is checked against YOUR Firebase project (issuer + audience)", async () => {
    tokens.t1 = claims({ email: "ali@example.com", name: "Ali Khan" });
    await call({ idToken: "t1" });
    const o = verifyCalls[verifyCalls.length - 1];
    assert.strictEqual(o.issuer, "https://securetoken.google.com/test-project");
    assert.strictEqual(o.audience, "test-project");
    assert.deepStrictEqual(o.algorithms, ["RS256"]);
  });
  await test("verified new user: account created as 'user', session cookie set, name from Firebase", async () => {
    const r = await call({ idToken: "t1" });
    assert.strictEqual(r.code, 200); assert.strictEqual(r.body.user.role, "user"); assert.strictEqual(r.body.user.username, "Ali Khan");
    assert.ok(r.cookies.token.startsWith("jwt:")); assert.strictEqual(users.length, 1);
    assert.strictEqual(users[0].firebaseUid, "uid-ali@example.com"); assert.strictEqual(users[0].isVerified, true);
  });
  await test("logging in again reuses the account (no duplicates)", async () => {
    await call({ idToken: "t1" }); await call({ idToken: "t1" }); assert.strictEqual(users.length, 1);
  });
  await test("UNVERIFIED email is refused and no account is created", async () => {
    tokens.t2 = claims({ email: "new@example.com", email_verified: false });
    const r = await call({ idToken: "t2" });
    assert.strictEqual(r.code, 403); assert.strictEqual(r.body.needsVerification, true);
    assert.ok(!r.cookies.token); assert.strictEqual(users.length, 1);
  });
  await test("a role sent in the request body is ignored", async () => {
    tokens.t3 = claims({ email: "sneaky@example.com" });
    const r = await call({ idToken: "t3", role: "admin", isAdmin: true, username: "Hacker" });
    assert.strictEqual(r.body.user.role, "user");
  });
  await test("old shop account (bcrypt era) is linked by email and KEEPS its role + id", async () => {
    users.push(wrap({ _id: "50", id: "50", username: "OldAdmin", email: "Legacy@Example.com", password: "$2b$old", role: "admin", isVerified: false }));
    tokens.t4 = claims({ email: "legacy@example.com", sub: "uid-legacy" });
    const before = users.length;
    const r = await call({ idToken: "t4" });
    assert.strictEqual(users.length, before); assert.strictEqual(r.body.user.id, "50");
    assert.strictEqual(r.body.user.role, "admin"); assert.strictEqual(users.find((u) => u.id === "50").firebaseUid, "uid-legacy");
  });
  await test("same email but a DIFFERENT Firebase login cannot take over a linked account", async () => {
    tokens.t5 = claims({ email: "legacy@example.com", sub: "uid-someone-else" });
    const r = await call({ idToken: "t5" });
    assert.strictEqual(r.code, 409); assert.ok(!r.cookies.token);
  });
  await test("ADMIN_EMAILS promotes a verified user (case-insensitive); others stay users", async () => {
    tokens.t6 = claims({ email: "boss@example.com", name: "The Boss" });
    const r = await call({ idToken: "t6" });
    assert.strictEqual(r.body.user.role, "admin"); assert.ok(r.cookies.token.includes('"role":"admin"'));
    assert.strictEqual((await call({ idToken: "t1" })).body.user.role, "user");
  });
  await test("an admin NOT in ADMIN_EMAILS keeps admin (it is only ever an upgrade)", async () => {
    users.find((u) => u.email === "ali@example.com").role = "admin";
    assert.strictEqual((await call({ idToken: "t1" })).body.user.role, "admin");
    users.find((u) => u.email === "ali@example.com").role = "user";
  });
  await test("no name claim: falls back to the name sent by the page, then to the email prefix; long names are cut", async () => {
    tokens.t7 = claims({ email: "noname@example.com" });
    assert.strictEqual((await call({ idToken: "t7", username: "  Sara   Bibi " })).body.user.username, "Sara Bibi");
    tokens.t8 = claims({ email: "plain@example.com" });
    assert.strictEqual((await call({ idToken: "t8" })).body.user.username, "plain");
    tokens.t9 = claims({ email: "long@example.com", name: "x".repeat(200) });
    assert.strictEqual((await call({ idToken: "t9" })).body.user.username.length, 50);
  });
  await test("two requests racing to create the same account both succeed with one account", async () => {
    tokens.t10 = claims({ email: "race@example.com" });
    failNextCreate = true; const before = users.length;
    const r = await call({ idToken: "t10" });
    assert.strictEqual(r.code, 200); assert.strictEqual(users.length, before + 1);
  });
  await test("server without FIREBASE_PROJECT_ID refuses instead of skipping the check", async () => {
    const saved = process.env.FIREBASE_PROJECT_ID; delete process.env.FIREBASE_PROJECT_ID;
    const r = await call({ idToken: "t1" }); process.env.FIREBASE_PROJECT_ID = saved;
    assert.strictEqual(r.code, 500); assert.match(r.body.message, /FIREBASE_PROJECT_ID/); assert.ok(!r.cookies.token);
  });
  console.log(`\n${pass} tests passed` + (process.exitCode ? " (with failures)" : ""));
})();
