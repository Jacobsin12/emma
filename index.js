require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Telemetry = require('./models/Telemetry');
const morgan = require('morgan');
const cors = require('cors');

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({ origin: "*", methods: "GET,POST" }));
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '1mb' }));

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => {
    console.error('Error MongoDB:', err);
    process.exit(1);
  });

// POST: guardar telemetría
app.post('/api/telemetry', async (req, res) => {
  try {
    const body = req.body;

    const deviceId = body.device_id || 'esp32-dht11-1';
    if (!body.ts_esp) return res.status(400).json({ error: 'ts_esp requerido' });

    const temperature = body.temperature;
    const humidity = body.humidity;

    if (temperature === undefined || humidity === undefined)
      return res.status(400).json({ error: 'temperature/humidity requeridos' });

    const doc = new Telemetry({
      device_id: deviceId,
      ts_esp: new Date(body.ts_esp),
      temperature,
      humidity,
      ts_server: new Date(),
      touch: body.touch || {},
      wifi_rssi: body.wifi_rssi,
      free_heap: body.free_heap
    });

    await doc.save();
    res.status(201).json({ ok: true, id: doc._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

// GET: últimas lecturas
app.get('/api/telemetry/latest', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50'), 1000);
    const docs = await Telemetry.find().sort({ ts_server: -1 }).limit(limit);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'internal' });
  }
});

// GET: conteo total
app.get('/api/telemetry/count', async (req, res) => {
  try {
    const count = await Telemetry.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'internal' });
  }
});

// GET: intervalo dinámico
app.get('/api/update', (req, res) => {
  const min = 4;
  const max = 60;
  const interval = Math.floor(Math.random() * (max - min + 1)) + min;
  res.json({ interval_seconds: interval });
});

app.get('/', (req, res) => res.send("API ESP32 funcionando"));

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
