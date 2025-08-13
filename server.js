// Simple backend for yodha27 demo
// Run: npm install && node server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Low, JSONFile } = require("lowdb");
const { nanoid } = require("nanoid");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// lowdb setup (file storage)
const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

const JWT_SECRET = process.env.JWT_SECRET || "yodha27-secret-demo";
const PORT = process.env.PORT || 5000;

async function initDB() {
  await db.read();
  db.data = db.data || { users: [] };
  // Seed admin user if not exists
  const admin = db.data.users.find(u => u.username === "admin");
  if (!admin) {
    const hash = await bcrypt.hash("1234", 10);
    db.data.users.push({ id: nanoid(), username: "admin", password: hash, role: "admin" });
    await db.write();
    console.log("Seeded admin user -> username: admin, password: 1234");
  }
}

app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Missing fields" });
  await db.read();
  const exists = db.data.users.find(u => u.username === username);
  if (exists) return res.status(409).json({ message: "User exists" });
  const hash = await bcrypt.hash(password, 10);
  const user = { id: nanoid(), username, password: hash, role: "user" };
  db.data.users.push(user);
  await db.write();
  return res.json({ message: "Registered" });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Missing fields" });
  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ message: "Invalid username or password" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid username or password" });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "2h" });
  return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Middleware to protect routes
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Missing token" });
  const parts = auth.split(" ");
  if (parts.length !== 2) return res.status(401).json({ message: "Invalid token" });
  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

app.get("/api/me", authMiddleware, async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({ id: user.id, username: user.username, role: user.role });
});

app.get("/api/users", authMiddleware, async (req, res) => {
  await db.read();
  // only admin can view list
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  const users = db.data.users.map(u => ({ id: u.id, username: u.username, role: u.role }));
  return res.json(users);
});

// Simple content endpoint (demo)
app.get("/api/content", async (req, res) => {
  return res.json({ message: "This is yodha27 demo content." });
});



// --- Admin: user management (CRUD) ---
app.post("/api/users", authMiddleware, async (req, res) => {
  await db.read();
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Missing fields" });
  const exists = db.data.users.find(u => u.username === username);
  if (exists) return res.status(409).json({ message: "User exists" });
  const hash = await bcrypt.hash(password, 10);
  const user = { id: nanoid(), username, password: hash, role: role || 'user' };
  db.data.users.push(user);
  await db.write();
  return res.json({ message: "User created", user: { id: user.id, username: user.username, role: user.role } });
});

app.put("/api/users/:id", authMiddleware, async (req, res) => {
  await db.read();
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  const { username, password, role } = req.body;
  const user = db.data.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (username) user.username = username;
  if (role) user.role = role;
  if (password) user.password = await bcrypt.hash(password, 10);
  await db.write();
  return res.json({ message: "User updated" });
});

app.delete("/api/users/:id", authMiddleware, async (req, res) => {
  await db.read();
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  const idx = db.data.users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ message: "User not found" });
  db.data.users.splice(idx, 1);
  await db.write();
  return res.json({ message: "User deleted" });
});

// --- Content CRUD (simple) ---
db.data = db.data || {};
db.data.content = db.data.content || db.data.content; // keep if exists

app.get("/api/content/list", async (req, res) => {
  await db.read();
  db.data.content = db.data.content || [];
  return res.json(db.data.content);
});

app.post("/api/content", authMiddleware, async (req, res) => {
  await db.read();
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
  const { title, body } = req.body;
  if (!title) return res.status(400).json({ message: "Missing title" });
  const item = { id: nanoid(), title, body: body || '', createdAt: Date.now() };
  db.data.content = db.data.content || [];
  db.data.content.push(item);
  await db.write();
  return res.json({ message: "Created", item });
});

app.put("/api/content/:id", authMiddleware, async (req, res) => {
  await db.read();
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  const { title, body } = req.body;
  db.data.content = db.data.content || [];
  const item = db.data.content.find(c => c.id === id);
  if (!item) return res.status(404).json({ message: "Not found" });
  if (title) item.title = title;
  if (body) item.body = body;
  await db.write();
  return res.json({ message: "Updated", item });
});

app.delete("/api/content/:id", authMiddleware, async (req, res) => {
  await db.read();
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
  const { id } = req.params;
  db.data.content = db.data.content || [];
  const idx = db.data.content.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ message: "Not found" });
  db.data.content.splice(idx, 1);
  await db.write();
  return res.json({ message: "Deleted" });
});



// Ensure DB file exists
(async () => {
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ users: [] }, null, 2));
  }
  await initDB();
  app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
})();
