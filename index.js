require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const Telemetry = require('./models/Telemetry');
const morgan = require('morgan');
const cors = require('cors');

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

const app = express();

// Middlewares
app.use(cors({ origin: "*", methods: "GET,POST" }));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' })); // en lugar de bodyParser

// Conexión a MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => {
    console.error('Error MongoDB:', err);
    process.exit(1);
  });

/**
 * POST /api/telemetry
 * Recibe el JSON que manda el ESP32:
 * {
 *   "device_id": "esp32-dht11-1",
 *   "ts_esp": "2025-01-01T12:00:00Z",
 *   "temperature": 25,
 *   "humidity": 60
 * }
 */
app.post('/api/telemetry', async (req, res) => {
  try {
    const body = req.body;

    // Si no mandas device_id, usamos el del firmware por defecto
    const deviceId = body.device_id || 'esp32-dht11-1';

    if (!body.ts_esp) {
      return res.status(400).json({ error: 'ts_esp requerido' });
    }

    const temperature = body.temperature;
    const humidity = body.humidity;

    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: 'temperature/humidity requeridos' });
    }

    const doc = new Telemetry({
      device_id: deviceId,
      ts_esp: new Date(body.ts_esp), // viene en formato ISO "2025-01-01T12:00:00Z"
      temperature,
      humidity,
      ts_server: new Date(),
      // los demás campos son opcionales, por ahora no los manda el ESP
      touch: body.touch || {},
      wifi_rssi: body.wifi_rssi,
      free_heap: body.free_heap
    });

    await doc.save();

    return res.status(201).json({
      ok: true,
      id: doc._id
    });

  } catch (err) {
    console.error('Error en /api/telemetry:', err);
    return res.status(500).json({ error: 'internal' });
  }
});

/**
 * GET /api/telemetry/latest
 * Devuelve las últimas lecturas almacenadas
 */
app.get('/api/telemetry/latest', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50'), 1000);
    const docs = await Telemetry.find().sort({ ts_server: -1 }).limit(limit);
    return res.json(docs);
  } catch (err) {
    console.error('Error en /api/telemetry/latest:', err);
    return res.status(500).json({ error: 'internal' });
  }
});

/**
 * GET /api/telemetry/count
 * Devuelve el número total de documentos
 */
app.get('/api/telemetry/count', async (req, res) => {
  try {
    const count = await Telemetry.countDocuments();
    return res.json({ count });
  } catch (err) {
    console.error('Error en /api/telemetry/count:', err);
    return res.status(500).json({ error: 'internal' });
  }
});

/**
 * GET /api/update
 * El ESP32 llama aquí para obtener el nuevo intervalo.
 * El firmware espera exactamente:
 * { "interval_seconds": <numero> }
 */
app.get('/api/update', (req, res) => {
  const min = 4;
  const max = 60;
  const interval = Math.floor(Math.random() * (max - min + 1)) + min;

  // Muy importante: propiedad se llama interval_seconds
  return res.json({ interval_seconds: interval });
});

// Ruta básica
app.get('/', (req, res) => res.send("API ESP32 funcionando"));

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
