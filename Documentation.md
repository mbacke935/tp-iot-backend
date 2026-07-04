# 📊 Documentation Technique Détaillée : Système de Suivi Environnemental IoT (Salle DAR-1)

---

## 1. Présentation Générale

Ce projet consiste en la conception et le déploiement d'une solution IoT complète de surveillance environnementale (température et humidité) dédiée à la salle **DAR-1**. Le système automatise la collecte des données, supervise en continu le dépassement de seuils critiques par une alerte sonore locale, assure la persistance des données dans le Cloud et expose un tableau de bord analytique mis à jour en temps réel.

---

## 2. Architecture Globale du Système

L'écosystème s'articule autour d'une architecture à **trois niveaux (3-Tier)** :

```
       +------------------+
       |   ESP32 + DHT11  |  (Edge / Matériel)
       +--------+---------+
                |
                | Requêtes POST (HTTPS + JSON)
                v
       +------------------+
       |  Node.js / Express|  (Backend Cloud - Render)
       +--------+---------+
                |
                +-----------------------+
                |                       |
                v                       v
       +------------------+    +------------------+
       |   MongoDB Atlas  |    |  Dashboard HTML5 |  (Frontend - Tailwind)
       +------------------+    +------------------+
```

1. **Le Tier Matériel (Edge) :** L'ESP32 fait office de passerelle locale. Il échantillonne le capteur DHT11, pilote le buzzer et transmet les payloads en HTTPS.
2. **Le Tier Logique (Backend) :** L'API Express standardise, valide et enrichit les données reçues (génération de l'horodatage). Elle exécute également les requêtes d'agrégation statistique.
3. **Le Tier Présentation & Persistance :** **MongoDB Atlas** assure le stockage à long terme, tandis que l'interface **Tailwind CSS** présente les indicateurs visuels aux administrateurs.

---

## 3. Spécifications Matérielles et Logique Locale

### 🔌 Schéma de Câblage (ESP32)

**Capteur DHT11 :**
- `VCC` ➡️ `3V3` ou `5V` de l'ESP32
- `GND` ➡️ `GND`
- `DATA` ➡️ **GPIO 23**

**Buzzer Actif :**
- Borne positive (`+`) ➡️ **GPIO 22**
- Borne négative (`-`) ➡️ `GND`

### ⚠️ Justification des Seuils Environnementaux

- **Seuil de Température (30.0°C) :** Une température supérieure à 30°C dans une salle de classe ou de serveurs impacte le confort des occupants et accélère l'usure des équipements informatiques.
- **Seuil d'Humidité (70.0%) :** Un taux d'humidité supérieur à 70% favorise la condensation, augmentant les risques de court-circuit sur les cartes électroniques nues.

### ⚙️ Logique Algorithmique de l'ESP32

L'ESP32 suit une boucle d'exécution stricte toutes les 10 secondes :

1. Lecture des variables physiques *t* (Température) et *h* (Humidité).
2. Vérification de la validité des mesures (`isnan`).
3. Évaluation de la condition critique :

   **SI** (t > 30.0) **OU** (h > 70.0) **ALORS** Buzzer = HIGH, Statut = "Alerte"

   **SINON** Buzzer = LOW, Statut = "Normal"

4. Emballage des données sous format JSON et envoi via une requête `POST` chiffrée.

---

## 4. Modèle de Données (MongoDB Atlas)

Les documents insérés au sein de la collection `sensor_data` respectent la structure stricte suivante :

```json
{
  "_id": "64a4b2c8e4b0f1a2c3d4e5f6",
  "room": "Salle DAR-1",
  "temperature": 30.4,
  "humidity": 41.7,
  "seuilTemp": 30.0,
  "seuilHum": 70.0,
  "status": "Alerte",
  "date": "2026-07-04",
  "time": "15:30:22",
  "__v": 0
}
```

### Dictionnaire des Champs

| Champ | Type | Description |
|---|---|---|
| `room` | String | Identifiant de la zone surveillée. |
| `temperature` | Number | Température mesurée en degrés Celsius. |
| `humidity` | Number | Taux d'humidité mesuré en pourcentage. |
| `seuilTemp` / `seuilHum` | Number | Seuils limites configurés au moment de la capture. |
| `status` | String | Label de l'état global (`"Normal"` ou `"Alerte"`). |
| `date` | String | Date au format standardisé `YYYY-MM-DD`. |
| `time` | String | Heure de l'enregistrement au format local `HH:MM:SS`. |

---

## 5. Spécifications de l'API REST (Endpoints)

L'API d'intégration est déployée sur Render à l'adresse : `https://tp-iot-backend.onrender.com`

### 📥 1. Envoi d'une Mesure

- **Route :** `POST /api/data`
- **Payload attendu :**

```json
{
  "room": "Salle DAR-1",
  "temperature": 28.5,
  "humidity": 55.0,
  "seuilTemp": 30.0,
  "seuilHum": 70.0,
  "status": "Normal"
}
```

- **Code de succès :** `201 Created`

### 📤 2. Récupération du Temps Réel

- **Route :** `GET /api/data/latest`
- **Description :** Renvoie le dernier enregistrement chronologique de la base de données.
- **Code de succès :** `200 OK`

### 📊 3. Requête Historique et Filtrage Analytique

- **Route :** `GET /api/data/history`
- **Paramètres de requête (Query Params) :**
  - `start_date` *(Ex: 2026-07-04)* : Filtre de départ.
  - `period` *(matin | soir | nuit)* : Segmente l'analyse selon les plages définies.

**Logique de découpage horaire sur le serveur :**

| Période | Plage horaire |
|---|---|
| **MATIN** | `06:00:00` ➡️ `13:59:59` |
| **SOIR** | `14:00:00` ➡️ `21:59:59` |
| **NUIT** | `22:00:00` ➡️ `05:59:59` *(Géré par disjonction logique `$or` pour intercepter le chevauchement de minuit)* |

**Format de réponse analytique :**

```json
{
  "period": "matin",
  "metrics": {
    "count": 142,
    "averageTemperature": 27.3,
    "averageHumidity": 52.1,
    "alertsCount": 3
  }
}
```

---

## 6. Interface Utilisateur (Dashboard)

Le tableau de bord est accessible à la racine de l'URL du service web. Il est autonome et interactif :

- **Polling Automatique :** Le script JavaScript client orchestre des appels asynchrones (`fetch`) toutes les 5 secondes pour actualiser les données sans rafraîchir la page.
- **Adaptabilité des URLs :** L'utilisation de requêtes HTTP relatives (`/api/data`) permet au code frontend de fonctionner de manière transparente en environnement local ou Cloud sans modification.
- **Feedback Visuel d'Alerte :** Si le champ `status` d'une mesure équivaut à `"Alerte"`, une bannière rouge clignotante CSS s'affiche à l'écran et la bordure de la carte concernée s'illumine en rouge.

---

## 7. Sécurité et Bonnes Pratiques de Déploiement

- **Isolation des Secrets :** Aucune clé d'accès MongoDB Atlas n'est codée en dur dans l'application. La chaîne `MONGO_URI` est stockée dans un fichier `.env` local exclu du suivi de version via `.gitignore`. Un fichier `.env.example` est fourni pour guider les déploiements tiers.
- **Gestion des variables sur Render :** La chaîne de connexion réelle est injectée au runtime via l'onglet *Environment Variables* de la plateforme Render.
- **Gestion du chiffrement TLS/SSL sur le microcontrôleur :** L'ESP32 utilise l'implémentation de sécurité `WiFiClientSecure`. L'appel à la méthode `client.setInsecure()` débraye la validation rigoureuse de la chaîne de certification racine, permettant à l'appareil d'initier un tunnel HTTPS robuste vers les serveurs de Render tout en préservant ses ressources mémoire.
