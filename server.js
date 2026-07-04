require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware essentiels
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==========================================
// 1. CONFIGURATION DE LA CONNEXION MONGODB
// ==========================================
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
    .then(() => console.log('Connexion réussie à MongoDB Atlas !'))
    .catch(err => console.error('Erreur de connexion à MongoDB :', err));

// ==========================================
// 2. MODÈLE DE DONNÉES ENRICHI (MongoDB)
// ==========================================
const sensorDataSchema = new mongoose.Schema({
    room: { type: String, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    seuilTemp: { type: Number, required: true },
    seuilHum: { type: Number, required: true },
    status: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true }
});

const SensorData = mongoose.model('SensorData', sensorDataSchema, 'sensor_data');

// ==========================================
// 3. ROUTE DE BASE POUR TESTER L'API
// ==========================================
app.get('/', (req, res) => {
    res.send("L'API du projet IoT est en ligne et fonctionnelle !");
});

// ==========================================
// 4. ROUTE POST : RECEVOIR ET ENREGISTRER UNE MESURE
// ==========================================
app.post('/api/data', async(req, res) => {
    try {
        const { room, temperature, humidity, seuilTemp, seuilHum, status } = req.body;

        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0];

        const newData = new SensorData({
            room,
            temperature,
            humidity,
            seuilTemp,
            seuilHum,
            status,
            date,
            time
        });

        await newData.save();
        res.status(201).json({ message: 'Mesure enregistrée avec succès', data: newData });

    } catch (error) {
        console.error("Erreur lors de l'enregistrement :", error);
        res.status(500).json({ error: 'Erreur serveur lors de la sauvegarde des données' });
    }
});

// ==========================================
// 5. ROUTE GET : RECUPE RER LA DERNIÈRE MESURE
// ==========================================
app.get('/api/data/latest', async(req, res) => {
    try {
        const latestData = await SensorData.findOne().sort({ _id: -1 });
        if (!latestData) return res.status(404).json({ message: "Aucune donnée disponible" });
        res.json(latestData);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération de la dernière mesure" });
    }
});

// ==========================================
// 6. ROUTE GET : RECUPERER TOUTES LES MESURES
// ==========================================
app.get('/api/data', async(req, res) => {
    try {
        const data = await SensorData.find().sort({ _id: -1 });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des données" });
    }
});

// ==========================================
// 7. ROUTE GET : HISTORIQUES ET FILTRES (Matin, Soir, Nuit & Périodes)
// ==========================================
app.get('/api/data/history', async(req, res) => {
    try {
        const { start_date, end_date, period } = req.query;
        let query = {};

        // Filtrage par plage de dates
        if (start_date && end_date) {
            query.date = { $gte: start_date, $lte: end_date };
        } else if (start_date) {
            query.date = start_date;
        }

        // Filtrage par période de la journée (Matin: 06h-14h, Soir: 14h-22h, Nuit: 22h-06h)
        if (period) {
            if (period === 'matin') {
                query.time = { $gte: '06:00:00', $lt: '14:00:00' };
            } else if (period === 'soir') {
                query.time = { $gte: '14:00:00', $lt: '22:00:00' };
            } else if (period === 'nuit') {
                query.$or = [
                    { time: { $gte: '22:00:00', $lte: '23:59:59' } },
                    { time: { $gte: '00:00:00', $lt: '06:00:00' } }
                ];
            }
        }

        const filteredData = await SensorData.find(query).sort({ _id: -1 });

        // Calcul des métriques demandées (Moyennes et nombre d'alertes)
        const total = filteredData.length;
        const alertesCount = filteredData.filter(d => d.status === 'Alerte').length;

        let avgTemp = 0,
            avgHum = 0;
        if (total > 0) {
            avgTemp = filteredData.reduce((acc, d) => acc + d.temperature, 0) / total;
            avgHum = filteredData.reduce((acc, d) => acc + d.humidity, 0) / total;
        }

        res.json({
            count: total,
            metrics: {
                averageTemperature: parseFloat(avgTemp.toFixed(2)),
                averageHumidity: parseFloat(avgHum.toFixed(2)),
                alertsCount: alertesCount
            },
            data: filteredData
        });

    } catch (error) {
        console.error("Erreur historique :", error);
        res.status(500).json({ error: "Erreur lors de la récupération de l'historique" });
    }
});

// ==========================================
// ÉCOUTE SUR TOUTES LES INTERFACES (0.0.0.0)
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur API HTTP démarré sur le port ${PORT} (Écoute universelle)`);
});