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

## Contenedorización del frontend

**Decisión:** el frontend se empaqueta como imagen Docker independiente (build de Vite servido por un servidor estático), orquestada junto a `backend` y `postgres` en `docker-compose.yml`.

**Justificación:** cumple el requisito de levantar todo el proyecto con `docker compose up` sin pasos manuales, y aísla el servidor de assets estáticos del resto de servicios.

**Pendiente:** `docker-compose.yml` aún no define el servicio del frontend — falta documentar aquí la imagen base elegida para servir el build (ej. `nginx:alpine`) cuando se implemente.
