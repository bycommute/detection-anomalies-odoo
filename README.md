# 🔍 Détecteur d'Anomalies Odoo v2.0

## 🎯 **Nouveau Système Simplifié**

Version complètement repensée avec backend Node.js et interface de configuration intuitive.

## ✨ **Nouveautés v2.0**

- ✅ **Backend Node.js** avec Express
- ✅ **Interface de configuration** simple et claire
- ✅ **Règles modifiables** sans toucher au code
- ✅ **Historique JSON** des activités créées
- ✅ **Anti-doublons intelligent**
- ✅ **Retry automatique** (1 tentative)
- ✅ **Prêt pour Fly.io**

---

## 🚀 **Installation Locale**

### **Prérequis**
- Node.js 18+ installé
- Accès à l'API Odoo MCP

### **Étape 1 : Installer les dépendances**
```bash
cd backend
npm install
```

### **Étape 2 : Démarrer le serveur**
```bash
npm start
```

Le serveur démarre sur `http://localhost:3000`

### **Étape 3 : Ouvrir l'interface**
Ouvrir `frontend/index.html` dans votre navigateur

---

## 📦 **Déploiement sur Fly.io**

### **Étape 1 : Installer Fly CLI**
```bash
# macOS
brew install flyctl

# Autres OS
curl -L https://fly.io/install.sh | sh
```

### **Étape 2 : Login**
```bash
flyctl auth login
```

### **Étape 3 : Créer l'app**
```bash
flyctl launch
# Suivre les instructions
# Région recommandée : cdg (Paris)
```

### **Étape 4 : Déployer**
```bash
flyctl deploy
```

### **Étape 5 : Ouvrir l'app**
```bash
flyctl open
```

---

## 🎨 **Interface**

### **Onglet Configuration**
- ✅ Activer/désactiver chaque règle avec un simple toggle
- ✅ Modifier les délais en jours
- ✅ Ajouter/supprimer des fournisseurs et mots-clés
- ✅ Sauvegarde automatique

### **Onglet Analyse**
- ✅ Lancer l'analyse en un clic
- ✅ Progression en temps réel
- ✅ Résultats avec détails
- ✅ Bouton pour créer toutes les activités

### **Onglet Historique**
- ✅ Liste des activités créées
- ✅ Statistiques (total, erreurs)
- ✅ Dates de création

---

## 🔧 **Configuration des Règles**

Toutes les règles sont dans `backend/config/rules.json`

### **Règle 1 : Installation Manquante**
```json
{
  "enabled": true,
  "delai_jours": 21,
  "delai_urgent_jours": 7,
  "fabricants": ["Camflex", "Axinov"],
  "installateurs": ["WEVEE", "J43"],
  "mots_cles_abris": ["abri", "arceau"],
  "mots_cles_installation": ["installation", "pose"]
}
```

**Paramètres modifiables :**
- `delai_jours` : Nombre de jours avant la sortie d'atelier pour alerter
- `delai_urgent_jours` : Seuil pour passer en URGENT
- `fabricants` : Liste des fournisseurs d'abris
- `installateurs` : Liste des entreprises d'installation
- `mots_cles_abris` : Mots dans les produits indiquant un abri
- `mots_cles_installation` : Mots indiquant une installation

### **Règle 2 : Commande Non Passée**
```json
{
  "enabled": true,
  "delai_jours": 30,
  "delai_urgent_jours": 14,
  "exclusions": ["Transport", "WEVEE"]
}
```

**Paramètres modifiables :**
- `delai_jours` : Nombre de jours avant l'installation pour vérifier
- `delai_urgent_jours` : Seuil pour passer en URGENT
- `exclusions` : Fournisseurs pouvant rester en brouillon

### **Règle 3 : Commande Bloquée (SAV)**
```json
{
  "enabled": true,
  "name": "Commande Bloquée (SAV)",
  "description": "Détecte les projets bloqués"
}
```

Pas de paramètres configurables (détection automatique).

### **Règle 4 : Prêt à l'Enlèvement**
```json
{
  "enabled": true,
  "delai_jours": 14
}
```

**Paramètres modifiables :**
- `delai_jours` : Nombre de jours max d'attente chez le fournisseur

---

## 🔄 **Système Anti-Doublons**

Le système utilise un fichier JSON (`config/history.json`) pour tracker les activités créées :

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

**Réponse :**
```json
{
  "rules": {...},
  "odoo": {...}
}
```

### **POST /api/config**
Sauvegarde la configuration

**Body :**
```json
{
  "rules": {...},
  "odoo": {...}
}
```

### **GET /api/history**
Récupère l'historique des activités créées

**Réponse :**
```json
{
  "activities_created": [...],
  "last_analysis": "2025-10-17T10:30:00Z",
  "stats": {...}
}
```

### **POST /api/analyze**
Lance l'analyse des commandes Odoo

**Réponse :**
```json
{
  "success": true,
  "projets": 17,
  "anomalies": [...],
  "timestamp": "2025-10-17T10:30:00Z"
}
```

### **POST /api/activities/create**
Crée les activités Odoo pour les anomalies détectées

**Body :**
```json
{
  "anomalies": [...]
}
```

**Réponse :**
```json
{
  "success": true,
  "results": {
    "created": [...],
    "skipped": [...],
    "errors": [...]
  }
}
```

---

## 🔍 **Logs**

Le serveur log toutes les opérations dans la console :

```
[2025-10-17T10:30:00Z] ℹ️ Appel Odoo: purchase.order.search_read
[2025-10-17T10:30:05Z] ✅ 80 commandes récupérées
[2025-10-17T10:30:10Z] ✅ Activité créée pour D2379
[2025-10-17T10:30:15Z] ❌ Tentative 1/2 échouée: HTTP 500
```

---

## 🎯 **Workflow Complet**

```
1. Utilisateur : Modifier les règles dans l'interface
   ↓
2. Frontend → Backend : POST /api/config (sauvegarder)
   ↓
3. Utilisateur : Cliquer sur "Lancer l'Analyse"
   ↓
4. Frontend → Backend : POST /api/analyze
   ↓
5. Backend → Odoo API : Récupérer commandes
   ↓
6. Backend : Appliquer les règles configurées
   ↓
7. Backend → Frontend : Retourner anomalies
   ↓
8. Utilisateur : Cliquer sur "Créer Activités"
   ↓
9. Frontend → Backend : POST /api/activities/create
   ↓
10. Backend : Vérifier doublons dans history.json
   ↓
11. Backend → Odoo API : Créer activités (avec retry)
   ↓
12. Backend : Sauvegarder dans history.json
   ↓
13. Backend → Frontend : Retourner résultats
```

---

## 🐛 **Dépannage**

### **Erreur CORS**
Si vous avez une erreur CORS, vérifiez que le backend autorise votre origine :
```javascript
// Dans server.js
app.use(cors({
    origin: 'http://localhost:8000' // ou votre domaine
}));
```

### **Config non sauvegardée**
Vérifiez les permissions du dossier `backend/config/`

### **API Odoo timeout**
Augmentez le timeout dans `server.js` :
```javascript
const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30000) // 30 secondes
});
```

---

## 🚀 **Améliorations Futures**

- [ ] Authentification simple (mot de passe)
- [ ] Export des résultats en PDF
- [ ] Notifications par email
- [ ] Graphiques d'évolution
- [ ] API webhook pour automatisation
- [ ] Tests automatisés

---

**Version** : 2.0.0  
**Date** : 17 octobre 2025  
**Auteur** : Système ByCommute
