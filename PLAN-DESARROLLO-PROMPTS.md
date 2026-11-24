# Mi Auto — plan de desarrollo con prompts

## Objetivo

Convertir el prototipo actual en una aplicación web responsive para conductores de Quintero. Permitirá planificar rutas, registrar kilómetros, estimar combustible y gastos, compartir costos entre pasajeros, gestionar deliveries y consultar el historial.

## Decisiones acordadas

- Frontend: React + TypeScript + Vite (prototipo existente).
- Backend: NestJS + TypeScript.
- Persistencia: MongoDB.
- Mapas, búsqueda de direcciones, rutas y optimización: Mapbox.
- Autenticación: acceso con Google.
- Moneda inicial: CLP.
- Zona inicial: Quintero y alrededores.
- Diseño: adaptable a escritorio, iPad y móvil; paleta pastel menta, durazno y amarillo mantequilla.

## Reglas para todos los prompts

Pega estas instrucciones al comienzo de cada prompt de implementación:

> Trabaja dentro del proyecto Mi Auto y conserva las decisiones acordadas: React + TypeScript en frontend, NestJS + TypeScript en backend, MongoDB, Mapbox y autenticación con Google. Revisa el código existente antes de modificarlo. Mantén la interfaz en español, responsive para escritorio/iPad/móvil y con la paleta menta, durazno y amarillo mantequilla. No inventes credenciales ni las escribas en el código. Usa variables de entorno, valida entradas, maneja errores y explica los archivos cambiados y cómo ejecutar la entrega. Mantén el alcance en esta etapa; no adelantes etapas posteriores.

## Etapas

### 0. Aclarar reglas del producto

Antes de programar cálculos de cobro, definir:

- Cómo se divide el viaje: por partes iguales, por pasajeros que suben/bajan en cada tramo, o aporte fijo.
- Si se incluye desgaste del auto además de combustible.
- Cómo se agregan peajes y gastos reales.
- En delivery, si se cobra por pedido, distancia, tiempo o combinación.
- Si el kilometraje real se ingresa manualmente o se registra por GPS.

**Prompt:**

> Analiza el objetivo de Mi Auto y propone reglas simples para calcular el costo de un viaje compartido y el precio de un delivery. Presenta ejemplos numéricos en CLP para Quintero. Separa datos medidos, datos ingresados y estimaciones. No implementes todavía. Señala qué decisiones de producto debo confirmar y recomienda valores iniciales configurables.

### 1. Preparar estructura frontend y backend

Estructura propuesta:

```text
mi-auto/
  frontend/   # mover o adaptar aquí el prototipo React + Vite
  backend/    # NestJS
```

**Prompt:**

> Revisa el prototipo actual de Mi Auto y propón una estructura de monorepo frontend/backend que mantenga funcionando la web. Crea el backend NestJS con configuración TypeScript, variables de entorno, endpoint de salud y documentación de ejecución local. No conectes todavía autenticación, MongoDB ni Mapbox. Asegura que el frontend actual siga compilando.

### 2. MongoDB y modelos iniciales

Colecciones iniciales recomendadas: `users`, `vehicles`, `trips`, `deliveries`. Los gastos pueden empezar embebidos en el documento de viaje para simplificar; separar si el historial crece o se necesita reporteo avanzado.

**Prompt:**

> Conecta el backend NestJS a MongoDB usando Mongoose y variables de entorno. Diseña esquemas con índices y validación para usuario, vehículo, viaje compartido y delivery. Guarda distancia en metros, duración en segundos, dinero en CLP como enteros y rendimiento en km/L como unidad canónica; calcula L/100 km como representación equivalente. Incluye timestamps y propietario en todos los datos privados. Añade DTOs y endpoints CRUD mínimos para vehículos e historial del usuario autenticado (puede usarse un usuario de desarrollo temporal en esta etapa). No pongas secretos en Git.

### 3. Inicio de sesión con Google + JWT

Google se usa para verificar identidad. Luego Mi Auto emite un JWT de acceso de vida corta, guardado solo en memoria frontend, y un refresh token opaco rotativo en cookie HttpOnly. MongoDB persiste el hash del refresh en una colección `sessions`, para permitir revocar sesiones por dispositivo.

**Prompt:**

> Implementa autenticación con Google para Mi Auto. El frontend inicia el flujo de Google y envía la credencial al backend NestJS; el backend verifica firma, audiencia y expiración usando `google-auth-library`, crea o recupera el usuario y emite un JWT de acceso de vida corta más un refresh token opaco, aleatorio, rotativo y revocable. Mantén el JWT solo en memoria del frontend, nunca en localStorage. Guarda en MongoDB solo el hash del refresh token, su usuario, expiración y estado de revocación. Entrega el refresh token en cookie HttpOnly, Secure en producción y SameSite=Lax; protege refresh/logout contra CSRF y valida Origin. Implementa rotación, revocación al cerrar sesión y expiración de sesiones. Protege endpoints y asegura que cada usuario solo lea sus vehículos/viajes. Documenta variables de entorno y configuración requerida en Google Cloud sin inventar valores.

### 4. Perfil de vehículo y persistencia real

**Prompt:**

> Sustituye el almacenamiento local del perfil del vehículo por la API NestJS. Implementa crear/editar vehículo principal con marca, modelo, año opcionales, tipo de combustible, km/L, precio por litro CLP y datos opcionales de rendimiento. Conserva km/L como unidad canónica y muestra L/100 km calculado como 100 dividido por km/L. Migra los datos locales del prototipo de manera segura y ofrece mensajes claros si falla la conexión. La pantalla debe funcionar bien en escritorio, iPad y móvil.

### 5. Mapbox: lugares y rutas reales

Mantener las llamadas con token secreto del lado servidor cuando el endpoint permita hacerlo; el token público de renderizado de mapas, si se usa en cliente, debe estar limitado por URL y permisos. No guardar coordenadas precisas si no hacen falta para el historial.

**Prompt:**

> Integra Mapbox en Mi Auto. Añade al backend NestJS un módulo proveedor de mapas que encapsule búsqueda de direcciones y Directions API; usa variables de entorno para tokens y no filtres tokens secretos al bundle del frontend. En React reemplaza el mapa ilustrativo por un mapa real centrado inicialmente en Quintero. Permite buscar origen/destino, seleccionar una sugerencia, solicitar ruta, mostrar trazado, kilómetros y duración, y comparar una alternativa si Mapbox la devuelve. Gestiona carga, errores, resultado vacío y restricciones de cobertura. Antes de finalizar, documenta cada variable necesaria y cómo configurar restricciones de token.

### 6. Registrar viaje y repartir gastos

**Prompt:**

> Implementa el flujo real para registrar un viaje compartido usando la ruta seleccionada o kilometraje ingresado manualmente. Guarda origen/destino, distancia, duración estimada, fecha, vehículo, participantes, combustible, peajes y otros gastos. Calcula el combustible desde km recorridos, km/L y precio por litro configurado; muestra claramente estimación versus gasto real. Aplica la regla de división acordada en la etapa 0, incluye un desglose por persona y permite corregir gastos antes de guardar. Persiste en MongoDB y actualiza el historial sin datos de demostración.

### 7. Delivery con varias paradas

**Prompt:**

> Implementa el modo delivery con varios destinos. Permite agregar, editar y quitar pedidos/paradas, dirección, notas y estado de entrega. Usa Mapbox Optimization para sugerir un orden eficiente, conservando origen y destino final cuando corresponda. Muestra orden recomendado, distancia/tiempo estimado, costo de combustible y un resumen por delivery según la tarifa configurable acordada. Permite al conductor aceptar el orden sugerido o reordenar manualmente. Guarda la ruta, paradas y estados en MongoDB.

### 8. GPS y kilometraje real (posterior)

**Prompt:**

> Añade registro opcional de recorrido real desde el GPS del teléfono, solo durante un viaje iniciado explícitamente por el usuario. Solicita permiso de ubicación en contexto, explica cuándo se usa, ofrece pausar/finalizar y permite descartar el registro. Filtra puntos GPS erráticos y usa Map Matching de Mapbox solo si aporta valor. Conserva distancia planificada y distancia real como campos separados. No recolectes ubicación en segundo plano ni antes de iniciar un viaje.

### 9. Historial, reportes y exportación

**Prompt:**

> Completa el historial con filtros por fecha, tipo, vehículo y ruta; muestra kilómetros, duración, costo estimado, gasto real, peajes e ingresos de delivery. Agrega resúmenes mensuales y exportación CSV del usuario autenticado. Consulta datos paginados desde NestJS y evita descargar todo el historial de una vez. Mantén formato CLP y fechas de Chile.

### 10. Preparar producción

**Prompt:**

> Haz una revisión de preparación para producción de Mi Auto. Revisa validación y autorización, exposición de tokens, límites y cuotas de Mapbox, CORS, sesiones, logging sin coordenadas sensibles, índices MongoDB, paginación, accesibilidad, estados responsive y errores. Añade pruebas unitarias e integración para cálculos de costos, autorización y registro de rutas; corrige lo encontrado dentro del alcance y documenta despliegue frontend/backend, variables de entorno, respaldos y límites de gasto. No despliegues a servicios externos.

## Orden recomendado de trabajo

1. Confirmar reglas de cálculo en etapa 0.
2. Preparar estructura y backend NestJS.
3. MongoDB y modelos.
4. Autenticación Google.
5. Vehículo e historial persistente.
6. Mapbox y planificación real de rutas.
7. Viaje compartido y reparto de gastos.
8. Delivery y optimización de paradas.
9. GPS opcional, reportes y preparación de producción.

## Variables de entorno previstas

```env
# Backend
PORT=3000
MONGODB_URI=
GOOGLE_CLIENT_ID=
SESSION_SECRET=
MAPBOX_SECRET_TOKEN=

# Frontend (solo token público restringido si el mapa se renderiza en el navegador)
VITE_MAPBOX_PUBLIC_TOKEN=
VITE_API_BASE_URL=http://localhost:3000
```

No guardar archivos `.env` reales en el repositorio. Añadir `.env.example` con valores vacíos o de ejemplo no funcionales.
