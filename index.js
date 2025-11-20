require('dotenv').config();

const express   = require('express');
const bodyParser = require('body-parser');
const mongoose  = require('mongoose');
const Telemetry = require('./models/Telemetry');
const morgan    = require('morgan');

const MONGO_URI = process.env.MONGO_URI;
const PORT      = process.env.PORT || 3000;

// Conexión a MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => {
    console.error('Error MongoDB:', err);
    process.exit(1);
  });

const app = express();
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '1mb' }));

// ----------- POST /api/telemetry -----------
app.post('/api/telemetry', async (req, res) => {
  try {
    const body = req.body;
    console.log('Payload recibido desde ESP32:', body);

    // Campos del ESP
    const deviceId = body.device_id || body.deviceId || 'esp32-dht11-1';

    // ts_esp viene en UTC como string ISO
    if (!body.ts_esp) {
      return res.status(400).json({ error: 'ts_esp es requerido' });
    }
    const tsEsp = new Date(body.ts_esp);   // se guarda en UTC en Mongo

    // Temperatura / humedad
    const temperature = body.temperature ?? body.temp;
    const humidity    = body.humidity   ?? body.hum;

    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: 'temperature/humidity (o temp/hum) son requeridos' });
    }

    const doc = new Telemetry({
      device_id: deviceId,
      ts_esp: tsEsp,
      ts_server: new Date(),   // hora del servidor
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

// ----------- Iniciar servidor -----------
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
