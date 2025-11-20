// models/Telemetry.js
const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  device_id: { type: String, required: true },
  timestamp: { type: Date, required: true },

  // Datos del DHT11
  temperature: Number,
  humidity: Number,

  // Opcional: si algún día mandas temp/hum cortos,
  // igual se pueden guardar:
  temp: Number,
  hum: Number,

  // Sensor touch (si luego lo usas)
  touch: {
    t0: Number,
    t3: Number,
    t4: Number,
    t5: Number,
    t6: Number,
    t7: Number
  },

  // Datos del ESP32 (opcionales)
  wifi_rssi: Number,
  free_heap: Number,
}, {
  timestamps: false, // usamos nuestro propio timestamp
});

module.exports = mongoose.model('Telemetry', telemetrySchema);
