# Mi Auto

Primera interfaz web para registrar rutas y deliveries en Quintero, sumar kilómetros y estimar el gasto de combustible.

## Tecnologías

- React + TypeScript + Vite
- MongoDB planificado para persistencia (aún no conectado)
- Google Sign-In y proveedor de mapas planificados para una siguiente etapa

## Ejecutar

```bash
npm install
npm run dev
```

## Inicio de sesión

El acceso se realiza con Google. Copia `.env.example` a `.env.local` y configura `VITE_GOOGLE_CLIENT_ID` con el ID OAuth de tipo aplicación web. En Google Cloud, autoriza el origen de desarrollo `http://localhost:5173`. El backend debe tener el mismo ID en `GOOGLE_CLIENT_ID` y `FRONTEND_ORIGIN=http://localhost:5173`.

El frontend conserva el JWT de acceso solo en memoria. La cookie de refresh es HttpOnly y la API la rota; vehículos e historial se cargan y guardan en el backend después de iniciar sesión.

## Estado de esta versión

La interfaz permite navegar entre Resumen, Historial y Mi vehículo; configurar el rendimiento en km/L o en L/100 km (ambas cifras se convierten automáticamente) y el precio por litro; y guardar rutas y preferencias en el almacenamiento local del navegador. La información inicial del historial es demostrativa; los registros nuevos quedan en ese navegador. No hay autenticación ni persistencia en servidor todavía.

La comparación Económica/Más rápida y el mapa son una maqueta visual. Para comparar rutas reales, calcular kilómetros exactos y reordenar destinos, conectar un proveedor de mapas/rutas y decidir el cálculo tarifario. El formulario deja ingresar kilómetros recorridos manualmente; la lectura automática del odómetro o del GPS corresponde a una integración posterior y requiere permisos explícitos de ubicación.

## Próximos pasos técnicos

1. Definir backend (por ejemplo, Node.js + TypeScript) y conectar MongoDB.
2. Crear usuarios y autenticación con Google OAuth; asociar vehículos y rutas al usuario.
3. Integrar mapas para búsqueda de direcciones y rutas en Quintero.
4. Guardar datos por ruta: origen, destino, paradas, distancia real, duración, tipo, pasajeros, combustible, peajes y monto repartido.

El plan de implementación por etapas y los prompts listos para desarrollo están en [PLAN-DESARROLLO-PROMPTS.md](./PLAN-DESARROLLO-PROMPTS.md).
