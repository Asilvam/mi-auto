# Mi Auto

Primera interfaz web para registrar rutas y deliveries en Quintero, sumar kilómetros y estimar el gasto de combustible.

## Tecnologías

- React + TypeScript + Vite
- Google Sign-In con sesión JWT y refresh token rotativo
- Mapbox GL JS para mapa y API backend de geocodificación, rutas y reordenamiento de paradas
- MongoDB/Mongoose en el backend para vehículos, rutas y tarifas asociadas a la cuenta

## Ejecutar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Las pruebas unitarias del frontend se ejecutan con `npm test`.

## Inicio de sesión

El acceso se realiza con Google. Copia `.env.example` a `.env.local` y configura `VITE_GOOGLE_CLIENT_ID` con el ID OAuth de tipo aplicación web. En Google Cloud, autoriza el origen de desarrollo `http://localhost:5173`. El backend debe tener el mismo ID en `GOOGLE_CLIENT_ID` y `FRONTEND_ORIGIN=http://localhost:5173`.

Configura `VITE_GOOGLE_CLIENT_ID`, `VITE_MAPBOX_PUBLIC_TOKEN` y `VITE_API_BASE_URL` en `.env.local`. El token de Mapbox para el backend se configura como `MAPBOX_ACCESS_TOKEN` en el `.env` del backend. En Google Cloud autoriza `http://localhost:5173`; en Mapbox usa un token público para el mapa y otro token de servidor para las llamadas desde NestJS.

El frontend conserva el JWT de acceso solo en memoria. La cookie de refresh es HttpOnly y la API la rota. Perfil, vehículo, rutas, paradas y tarifas de delivery se guardan en MongoDB bajo la cuenta autenticada.

## Funciones implementadas

- Inicio de sesión Google, renovación y cierre de sesión.
- Resumen e historial alimentados por la API, sin rutas demostrativas.
- Configuración de vehículo en km/L, L/100 km y CLP por litro.
- Comparación de alternativas por costo de combustible y por duración; peajes se ingresan manualmente.
- Selección de origen y destino desde sugerencias de direcciones de Mapbox en Quintero.
- Planificación de deliveries con varias paradas y reordenamiento de las paradas por tiempo.
- Delivery activo con opción de añadir paradas, recalcular y finalizar.
- Tarifas configurables por horario, con tramos iniciales gratuitos, $500 y $1.000 CLP.
- División de combustible, peajes y otros gastos entre las personas indicadas.

Mapbox Optimization entrega el orden de paradas más rápido; las alternativas de ruta se ordenan además por costo de combustible estimado. Mapbox no calcula aquí el monto del peaje automáticamente: se registra manualmente. El odómetro del vehículo no se lee automáticamente.

## Pruebas

Los cálculos de combustible, reparto, tarifas y selección de rutas se prueban con Jest en el backend:

```bash
cd ../mi-auto-backend
npm test -- --runInBand
```

El plan de implementación por etapas y los prompts listos para desarrollo están en [PLAN-DESARROLLO-PROMPTS.md](./PLAN-DESARROLLO-PROMPTS.md).
