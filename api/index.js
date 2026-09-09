const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================
// DATABASE - Turso
// ============================================
const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

// יצירת טבלאות בהפעלה הראשונה (רץ פעם אחת, לא מוחק כלום)
let initialized = false;
async function init() {
    if (initialized) return;

    await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_plate TEXT NOT NULL UNIQUE,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      vin TEXT,
      current_mileage INTEGER DEFAULT 0,
      insurance_expiry TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    await db.execute(`
    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      category TEXT,
      description TEXT,
      cost REAL,
      mileage INTEGER,
      service_date TEXT,
      workshop_name TEXT,
      next_due_km INTEGER,
      next_due_date TEXT,
      notes TEXT,
      image_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    initialized = true;
}

// ============================================
// AUTH - שכבת סיסמה
// ============================================
function requireAuth(req, res, next) {
    const provided = req.headers['x-app-password'];

    if (!process.env.APP_PASSWORD) {
        return res.status(500).json({ error: 'Server misconfigured: no password set' });
    }

    if (provided !== process.env.APP_PASSWORD) {
        return res.status(401).json({ error: 'סיסמה שגויה' });
    }

    next();
}

// בדיקת סיסמה - הראוט היחיד שלא דורש אימות מראש
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.APP_PASSWORD) {
        return res.json({ success: true });
    }
    res.status(401).json({ error: 'סיסמה שגויה' });
});

// כל שאר הראוטים מוגנים
app.use('/api', requireAuth);

// אתחול טבלאות לפני כל בקשה
app.use(async (req, res, next) => {
    try {
        await init();
        next();
    } catch (e) {
        console.error('Init failed:', e);
        res.status(500).json({ error: 'Database init failed' });
    }
});

// ============================================
// VEHICLES
// ============================================

app.get('/api/vehicles', async (req, res) => {
    try {
        const vehicles = await db.execute('SELECT * FROM vehicles ORDER BY id DESC');

        const result = [];
        for (const v of vehicles.rows) {
            const m = await db.execute({
                sql: 'SELECT * FROM maintenance WHERE vehicle_id = ? ORDER BY service_date DESC',
                args: [v.id]
            });
            result.push({ ...v, maintenance: m.rows });
        }

        res.json(result);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const r = await db.execute({
            sql: 'SELECT * FROM vehicles WHERE id = ?',
            args: [req.params.id]
        });
        if (!r.rows.length) return res.status(404).json({ error: 'Vehicle not found' });

        const m = await db.execute({
            sql: 'SELECT * FROM maintenance WHERE vehicle_id = ? ORDER BY service_date DESC',
            args: [req.params.id]
        });

        res.json({ ...r.rows[0], maintenance: m.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vehicles', async (req, res) => {
    try {
        const { license_plate, make, model, year, vin, current_mileage } = req.body;

        if (!license_plate || !make || !model) {
            return res.status(400).json({ error: 'חסרים שדות חובה: רישום, מותג, דגם' });
        }

        const r = await db.execute({
            sql: `INSERT INTO vehicles (license_plate, make, model, year, vin, current_mileage)
            VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
            args: [license_plate, make, model, year || null, vin || null, current_mileage || 0]
        });

        res.json({ ...r.rows[0], maintenance: [] });
    } catch (error) {
        console.error('Error adding vehicle:', error);
        if (String(error.message).includes('UNIQUE')) {
            return res.status(400).json({ error: 'רכב עם מספר רישום זה כבר קיים' });
        }
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/vehicles/:id', async (req, res) => {
    try {
        const { license_plate, make, model, year, vin, current_mileage, insurance_expiry } = req.body;

        const r = await db.execute({
            sql: `UPDATE vehicles
            SET license_plate = ?, make = ?, model = ?, year = ?,
                vin = ?, current_mileage = ?, insurance_expiry = ?
            WHERE id = ? RETURNING *`,
            args: [license_plate, make, model, year, vin, current_mileage,
                insurance_expiry || null, req.params.id]
        });

        res.json(r.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/vehicles/:id', async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM maintenance WHERE vehicle_id = ?',
            args: [req.params.id]
        });
        await db.execute({
            sql: 'DELETE FROM vehicles WHERE id = ?',
            args: [req.params.id]
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// MAINTENANCE
// ============================================

app.get('/api/maintenance/:vehicleId', async (req, res) => {
    try {
        const r = await db.execute({
            sql: 'SELECT * FROM maintenance WHERE vehicle_id = ? ORDER BY service_date DESC',
            args: [req.params.vehicleId]
        });
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/maintenance', async (req, res) => {
    try {
        const {
            vehicle_id, category, description, cost, mileage,
            service_date, workshop_name, next_due_km, next_due_date, notes, image_path
        } = req.body;

        if (!vehicle_id) return res.status(400).json({ error: 'חסר מזהה רכב' });

        const r = await db.execute({
            sql: `INSERT INTO maintenance
              (vehicle_id, category, description, cost, mileage, service_date,
               workshop_name, next_due_km, next_due_date, notes, image_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
            args: [
                vehicle_id, category || null, description || null, cost || 0, mileage || 0,
                service_date || new Date().toISOString().split('T')[0],
                workshop_name || null, next_due_km || null, next_due_date || null,
                notes || null, image_path || null
            ]
        });

        res.json(r.rows[0]);
    } catch (error) {
        console.error('Error adding maintenance:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/maintenance/:id', async (req, res) => {
    try {
        const {
            category, description, cost, mileage, service_date,
            workshop_name, next_due_km, next_due_date, notes, image_path
        } = req.body;

        const r = await db.execute({
            sql: `UPDATE maintenance
            SET category = ?, description = ?, cost = ?, mileage = ?, service_date = ?,
                workshop_name = ?, next_due_km = ?, next_due_date = ?, notes = ?, image_path = ?
            WHERE id = ? RETURNING *`,
            args: [category, description, cost, mileage, service_date,
                workshop_name, next_due_km, next_due_date, notes, image_path, req.params.id]
        });

        res.json(r.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/maintenance/:id', async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM maintenance WHERE id = ?',
            args: [req.params.id]
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// HEALTH
// ============================================

app.get('/api/health', async (req, res) => {
    try {
        const r = await db.execute('SELECT COUNT(*) as c FROM vehicles');
        res.json({ status: 'OK', vehicles: r.rows[0].c });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// EXPORT ל-Vercel / הרצה מקומית
// ============================================

module.exports = app;

// כשמריצים ישירות (מקומי) - מרים שרת. ב-Vercel זה לא רץ.
if (require.main === module) {
    const PORT = process.env.PORT || 3088;
    app.listen(PORT, () => {
        console.log(`\n🚗 Car Maintenance API`);
        console.log(`📍 http://localhost:${PORT}`);
        console.log(`🗄️  Turso: ${process.env.TURSO_DATABASE_URL ? '✅' : '❌ missing env'}`);
        console.log(`🔒 Password: ${process.env.APP_PASSWORD ? '✅' : '❌ missing env'}\n`);
    });
}