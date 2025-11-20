const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  // Ahora es OPCIONAL, porque tu ESP no lo está enviando
  device_id: { type: String, required: false },

  // El ESP sí envía timestamp, lo seguimos dejando requerido
  timestamp: { type: Date, required: true },

  // Aceptamos lo que manda el ESP: temp y hum
  temp: Number,
  hum: Number,

  // Si más adelante quieres usar nombres "bonitos":
  // temperature: Number,
  // humidity: Number,

  touch: {
    t0: Number,
    t3: Number,
    t4: Number,
    t5: Number,
    t6: Number,
    t7: Number
  },

  wifi_rssi: Number,
  free_heap: Number,
});

module.exports = mongoose.model('Telemetry', telemetrySchema);
