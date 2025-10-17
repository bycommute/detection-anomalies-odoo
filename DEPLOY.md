# 🚀 Guide de Déploiement

## 📋 **Résumé de l'Application**

✅ **Backend Node.js** avec Express  
✅ **Interface de configuration** simple  
✅ **Anti-doublons** avec historique JSON  
✅ **Retry automatique** (1 tentative)  
✅ **Prêt pour Fly.io**

---

## 🏠 **Test Local**

### **Étape 1 : Installer les dépendances**
```bash
cd backend
npm install
```

### **Étape 2 : Démarrer le serveur**
```bash
npm start
```

### **Étape 3 : Ouvrir l'interface**
Ouvrir `frontend/index.html` dans votre navigateur

---

## 🌐 **Déploiement sur Fly.io**

### **Option A : Via GitHub Actions (Recommandé)**

#### **Prérequis**
- Accès au dépôt GitHub de ByCommute
- Compte Fly.io avec `flyctl` installé

#### **Étapes**

1. **Créer l'app Fly.io**
```bash
flyctl auth login
flyctl launch --no-deploy
# Région recommandée : cdg (Paris)
```

2. **Générer un token API**
```bash
flyctl tokens create deploy -x 999999h
# Copier le token (avec le préfixe FlyV1)
```

3. **Ajouter le token comme secret GitHub**
- Aller sur GitHub ByCommute → Settings → Secrets and variables → Actions
- Ajouter un secret nommé `FLY_API_TOKEN` avec la valeur du token

4. **Pousser le code**
```bash
git add .
git commit -m "Add detection anomalies app v2.0"
git push origin main
```

Le déploiement se fera automatiquement via GitHub Actions.

### **Option B : Déploiement Manuel**

```bash
flyctl auth login
flyctl deploy
flyctl open
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
│   └── fly.yml                # GitHub Actions
├── Dockerfile                 # Image Docker
├── fly.toml                   # Configuration Fly.io
└── README.md                  # Documentation
```

---

## 🔧 **Configuration**

### **Règles Modifiables**
Toutes les règles sont dans `backend/config/rules.json` :

- ✅ **Délais** (jours) pour chaque type d'anomalie
- ✅ **Fournisseurs** par catégorie (fabricants, installateurs, etc.)
- ✅ **Mots-clés** de détection
- ✅ **Activer/désactiver** chaque règle

### **Interface de Configuration**
- Onglet **Configuration** : Modifier les règles
- Onglet **Analyse** : Lancer l'analyse et créer les activités
- Onglet **Historique** : Voir les activités créées

---

## 🔄 **Système Anti-Doublons**

Le système utilise `config/history.json` pour éviter de recréer les mêmes activités :

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
  ]
}
```

---

## 📡 **API Endpoints**

- `GET /api/config` - Récupérer la configuration
- `POST /api/config` - Sauvegarder la configuration
- `GET /api/history` - Historique des activités
- `POST /api/analyze` - Lancer l'analyse
- `POST /api/activities/create` - Créer les activités Odoo

---

## 🎯 **Workflow Utilisateur**

```
1. Configurer les règles dans l'interface
2. Lancer l'analyse des commandes Odoo
3. Consulter les anomalies détectées
4. Créer les activités Odoo en un clic
5. Consulter l'historique des activités créées
```

---

## 🐛 **Dépannage**

### **Erreur CORS**
Le backend autorise toutes les origines par défaut.

### **Config non sauvegardée**
Vérifier les permissions du dossier `backend/config/`

### **API Odoo timeout**
Les appels ont un timeout de 30 secondes avec retry automatique.

---

**Prêt pour le déploiement ! 🚀**
