# Decisiones Técnicas — Frontend

## Framework: React 19 + Vite

**Contexto:** el frontend debe ser una interfaz responsiva que se comunique con el backend exclusivamente vía API, sin lógica de negocio en el cliente, integrada en el flujo de contenedorización general del proyecto.

**Decisión:** React 19 como librería de UI, con Vite como build tool / dev server.

**Justificación:**
- React tiene el ecosistema más grande de librerías para lo que necesita un dashboard analítico (gráficas, tablas de datos, formularios de inventario/compras/ventas/transferencias), lo que reduce tiempo de desarrollo frente a construir todo desde cero.
- El modelo de componentes + hooks encaja con un dominio de UI con mucho estado compartido entre módulos (estado de una transferencia en curso, validación de stock antes de confirmar venta, filtros de dashboard).
- Vite da arranque y HMR casi instantáneos frente a bundlers tradicionales (Webpack/CRA), relevante en una prueba con tiempo acotado donde se itera rápido sobre varias pantallas.
- El build de producción de Vite genera assets estáticos optimizados, servibles desde un contenedor liviano (ej. Nginx), coherente con el requisito de contenedorización aislada por servicio.
- El scaffold ya trae ESLint configurado (`eslint-plugin-react-hooks`, `react-refresh`), dando una base de calidad de código lista para usar desde el primer commit.

**Alternativas consideradas:**
- Vue 3 — descartado por preferir el ecosistema con más componentes de dashboard/analytics ya construidos (charting, tablas) disponibles para React.
- Next.js — descartado porque el proyecto es una SPA que consume una API REST propia; no hay necesidad de SSR ni de routing de servidor, y añadirlo sería complejidad innecesaria para el alcance definido.

**Consecuencias:** en producción el frontend se sirve como build estático (sin runtime de Node en el contenedor final si se usa un Dockerfile multi-stage), manteniendo la imagen final ligera.

---

## Consumo de autenticación (JWT emitido por el backend)

**Contexto:** el backend autentica con JWT Bearer (ver `backend/docs/decisions.md`). El frontend necesita guardar ese token, adjuntarlo en cada llamada a la API y ocultar/proteger rutas según el rol del usuario, sin poner lógica de negocio en el cliente (regla obligatoria de la sección 5 del PDF — aquí solo se decide *dónde vive el token*, la validación real de permisos siempre ocurre en el backend).

**Decisión:** el token se guarda en memoria (estado de React vía Context/Provider), no en `localStorage`. Un cliente HTTP centralizado (wrapper de `fetch`) añade el header `Authorization: Bearer <token>` a cada request y captura respuestas `401` para forzar logout. Rutas protegidas con un componente `ProtectedRoute` que redirige a `/login` si no hay sesión, y oculta/deshabilita opciones de UI según `role` — solo como cortesía visual, ya que el backend vuelve a validar cada permiso.

**Justificación:**
- Guardar el token en memoria evita exponerlo a un ataque XSS que lea `localStorage` (cualquier script inyectado en la página tiene acceso a `localStorage`, pero no a una variable de estado de React fuera del bundle).
- Es coherente con la regla de "no lógica de negocio en el cliente": el frontend solo decide qué *mostrar*, no qué *permitir* — cada endpoint valida el rol/sucursal igual aunque alguien fuerce la UI.

**Alternativas consideradas:**
- `localStorage` — más simple (sobrevive a recargar la página) pero más expuesto a robo de token vía XSS; descartado por ser una prueba técnica donde se evalúa también la solidez del diseño de seguridad.
- Cookies `httpOnly` gestionadas por el backend — más seguras, pero exigen que backend y frontend compartan estrategia de dominio/CORS con credenciales, lo que añade complejidad de configuración en desarrollo (orígenes distintos) que no se justifica para el alcance de este proyecto.

**Consecuencias:** al recargar la página se pierde la sesión en memoria (no hay persistencia entre refrescos); se acepta como trade-off razonable para el alcance de la prueba y queda anotado como mejora futura implementar refresh token + almacenamiento más persistente si el tiempo lo permite.

---

## Organización de carpetas — Screaming Architecture por módulo (espejo del backend)

**Contexto:** hasta ahora el frontend agrupaba archivos por tipo técnico (`pages/`, `components/`), mezclando en cada componente la llamada a la API, el estado/lógica y el JSX de presentación. El backend ya había resuelto este mismo problema con Screaming Architecture (`backend/docs/decisions.md`, sección "Convención de carpetas del backend"): una carpeta por módulo funcional (`Auth`, `Catalog`, `Inventory`, ...), cada una con sus propias capas técnicas adentro. Se decidió replicar el mismo criterio en el frontend para que ambos lados del proyecto se lean igual y un módulo de negocio sea fácil de ubicar completo, sin saltar entre carpetas técnicas dispersas.

**Decisión:** `frontend/src/modules/<módulo>/`, uno por cada módulo del backend (`auth`, `catalog`, `inventory`, `purchases`, `sales`, `transfers`, `dashboard`, `reports` — en minúscula, convención JS, a diferencia del PascalCase de C#). Dentro de cada módulo, 3 capas:
- **`api/`** — funciones que envuelven `shared/apiClient.js` (una por entidad, ej. `branchesApi.js`), equivalente a los Repository del backend: solo llamadas HTTP, sin estado ni JSX.
- **`hooks/`** — un custom hook por pantalla (ej. `useBranches.js`) con el estado de React, los `useEffect` y los handlers (`handleSubmit`, `handleEdit`); llama a `api/`. Equivalente a los Service del backend: acá vive la lógica.
- **`pages/`** — el componente de página, solo JSX que consume el hook y su `.css` co-localizado. Equivalente a la vista que renderiza lo que el Service ya preparó.

Fuera de `modules/`, dos carpetas transversales (mismo criterio que `Infrastructure/`/`Shared/` en el backend, que tampoco pertenecen a un módulo de negocio):
- **`shared/apiClient.js`** — el cliente HTTP centralizado, usado por el `api/` de todos los módulos.
- **`shared/components/`** — guards de ruteo (`RequireAuth`, `RequireRole`) que envuelven rutas de cualquier módulo, no son parte del dominio de ninguno en particular.
- **`pages/Home.jsx`** queda fuera de `modules/` a propósito: es el shell/landing de la SPA (navegación entre módulos tras el login), no la pantalla de un módulo de negocio específico.

**Justificación:**
- Mismo argumento que ya justificó Screaming Architecture en el backend: la carpeta raíz "grita" el dominio del sistema (`modules/inventory`, `modules/sales`) en vez de gritar el framework (`pages/`, `hooks/` sueltos a nivel raíz).
- Separar `api/`/`hooks/`/`pages/` hace testeable la lógica sin renderizar el DOM (un hook se puede probar aislado) y reutilizable sin duplicar JSX (dos pantallas podrían compartir un hook si hiciera falta).
- Trazabilidad 1 a 1 con el backend: quien lee `backend/Modules/Inventory/` y `frontend/src/modules/inventory/` entiende que hablan del mismo módulo de negocio, aunque las capas internas no se llamen igual (Controller/Service/Repository vs. pages/hooks/api).

**Alternativas consideradas:**
- Mantener `pages/`/`components/` a nivel raíz (organización por tipo técnico) — descartada porque ya mostraba el problema que Screaming Architecture resuelve en el backend: para tocar "Sucursales" había que abrir `pages/Branches.jsx` sin ninguna carpeta que agrupara su lógica o sus llamadas a la API relacionadas.
- Un solo archivo por pantalla (JSX + estado + llamadas a la API juntos, como estaba antes) — más rápido de escribir al principio, pero mezcla 3 responsabilidades distintas en un mismo archivo, dificultando probar la lógica sin renderizar y reusarla entre pantallas.

**Consecuencias:** cada pantalla nueva agrega 3 archivos en vez de 1 (más ceremonia por pantalla chica), pero el criterio ya está probado y documentado en el backend, así que no es una convención nueva que inventar — solo aplicarla del lado del cliente. Los módulos sin pantalla todavía (`inventory`, `purchases`, `sales`, `transfers`, `dashboard`, `reports`) existen como carpeta vacía con `.gitkeep`, mismo patrón que usó el backend en su commit 7 (`RUTA.md`) para las carpetas de módulo antes de tener contenido real.

---

## Contenedorización del frontend

**Decisión:** el frontend se empaqueta como imagen Docker independiente (build de Vite servido por un servidor estático), orquestada junto a `backend` y `postgres` en `docker-compose.yml`.

**Justificación:** cumple el requisito de levantar todo el proyecto con `docker compose up` sin pasos manuales, y aísla el servidor de assets estáticos del resto de servicios.

**Pendiente:** `docker-compose.yml` aún no define el servicio del frontend — falta documentar aquí la imagen base elegida para servir el build (ej. `nginx:alpine`) cuando se implemente.
