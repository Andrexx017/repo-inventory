# Documento de Requisitos — Sistema de Inventario Multi-Sucursal

> Elaborado según la sección 6.1 de `requirements/Prueba Tecnica Inventario.pdf`. Complementa (no reemplaza) a `requirements/analisis-requerimientos.md`.

## 1. Requisitos funcionales (RF)

### 1.1. Autenticación y gestión de usuarios/sucursales

| ID | Requisito |
|---|---|
| RF-01 | El sistema debe permitir iniciar sesión con email y contraseña, devolviendo un token de sesión válido según el rol del usuario. |
| RF-02 | El sistema debe permitir al Administrador general crear, editar y desactivar usuarios, asignándoles un rol (Administrador general, Gerente de sucursal, Operador de inventario) y, salvo para el Administrador general, una sucursal. |
| RF-03 | El sistema debe permitir al Administrador general crear, editar y desactivar sucursales. |
| RF-04 | El sistema debe restringir cada acción según el rol del usuario autenticado: el Administrador general tiene visibilidad y permisos totales; el Gerente de sucursal opera y aprueba solo dentro de su propia sucursal; el Operador de inventario ejecuta movimientos operativos (ingresos, retiros, ventas, compras, solicitudes de transferencia) dentro de su sucursal. |

### 1.2. Gestión de inventario

| ID | Requisito |
|---|---|
| RF-05 | El sistema debe permitir visualizar el catálogo de productos de la sucursal del usuario autenticado. |
| RF-06 | El sistema debe permitir consultar el inventario (existencias) de cualquier otra sucursal de la red, en modo solo lectura. |
| RF-07 | El sistema debe permitir registrar ingresos de producto al inventario, con motivo (compra, devolución, ajuste), cantidad, fecha y responsable. |
| RF-08 | El sistema debe permitir registrar retiros de producto del inventario, con motivo (venta, merma, ajuste), cantidad, fecha y responsable. |
| RF-09 | El sistema debe permitir definir un stock mínimo por producto y sucursal, y generar una alerta cuando el stock disponible caiga en o por debajo de ese umbral. |
| RF-10 | El sistema debe permitir asociar a un producto múltiples unidades de medida (ej. unidad, caja, kilogramo) con su factor de conversión. |
| RF-11 | El sistema debe registrar cada movimiento de inventario (ingreso o retiro) con fecha, responsable, motivo y cantidad, de forma inmutable, para garantizar un historial auditable. |

### 1.3. Compras

| ID | Requisito |
|---|---|
| RF-12 | El sistema debe permitir crear y gestionar órdenes de compra a proveedores, incluyendo producto, cantidad, precio unitario, descuentos y plazo de pago. |
| RF-13 | El sistema debe actualizar automáticamente el inventario de la sucursal al confirmarse la recepción de una orden de compra. |
| RF-14 | El sistema debe mantener un histórico de compras consultable por proveedor y por producto. |
| RF-15 | El sistema debe calcular y mantener actualizado el costo promedio ponderado de cada producto en cada sucursal, recalculándolo con cada recepción de compra. |

### 1.4. Ventas

| ID | Requisito |
|---|---|
| RF-16 | El sistema debe permitir registrar una venta indicando producto, cantidad y precio, asociada a sucursal, fecha y responsable. |
| RF-17 | El sistema debe validar que exista stock suficiente en la sucursal antes de confirmar una venta, rechazándola si no lo hay. |
| RF-18 | El sistema debe permitir aplicar descuentos y utilizar distintas listas de precio al registrar una venta. |
| RF-19 | El sistema debe generar un comprobante o registro de venta consultable posteriormente. |

### 1.5. Transferencias entre sucursales

| ID | Requisito |
|---|---|
| RF-20 | El sistema debe permitir a una sucursal (o a un Administrador general) generar una solicitud de transferencia indicando producto, cantidad y sucursal de origen. |
| RF-21 | El sistema debe permitir a la sucursal origen revisar la disponibilidad y confirmar o ajustar la cantidad a enviar antes del despacho. |
| RF-22 | El sistema debe permitir registrar el despacho de una transferencia con fecha estimada de llegada y transportista. |
| RF-23 | El sistema debe permitir confirmar la recepción completa de una transferencia, actualizando automáticamente el inventario de la sucursal destino. |
| RF-24 | El sistema debe permitir confirmar una recepción parcial, registrando la diferencia (faltante), generando una alerta y permitiendo definir un tratamiento (reenvío, ajuste o reclamación). |

### 1.6. Logística

| ID | Requisito |
|---|---|
| RF-25 | El sistema debe registrar y permitir consultar el tiempo estimado y el tiempo real de entrega de cada transferencia. |
| RF-26 | El sistema debe permitir clasificar rutas por prioridad, costo o tiempo. |
| RF-27 | El sistema debe mostrar el estado actual de cada transferencia en curso (en preparación, en tránsito, recibido, con faltantes). |
| RF-28 | El sistema debe generar reportes de cumplimiento logístico agrupables por sucursal y por ruta. |

### 1.7. Dashboard y análisis

| ID | Requisito |
|---|---|
| RF-29 | El sistema debe mostrar el volumen de ventas del mes en curso comparado con meses anteriores. |
| RF-30 | El sistema debe mostrar la rotación de inventario, identificando productos de alta y baja demanda. |
| RF-31 | El sistema debe mostrar el estado de las transferencias activas y su impacto en el inventario. |
| RF-32 | El sistema debe mostrar indicadores de productos próximos a agotarse según su stock mínimo. |
| RF-33 | El sistema debe mostrar una comparativa de rendimiento entre sucursales, visible únicamente para el rol Administrador general. |

### 1.8. Funcionalidad adicional

| ID | Requisito |
|---|---|
| RF-34 | El sistema debe generar alertas de stock cuando un producto cruce (por arriba o por abajo) un umbral configurable de existencias por sucursal, permitir marcar cada alerta como resuelta (con responsable y fecha), y opcionalmente notificarla por correo. **(Decidida — "Sistema de alertas inteligentes", ver `database/docs/decisions.md`.)** |
| RF-35 | El sistema debe permitir exportar a PDF o Excel los movimientos de inventario, ventas o transferencias de un rango de fechas dado. **(Decidida — "Reportes exportables", ver `database/docs/decisions.md`.)** |

## 2. Requisitos no funcionales (RNF)

| ID | Categoría | Requisito |
|---|---|---|
| RNF-01 | Seguridad | El sistema debe autenticar cada request a la API mediante un token firmado (JWT) y autorizar cada operación según el rol y la sucursal del usuario — ninguna regla de negocio debe validarse únicamente en el frontend. |
| RNF-02 | Seguridad | Las contraseñas deben almacenarse siempre con hash (nunca en texto plano), y las credenciales/secretos (claves de firma JWT, contraseña de base de datos) deben vivir en variables de entorno, nunca versionadas en el repositorio. |
| RNF-03 | Rendimiento | Las consultas de catálogo, inventario y dashboard de una sucursal deben responder en un tiempo percibido como interactivo (objetivo de referencia: <2s) bajo condiciones normales de uso en el entorno de la prueba. |
| RNF-04 | Escalabilidad | La arquitectura backend debe ser stateless (sin sesión en memoria del servidor) para permitir, en el futuro, ejecutar múltiples instancias del backend sin cambios de diseño. |
| RNF-05 | Escalabilidad | El modelo de datos debe soportar el crecimiento en número de sucursales, productos y movimientos sin requerir cambios estructurales al esquema. |
| RNF-06 | Usabilidad | La interfaz debe ser responsiva y utilizable tanto en pantallas de escritorio como en dispositivos con pantallas más pequeñas, priorizando claridad sobre densidad de información (especialmente en el dashboard). |
| RNF-07 | Consistencia de datos | Las operaciones que afectan inventario (confirmación de compra, venta, transferencia) deben ser atómicas: no debe quedar un movimiento a medias que deje el stock en un estado inconsistente. |
| RNF-08 | Mantenibilidad | El backend debe separar claramente las responsabilidades de negocio de las de acceso a datos, para facilitar pruebas y cambios futuros. **(Decidida — arquitectura en capas + Repository por agregado + Unit of Work vía `DbContext` + Service Layer + DTOs + Strategy para reportes, ver `backend/docs/decisions.md`.)** |
| RNF-09 | Portabilidad/Despliegue | Todo el sistema debe poder levantarse en cualquier máquina con Docker instalado usando un único comando (`docker compose up`), sin pasos de configuración manual adicionales. |
| RNF-10 | Auditabilidad | Todo movimiento de inventario debe quedar registrado de forma que pueda reconstruirse el historial completo de un producto en una sucursal (quién, cuándo, por qué, cuánto). |

## 3. Restricciones

### 3.1. Restricciones técnicas (impuestas por el PDF, sección 5 — sin excepción)

| ID | Restricción |
|---|---|
| RT-01 | La solución debe tener mínimo 3 capas separadas: frontend, backend y base de datos, cada una con responsabilidades claramente definidas. |
| RT-02 | El frontend debe comunicarse con el backend exclusivamente a través de una API bien definida (REST). Ninguna lógica de negocio debe residir en el cliente. |
| RT-03 | Todo el proyecto debe poder ejecutarse con un solo comando usando Docker Compose, sin dependencias de configuración manual en el entorno local. |
| RT-04 | El stack tecnológico es libre, pero cada elección debe estar justificada técnicamente (ya cubierto en `backend/docs/decisions.md`, `frontend/docs/decisions.md`, `database/docs/decisions.md`). |

### 3.2. Restricciones de negocio

| ID | Restricción |
|---|---|
| RN-01 | Fecha límite de entrega: 05/09/2026 (ver `requirements/plan-trabajo.md`). |
| RN-02 | El repositorio debe ser público en GitHub, con historial de commits representativo del proceso (no un único commit final). |
| RN-03 | El repositorio no debe contener `.env`, `node_modules`, `obj/`, `bin/` ni artefactos de build. |
| RN-04 | El proyecto debe incluir evidencia documentada del uso de IA durante el desarrollo (herramientas, prompts, evaluación crítica, % estimado de asistencia). Ver `requirements/uso-de-ia.md`. |

## 4. Supuestos y dependencias

| ID | Supuesto / Dependencia | Estado |
|---|---|---|
| SUP-01 | El sistema opera con **una única base de datos PostgreSQL central** compartida por todas las sucursales (no una base de datos por sucursal). | **Confirmado (22/08/2026)** — decisión formal de arquitectura, justificada en `database/docs/decisions.md` ("Sincronización de inventario entre sucursales: base de datos central única"). Deja de ser un supuesto para ser una decisión. |
| SUP-02 | Los usuarios del sistema son dados de alta por un Administrador general; no existe auto-registro público de usuarios. | Asumido |
| SUP-03 | Cada sucursal existe previamente en el sistema (creada por el Administrador general) antes de poder operar con inventario, compras, ventas o transferencias. | Asumido |
| SUP-04 | El "Sistema externo (opcional)" (integración con ERP/POS vía API) queda fuera del alcance obligatorio de esta entrega; se documenta como posible extensión si el tiempo lo permite. | Asumido |
| SUP-05 | El entorno de evaluación cuenta con Docker y Docker Compose instalados; no se asume acceso a internet para dependencias en tiempo de ejecución del contenedor (solo en build). | Asumido |
| SUP-06 | Los precios y costos se manejan en una sola moneda (no se requiere multi-moneda). | **Confirmado (01/09/2026)** — no existe ningún campo `currency`/moneda en el esquema (`database/init/01-schema.sql`) ni en las entidades de Catalog/Sales/Purchases. |
| DEP-01 | Los módulos de Compras, Ventas, Transferencias y Dashboard dependen de que el módulo de Autenticación/Usuarios/Sucursales y el módulo de Catálogo/Inventario estén implementados primero (ver orden de dependencia en Fase 4 del plan de trabajo). | **Resuelta (01/09/2026)** — los 8 módulos (Auth, Catalog, Inventory, Purchases, Sales, Transfers, Dashboard, Reports) ya están implementados en backend y frontend, en ese orden de dependencia. |
| DEP-02 | El mecanismo de sincronización de inventario entre sucursales (base de datos central, ver `database/docs/decisions.md`) condiciona el diseño del módulo de Inventario y de Transferencias: al ser una sola base, ambos módulos se implementan con transacciones normales, sin lógica de sincronización adicional. | Resuelta (22/08/2026) |
| DEP-03 | El backend depende de una cuenta de **Gmail con contraseña de aplicación** (`SMTP_USER`/`SMTP_PASSWORD`, vía MailKit contra `smtp.gmail.com:587`) para dos funcionalidades ya implementadas: recuperación de contraseña (`POST /api/auth/forgot-password`) y notificación por correo de alertas de stock (RF-34, detrás del flag `Alerts:NotifyByEmail`). Sin esta cuenta configurada en `.env`, ambas funcionalidades fallan o quedan inactivas (la de alertas falla en silencio por diseño; ver `backend/docs/decisions.md`). | Dependencia externa activa — pendiente de confirmar que el evaluador reciba credenciales SMTP válidas o que se documente cómo generarlas (cuenta Gmail + verificación en 2 pasos + contraseña de aplicación). |

---

*Última actualización: 01/09/2026. Las 3 decisiones de arquitectura de Fase 1 (autenticación, sincronización entre sucursales, patrones de diseño del backend) quedaron cerradas — ver `backend/docs/decisions.md` y `database/docs/decisions.md`. Los 8 módulos funcionales (backend y frontend) ya están implementados; pendientes de Fase 7: tests backend, gráficas del dashboard, README raíz y sección de uso de IA — ver Trello.*
