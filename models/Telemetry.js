const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  device_id: { type: String, required: true },
  ts_esp: { type: Date, required: true },
  ts_server: { type: Date, required: true, default: Date.now },

  temperature: Number,
  humidity: Number,

  touch: {
    t0: Number,
    t3: Number,
    t4: Number,
    t5: Number,
    t6: Number,
    t7: Number
  },

  wifi_rssi: Number,
  free_heap: Number
});

module.exports = mongoose.model('Telemetry', telemetrySchema);
