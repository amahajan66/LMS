import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";

// Helper function to run the native python db layer
function runPythonDb(request: { action: string; id?: number; data?: any }): Promise<any> {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", [path.join(process.cwd(), "db.py")]);
    let stdout = "";
    let stderr = "";
    
    py.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    py.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    py.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. Stderr: ${stderr}`));
        return;
      }
      try {
        const response = JSON.parse(stdout);
        if (response.error) {
          const err = new Error(response.error) as any;
          if (response.code) err.statusCode = response.code;
          reject(err);
        } else {
          resolve(response.data);
        }
      } catch (e: any) {
        reject(new Error(`Failed to parse Python response: ${e.message}. Raw output: ${stdout}`));
      }
    });
    
    py.stdin.write(JSON.stringify(request));
    py.stdin.end();
  });
}

// Call init on start to ensure SQLite DB and tables are ready
runPythonDb({ action: "init" })
  .then(() => console.log("[Database] Native SQLite initialized via Python successfully."))
  .catch((err) => console.error("[Database] Native SQLite initialization failed via Python:", err));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Static Token-based auth middleware
  const ADMIN_TOKEN = "lead_admin_token_2026";

  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access denied. Token missing." });
    }

    if (token !== ADMIN_TOKEN) {
      return res.status(403).json({ error: "Access denied. Invalid token." });
    }

    next();
  };

  // 1. AUTHENTICATION API
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (username === "admin" && password === "Pass$Word") {
      return res.json({
        success: true,
        token: ADMIN_TOKEN,
        user: { username: "admin", role: "Administrator" }
      });
    }

    return res.status(401).json({
      success: false,
      error: "Invalid username or password"
    });
  });

  // 2. DASHBOARD / METRICS API
  app.get("/api/dashboard/metrics", authenticateToken, async (req, res) => {
    try {
      const metrics = await runPythonDb({ action: "metrics" });
      return res.json(metrics);
    } catch (err: any) {
      console.error("Metrics API Error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. CRUD: READ ALL LEADS
  app.get("/api/leads", authenticateToken, async (req, res) => {
    try {
      const leads = await runPythonDb({ action: "list" });
      return res.json(leads);
    } catch (err: any) {
      console.error("Get Leads API Error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // CRUD: READ SINGLE LEAD
  app.get("/api/leads/:id", authenticateToken, async (req, res) => {
    const id = req.params.id;
    try {
      const lead = await runPythonDb({ action: "get", id: Number(id) });
      return res.json(lead);
    } catch (err: any) {
      console.error(`Get Lead ${id} API Error:`, err);
      const status = err.statusCode || 500;
      return res.status(status).json({ error: err.message });
    }
  });

  // CRUD: CREATE LEAD
  app.post("/api/leads", authenticateToken, async (req, res) => {
    const { name, income, phone, aadhaar, pan, status, lead_type, cm, sub_status, rejection_reason, custom_rejection } = req.body;

    if (!name || income === undefined || !phone || !aadhaar || !pan || !status) {
      return res.status(400).json({ error: "All fields are required: name, income, phone, aadhaar, pan, status" });
    }

    try {
      const newLead = await runPythonDb({
        action: "create",
        data: { 
          name, 
          income: Number(income), 
          phone, 
          aadhaar, 
          pan, 
          status,
          lead_type,
          cm,
          sub_status,
          rejection_reason,
          custom_rejection
        }
      });
      return res.status(201).json(newLead);
    } catch (err: any) {
      console.error("Create Lead API Error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // CRUD: UPDATE LEAD
  app.put("/api/leads/:id", authenticateToken, async (req, res) => {
    const id = req.params.id;
    const { name, income, phone, aadhaar, pan, status, lead_type, cm, sub_status, rejection_reason, custom_rejection } = req.body;

    if (!name || income === undefined || !phone || !aadhaar || !pan || !status) {
      return res.status(400).json({ error: "All fields are required for update" });
    }

    try {
      const updatedLead = await runPythonDb({
        action: "update",
        id: Number(id),
        data: { 
          name, 
          income: Number(income), 
          phone, 
          aadhaar, 
          pan, 
          status,
          lead_type,
          cm,
          sub_status,
          rejection_reason,
          custom_rejection
        }
      });
      return res.json(updatedLead);
    } catch (err: any) {
      console.error(`Update Lead ${id} API Error:`, err);
      const status = err.statusCode || 500;
      return res.status(status).json({ error: err.message });
    }
  });

  // CRUD: DELETE LEAD
  app.delete("/api/leads/:id", authenticateToken, async (req, res) => {
    const id = req.params.id;
    try {
      const result = await runPythonDb({ action: "delete", id: Number(id) });
      return res.json(result);
    } catch (err: any) {
      console.error(`Delete Lead ${id} API Error:`, err);
      const status = err.statusCode || 500;
      return res.status(status).json({ error: err.message });
    }
  });

  // Serve Vite assets in development, or Static Files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
});
