FROM node:18-alpine

WORKDIR /app

# Copier les fichiers du backend
COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

# Copier le frontend
COPY frontend/ ./public/

# Créer les dossiers de config s'ils n'existent pas
RUN mkdir -p config

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["node", "server.js"]

