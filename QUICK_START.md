# Quick Start - Démarrage Rapide

## Étapes Minimales pour Tester l'Application

### 1. Configuration Rapide (5 minutes)

#### a) Créez le fichier `.env.local` avec configuration minimale :

```env
# MongoDB Local (plus simple pour tester)
MONGODB_URI=mongodb://localhost:27017/reservation-chartrette

# NextAuth - Générez un secret rapidement
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre-secret-changez-moi-en-production-123456789

# Email (désactivé pour test rapide - commentez ces lignes)
# EMAIL_SERVER_HOST=smtp.gmail.com
# EMAIL_SERVER_PORT=587
# EMAIL_SERVER_USER=
# EMAIL_SERVER_PASSWORD=
# EMAIL_FROM=noreply@test.com
```

**Note** : Sans configuration email, les notifications ne seront pas envoyées mais l'app fonctionnera.

#### b) Installez et démarrez MongoDB localement

**Windows** :
1. Téléchargez : https://www.mongodb.com/try/download/community
2. Installez avec les options par défaut
3. MongoDB démarre automatiquement comme service

**Mac (avec Homebrew)** :
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu)** :
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

#### c) Démarrez l'application

```bash
npm run dev
```

Accédez à : http://localhost:3000

### 2. Initialisation de la Base de Données (2 minutes)

#### a) Installez MongoDB Compass (Interface Graphique)

Téléchargez : https://www.mongodb.com/try/download/compass

#### b) Connectez-vous à MongoDB

- Connection String : `mongodb://localhost:27017`
- Cliquez sur "Connect"

#### c) Créez la base de données

1. Cliquez sur "Create Database"
2. Nom : `reservation-chartrette`
3. Collection : `associations`

#### d) Ajoutez une association (Copier-Coller dans MongoDB Shell)

Dans MongoDB Compass, ouvrez le Shell (en bas de l'écran) et collez :

```javascript
use reservation-chartrette

db.associations.insertOne({
  name: "Association Test",
  description: "Association de test pour démarrage rapide",
  status: "active",
  contactName: "Admin Test",
  contactEmail: "admin@test.com",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

#### e) Ajoutez des salles

```javascript
db.rooms.insertMany([
  {
    name: "Salle Polyvalente",
    description: "Grande salle pour événements et réunions",
    capacity: 80,
    surface: 120,
    equipment: [
      { name: "Vidéoprojecteur", available: true },
      { name: "Sono", available: true },
      { name: "WiFi", available: true },
      { name: "Cuisine", available: true }
    ],
    defaultTimeSlots: { start: "08:00", end: "22:00" },
    blockedDates: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Salle de Réunion",
    description: "Petite salle pour réunions et ateliers",
    capacity: 25,
    surface: 45,
    equipment: [
      { name: "Tableau blanc", available: true },
      { name: "WiFi", available: true },
      { name: "Écran TV", available: true }
    ],
    defaultTimeSlots: { start: "08:00", end: "20:00" },
    blockedDates: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Salle des Fêtes",
    description: "Salle spacieuse pour événements festifs",
    capacity: 150,
    surface: 200,
    equipment: [
      { name: "Sono professionnelle", available: true },
      { name: "Lumières", available: true },
      { name: "Cuisine équipée", available: true },
      { name: "Tables et chaises", available: true }
    ],
    defaultTimeSlots: { start: "10:00", end: "02:00" },
    blockedDates: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

### 3. Créez votre Premier Compte (1 minute)

1. Allez sur http://localhost:3000
2. Cliquez sur "S'inscrire"
3. Remplissez le formulaire :
   - Nom : Votre nom
   - Email : votre@email.com
   - Mot de passe : minimum 8 caractères
4. Sélectionnez "Association Test"
5. Cliquez sur "S'inscrire"
6. Vous serez redirigé vers la connexion
7. Connectez-vous avec vos identifiants

### 4. Transformez votre Compte en Admin (30 secondes)

Dans MongoDB Compass Shell :

```javascript
// Remplacez votre@email.com par votre email
db.users.updateOne(
  { email: "votre@email.com" },
  { $set: { role: "admin" } }
)
```

Déconnectez-vous et reconnectez-vous pour que le rôle admin soit actif.

### 5. Testez les Fonctionnalités

#### En tant qu'utilisateur :
1. ✅ Créez une réservation
2. ✅ Sélectionnez plusieurs créneaux horaires
3. ✅ Voyez votre réservation "En attente"

#### En tant qu'admin :
1. ✅ Allez dans "Administration"
2. ✅ Voyez les statistiques du dashboard
3. ✅ Allez dans "Gestion des réservations"
4. ✅ Approuvez ou refusez votre réservation avec un commentaire

#### Retour en tant qu'utilisateur :
1. ✅ Voyez le statut mis à jour
2. ✅ Lisez le commentaire de l'admin

## Commandes Utiles

### Réinitialiser la base de données

```javascript
use reservation-chartrette
db.reservations.deleteMany({})
db.users.deleteMany({})
// Les associations et salles resteront
```

### Voir toutes les réservations

```javascript
db.reservations.find().pretty()
```

### Voir tous les utilisateurs

```javascript
db.users.find({}, { password: 0 }).pretty()
```

### Changer le rôle d'un utilisateur

```javascript
// User -> Admin
db.users.updateOne(
  { email: "email@example.com" },
  { $set: { role: "admin" } }
)

// Admin -> User
db.users.updateOne(
  { email: "email@example.com" },
  { $set: { role: "user" } }
)
```

## Scénarios de Test Complets

### Scénario 1 : Réservation Simple

1. Créez un compte utilisateur
2. Créez une réservation pour demain, 14h-16h
3. Connectez-vous en admin
4. Approuvez la réservation
5. Revenez en utilisateur et vérifiez

### Scénario 2 : Conflit de Réservation

1. Créez une réservation approuvée pour demain 14h-16h
2. Créez un second compte utilisateur
3. Essayez de réserver la même salle, même créneau
4. ✅ Les créneaux doivent être grisés automatiquement

### Scénario 3 : Refus avec Commentaire

1. Créez une réservation
2. En tant qu'admin, refusez avec un motif détaillé
3. Vérifiez que le commentaire apparaît côté utilisateur

### Scénario 4 : Créneaux Multiples

1. Réservez une salle de 10h à 18h (8 créneaux)
2. Vérifiez que tous les créneaux sont enregistrés
3. Approuvez et vérifiez le blocage

## Dépannage Express

### MongoDB ne démarre pas
```bash
# Vérifiez le statut
mongod --version

# Démarrez manuellement
mongod
```

### Port 3000 déjà utilisé
```bash
# Utilisez un autre port
PORT=3001 npm run dev
```

### Erreur "Cannot find module"
```bash
# Réinstallez les dépendances
rm -rf node_modules
npm install
```

### Page blanche
```bash
# Vérifiez les logs dans le terminal
# Vérifiez la console du navigateur (F12)
# Vérifiez .env.local
```

## Configuration Avancée (Plus Tard)

Une fois que vous avez testé localement, consultez :
- `GUIDE_DEMARRAGE.md` - Configuration complète avec email et Google OAuth
- `FEATURES.md` - Liste détaillée de toutes les fonctionnalités
- `README.md` - Documentation générale

## Support

- MongoDB pas installé ? Utilisez MongoDB Atlas (cloud gratuit)
- Problème ? Vérifiez les logs dans le terminal
- Questions ? Consultez la documentation Next.js et MongoDB

Bon test ! 🚀
