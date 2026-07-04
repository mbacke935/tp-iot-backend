const mongoose = require('mongoose');

const alertLogSchema = new mongoose.Schema({
    room: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    triggerTemperature: { type: Number, required: true },
    triggerHumidity: { type: Number, required: true },
    resolved: { type: Boolean, default: false }
});

module.exports = mongoose.model('AlertLog', alertLogSchema);