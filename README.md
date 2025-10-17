# 🔍 Détecteur d'Anomalies Odoo v2.0

**Système de détection automatique des anomalies dans les projets Odoo ByCommute**

## ✨ **Fonctionnalités**

- ✅ **Backend Node.js** avec Express
- ✅ **Interface de configuration** simple et claire
- ✅ **Règles modifiables** sans toucher au code
- ✅ **Historique JSON** des activités créées
- ✅ **Anti-doublons intelligent**
- ✅ **Retry automatique** (1 tentative puis passer)
- ✅ **Déployé sur Fly.io** : https://bycommute-anomalies-detector.fly.dev/

---

## 🚀 **Utilisation Directe (Recommandé)**

### **Accès à l'Application**
🌐 **URL :** https://bycommute-anomalies-detector.fly.dev/

### **Comment Utiliser**

1. **Ouvrir l'URL** dans votre navigateur
2. **Configurer** les règles dans l'onglet "Configuration"
3. **Lancer** l'analyse dans l'onglet "Analyse"
4. **Créer** les activités Odoo automatiquement
5. **Consulter** l'historique dans l'onglet "Historique"

---

## 🏠 **Installation Locale (Développement)**

### **Prérequis**
- Node.js 18+ installé
- Git installé

### **Étape 1 : Cloner le Dépôt**
```bash
git clone https://github.com/bycommute/detection-anomalies-odoo.git
cd detection-anomalies-odoo
```

### **Étape 2 : Installer les Dépendances**
```bash
cd backend
npm install
```

### **Étape 3 : Démarrer le Serveur**
```bash
npm start
```
Le serveur démarre sur `http://localhost:3000`

### **Étape 4 : Ouvrir l'Interface**
Ouvrir `frontend/index.html` dans votre navigateur

---

## 📦 **Déploiement sur Fly.io**

### **Méthode 1 : Déploiement Automatique (Recommandé)**

#### **Prérequis**
- Compte Fly.io avec `flyctl` installé
- Accès au dépôt GitHub ByCommute

#### **Étape 1 : Installer Fly CLI**
```bash
# macOS
brew install flyctl

# Linux/Windows
curl -L https://fly.io/install.sh | sh
```

#### **Étape 2 : Se Connecter**
```bash
flyctl auth login
```

#### **Étape 3 : Créer l'Application**
```bash
flyctl apps create bycommute-anomalies-detector
```

#### **Étape 4 : Déployer**
```bash
flyctl deploy
```

#### **Étape 5 : Ouvrir l'Application**
```bash
flyctl open
```

### **Méthode 2 : Déploiement via GitHub Actions**

#### **Étape 1 : Créer le Token API**
```bash
flyctl tokens create deploy -x 999999h
# Copier le token (avec le préfixe FlyV1)
```

#### **Étape 2 : Ajouter le Secret GitHub**
- Aller sur GitHub ByCommute → Settings → Secrets and variables → Actions
- Ajouter un secret nommé `FLY_API_TOKEN` avec la valeur du token

#### **Étape 3 : Activer GitHub Actions**
- Aller sur GitHub ByCommute → Settings → Actions → General
- Autoriser "Workflow permissions" pour les actions

#### **Étape 4 : Pousser le Workflow**
```bash
# Créer le fichier workflow
mkdir -p .github/workflows
cat > .github/workflows/fly.yml << 'EOF'
name: Deploy to Fly.io

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy Detection Anomalies App
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Fly.io CLI
        uses: superfly/flyctl-actions/setup-flyctl@master
        
      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
EOF

# Pousser les changements
git add .github/workflows/fly.yml
git commit -m "Add GitHub Actions workflow for Fly.io deployment"
git push origin main
```

---

## 🎨 **Interface Utilisateur**

### **Onglet Configuration**
- **Toggle** pour activer/désactiver chaque règle
- **Champs numériques** pour les délais (en jours)
- **Tags** pour ajouter/supprimer fournisseurs et mots-clés
- **Sauvegarde automatique** des modifications

### **Onglet Analyse**
- **Bouton "Lancer l'Analyse"** pour démarrer
- **Barre de progression** en temps réel
- **Résultats détaillés** avec nombre d'anomalies
- **Bouton "Créer les Activités"** pour Odoo

### **Onglet Historique**
- **Statistiques** : Total activités créées, erreurs
- **Liste chronologique** des activités créées
- **Détails** : Projet, type d'anomalie, date

---

## 🔧 **Configuration des Règles**

### **Règle 1 : Installation Manquante**
**Objectif :** Détecter quand un abri sort bientôt d'atelier sans installation commandée

**Paramètres :**
- `delai_jours` : Nombre de jours avant la sortie d'atelier pour alerter (défaut: 21)
- `delai_urgent_jours` : Seuil pour passer en URGENT (défaut: 7)
- `fabricants` : Liste des fournisseurs d'abris (Camflex, Axinov, etc.)
- `installateurs` : Liste des entreprises d'installation (WEVEE, J43, etc.)
- `mots_cles_abris` : Mots dans les produits indiquant un abri
- `mots_cles_installation` : Mots indiquant une installation

### **Règle 2 : Commande Non Passée**
**Objectif :** Détecter les commandes fournisseurs en brouillon alors que l'installation approche

**Paramètres :**
- `delai_jours` : Nombre de jours avant l'installation pour vérifier (défaut: 30)
- `delai_urgent_jours` : Seuil pour passer en URGENT (défaut: 14)
- `exclusions` : Fournisseurs pouvant rester en brouillon (transports, installateurs)

### **Règle 3 : Commande Bloquée (SAV)**
**Objectif :** Détecter les projets dont toutes les dates sont passées mais encore en cours

**Paramètres :** Aucun (détection automatique)

### **Règle 4 : Prêt à l'Enlèvement**
**Objectif :** Détecter les colis prêts chez le fournisseur depuis trop longtemps

**Paramètres :**
- `delai_jours` : Nombre de jours max d'attente chez le fournisseur (défaut: 14)

---

## 🔄 **Système Anti-Doublons**

Le système utilise un fichier JSON pour tracker les activités créées et éviter les doublons :

```json
{
  "activities_created": [
    {
      "key": "123_INSTALLATION_MANQUANTE",
      "activity_id": 456,
      "projet": "D2379",
      "type": "INSTALLATION_MANQUANTE",
      "commande_id": 123,
      "created_at": "2025-10-17T10:30:00Z"
    }
  ],
  "stats": {
    "total_created": 1,
    "total_errors": 0
  }
}
```

**Comment ça fonctionne :**
1. Avant de créer une activité, le système vérifie si la clé `commandeId_type` existe
2. Si elle existe, l'activité est ignorée (doublon)
3. Sinon, l'activité est créée et ajoutée à l'historique

---

## 📡 **API Endpoints**

### **GET /api/config**
Récupère la configuration actuelle
```bash
curl https://bycommute-anomalies-detector.fly.dev/api/config
```

### **POST /api/config**
Sauvegarde la configuration
```bash
curl -X POST https://bycommute-anomalies-detector.fly.dev/api/config \
  -H "Content-Type: application/json" \
  -d '{"rules": {...}, "odoo": {...}}'
```

### **GET /api/history**
Récupère l'historique des activités créées
```bash
curl https://bycommute-anomalies-detector.fly.dev/api/history
```

### **POST /api/analyze**
Lance l'analyse des commandes Odoo
```bash
curl -X POST https://bycommute-anomalies-detector.fly.dev/api/analyze
```

### **POST /api/activities/create**
Crée les activités Odoo pour les anomalies détectées
```bash
curl -X POST https://bycommute-anomalies-detector.fly.dev/api/activities/create \
  -H "Content-Type: application/json" \
  -d '{"anomalies": [...]}'
```

---

## 🎯 **Workflow Utilisateur Complet**

```
1. Utilisateur : Ouvrir https://bycommute-anomalies-detector.fly.dev/
   ↓
2. Utilisateur : Modifier les règles dans l'onglet Configuration
   ↓
3. Frontend → Backend : POST /api/config (sauvegarder)
   ↓
4. Utilisateur : Cliquer sur "Lancer l'Analyse"
   ↓
5. Frontend → Backend : POST /api/analyze
   ↓
6. Backend → Odoo API : Récupérer commandes
   ↓
7. Backend : Appliquer les règles configurées
   ↓
8. Backend → Frontend : Retourner anomalies
   ↓
9. Utilisateur : Cliquer sur "Créer Activités"
   ↓
10. Frontend → Backend : POST /api/activities/create
   ↓
11. Backend : Vérifier doublons dans history.json
   ↓
12. Backend → Odoo API : Créer activités (avec retry)
   ↓
13. Backend : Sauvegarder dans history.json
   ↓
14. Backend → Frontend : Retourner résultats
   ↓
15. Utilisateur : Consulter l'historique des activités créées
```

---

## 🐛 **Dépannage**

### **Application ne se charge pas**
- Vérifier que l'URL est correcte : https://bycommute-anomalies-detector.fly.dev/
- Vérifier la connexion Internet
- Ouvrir la console du navigateur (F12) pour voir les erreurs

### **Erreur CORS**
Le backend autorise toutes les origines par défaut. Si problème :
```javascript
// Dans server.js (développement local)
app.use(cors({
    origin: 'http://localhost:8000' // ou votre domaine
}));
```

### **Configuration non sauvegardée**
- Vérifier les permissions du dossier `backend/config/`
- Vérifier que l'API répond : `curl https://bycommute-anomalies-detector.fly.dev/api/config`

### **API Odoo timeout**
- Les appels ont un timeout de 30 secondes
- Retry automatique : 1 tentative puis passer à la suite
- Vérifier la connectivité avec l'API Odoo MCP

### **Déploiement Fly.io échoue**
```bash
# Vérifier le statut
flyctl status

# Voir les logs
flyctl logs

# Redéployer
flyctl deploy
```

---

## 📁 **Structure du Projet**

```
/detection-anomalies-odoo/
├── backend/
│   ├── server.js              # Serveur Express
│   ├── package.json           # Dépendances Node.js
│   └── config/
│       ├── rules.json         # Configuration des règles
│       └── history.json       # Historique des activités
├── frontend/
│   ├── index.html             # Interface utilisateur
│   ├── app.js                 # Logique frontend
│   └── styles.css             # Styles CSS
├── .github/workflows/
│   └── fly.yml                # GitHub Actions (si activé)
├── Dockerfile                 # Image Docker
├── fly.toml                   # Configuration Fly.io
└── README.md                  # Ce fichier
```

---

## 🔍 **Logs et Monitoring**

### **Logs du Serveur**
Le serveur log toutes les opérations dans la console :

```
[2025-10-17T10:30:00Z] ℹ️ Appel Odoo: purchase.order.search_read
[2025-10-17T10:30:05Z] ✅ 80 commandes récupérées
[2025-10-17T10:30:10Z] ✅ Activité créée pour D2379
[2025-10-17T10:30:15Z] ❌ Tentative 1/2 échouée: HTTP 500
```

### **Monitoring Fly.io**
```bash
# Voir les logs en temps réel
flyctl logs -f

# Voir le statut de l'app
flyctl status

# Monitoring détaillé
flyctl dashboard
```

---

## 🚀 **Améliorations Futures**

- [ ] Authentification simple (mot de passe)
- [ ] Export des résultats en PDF
- [ ] Notifications par email
- [ ] Graphiques d'évolution
- [ ] API webhook pour automatisation
- [ ] Tests automatisés
- [ ] Interface mobile optimisée

---

## 📞 **Support**

- **GitHub Issues** : https://github.com/bycommute/detection-anomalies-odoo/issues
- **Email** : contact@bycommute.fr
- **Documentation** : Ce README

---

**Version** : 2.0.0  
**Date** : 17 octobre 2025  
**Auteur** : Système ByCommute  
**URL** : https://bycommute-anomalies-detector.fly.dev/