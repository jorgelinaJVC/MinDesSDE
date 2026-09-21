const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { 
        type: String, 
        enum: ['Administrador', 'Director de área', 'Colaborador', 'Observador'], 
        default: 'Colaborador' 
    },
    area: { type: String, required: true }, // Ej. Sistemas, Comunicación, etc.
    lastAccess: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);