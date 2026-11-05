# syntax=docker/dockerfile:1
# Frontend BloodLink / Idammen — image multi-stage (SCRUM-98)
#   Étape 1 « build » : Node compile le site statique (dist/).
#   Étape 2 « runtime » : Nginx sert uniquement dist/, sans Node ni code source.

# ---------- Étape 1 : build ----------
FROM node:22-alpine AS build
WORKDIR /app

# Les dépendances d'abord : cette couche reste en cache tant que package*.json ne change pas.
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund

COPY . .

# Les variables VITE_* sont figées dans le JavaScript au moment du build.
# Valeurs par défaut : mode réel, gateway sur la machine hôte.
ARG VITE_USE_MOCK=false
ARG VITE_API_URL=http://localhost:8080
ENV VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- Étape 2 : runtime ----------
# Image Nginx « unprivileged » : le processus ne tourne pas en root et écoute sur 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# Origine de l'API autorisée par la Content-Security-Policy (connect-src).
ENV API_ORIGIN=http://localhost:8080

# Le modèle est complété au démarrage par envsubst (fonction intégrée de l'image Nginx).
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

# Un seul processus par conteneur : Nginx au premier plan.
CMD ["nginx", "-g", "daemon off;"]
