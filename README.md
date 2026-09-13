# WEIXTROM - MecaniControl Vehicular

Plataforma de gestion de mantenimiento vehicular que conecta clientes, talleres y proveedores de repuestos.

## Stack

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend Web**: React + Vite + Tailwind CSS
- **App Movil**: React Native + Expo
- **Monorepo**: Turborepo

## Estructura

```
weixtrom/
├── apps/
│   ├── api/          # NestJS backend
│   ├── web/          # React frontend
│   └── mobile/       # React Native (Expo)
├── packages/
│   └── shared/       # Tipos, validaciones y constantes compartidas
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Requisitos

- Node.js >= 20
- Docker (para PostgreSQL)
- npm 11+

## Inicio rapido

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar PostgreSQL
docker-compose up -d

# 3. Copiar variables de entorno
cp apps/api/.env.example apps/api/.env

# 4. Correr migraciones
npm run db:migrate

# 5. Levantar todo en desarrollo
npm run dev
```

## Flujo de ramas

- `main` - produccion (protegida)
- `develop` - integracion
- `feature/WX-XXX-descripcion` - ramas de feature por tarjeta de Trello

## Roles

1. **Cliente** - app movil (registra vehiculos, solicita servicios, paga)
2. **Admin Taller** - web (gestiona diagnosticos, cotizaciones, ordenes)
3. **Tecnico** - web movil (ejecuta ordenes de trabajo)
4. **Admin Proveedor** - web (catalogo de repuestos, cotizaciones)
5. **Super Admin** - web (administracion global, reportes)
