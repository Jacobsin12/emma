// index.js / server.js
require('dotenv').config();

const express    = require('express');
const bodyParser = require('body-parser');
const mongoose   = require('mongoose');
const Telemetry  = require('./models/Telemetry');
const morgan     = require('morgan');
const cors       = require('cors');

const MONGO_URI = process.env.MONGO_URI;
const PORT      = process.env.PORT || 3000;

// ------------------- CORS -------------------
const app = express();
app.use(cors({
  origin: "*",       // ← permite que Angular (Vercel) acceda
  methods: "GET,POST"
}));

// ----------------- LOG & JSON ---------------
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '1mb' }));

// ---------------- MongoDB -------------------
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => {
    console.error('Error MongoDB:', err);
    process.exit(1);
  });

// ----------- POST /api/telemetry -----------
app.post('/api/telemetry', async (req, res) => {
  try {
    const body = req.body;
    console.log('Payload recibido desde ESP32:', body);

    const deviceId = body.device_id || body.deviceId || 'esp32-dht11-1';

    if (!body.ts_esp) {
      return res.status(400).json({ error: 'ts_esp es requerido' });
    }

    const tsEsp = new Date(body.ts_esp);

    const temperature = body.temperature ?? body.temp;
    const humidity    = body.humidity   ?? body.hum;

    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: 'temperature/humidity requeridos' });
    }

    const doc = new Telemetry({
      device_id: deviceId,
      ts_esp: tsEsp,
      ts_server: new Date(),
      temperature,
      humidity,
      touch: body.touch || {},
      wifi_rssi: body.wifi_rssi,
      free_heap: body.free_heap,
    });

    await doc.save();
    return res.status(201).json({ ok: true, id: doc._id });

  } catch (err) {
    console.error('POST /api/telemetry error:', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// ----------- GET /api/telemetry/latest -----------
app.get('/api/telemetry/latest', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50'), 1000);
    const docs = await Telemetry.find()
      .sort({ ts_server: -1 })
      .limit(limit)
      .exec();

    res.json(docs);
  } catch (err) {
    console.error('GET /api/telemetry/latest error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// ----------- GET /api/telemetry/count -----------
app.get('/api/telemetry/count', async (req, res) => {
  try {
    const count = await Telemetry.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error('GET /api/telemetry/count error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// ----------- GET /api/update (intervalo dinámico) -----------
app.get('/api/update', (req, res) => {
  const min = 4;
  const max = 60;
  const interval = Math.floor(Math.random() * (max - min + 1)) + min;

  // 🔴 ANTES: res.json({ interval_seconds: interval })
  // ✅ AHORA: solo devolvemos el número en texto plano
  res.type('text/plain').send(String(interval));
});

// -------- Raíz (opcional para evitar 404 en /) --------
app.get('/', (req, res) => {
  res.send("API ESP32 funcionando 😎");
});

// ----------- Iniciar servidor -----------
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
// models/Telemetry.js