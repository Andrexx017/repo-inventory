# Casos de Uso — Sistema de Inventario Multi-Sucursal

> Elaborado según la sección 6.2 de `requirements/Prueba Tecnica Inventario.pdf`. Es la base textual del **Diagrama de Casos de Uso** obligatorio (Fase 2, sección 7.1) — cada caso de uso listado aquí es un óvalo del diagrama; cada actor, un muñeco. Los IDs "RF-xx" referencian `requirements/documento-requisitos.md` para trazabilidad.

## 1. Actores

| Actor | Rol en BD (`roles.code`) | Descripción | Alcance |
|---|---|---|---|
| **Administrador general** | `general_admin` | Gestiona configuración, usuarios y sucursales. Visibilidad y permisos totales sobre todo el sistema. | Toda la red de sucursales |
| **Gerente de sucursal** | `branch_manager` | Supervisa las operaciones de su sucursal, aprueba transferencias y consulta reportes. | Su propia sucursal (+ lectura de otras para transferencias) |
| **Operador de inventario** | `inventory_operator` | Ejecuta el trabajo operativo diario: ingresos, retiros, ventas, compras, solicitudes de transferencia. | Su propia sucursal |
| **Sistema externo** (opcional) | — | ERP o punto de venta externo que se integra vía API. Fuera del alcance obligatorio de esta entrega (ver SUP-04 en `documento-requisitos.md`). | Según los endpoints que se expongan |

Nota de diseño: los tres roles humanos son jerárquicos en permisos (Administrador ⊇ Gerente ⊇ Operador dentro de su sucursal), pero **no** en el sentido de que uno "herede" literalmente los casos de uso del otro en el diagrama UML — cada uno tiene su propio conjunto, con superposición donde comparten módulo.

## 2. Matriz actor × módulo

| Módulo | Administrador general | Gerente de sucursal | Operador de inventario |
|---|:---:|:---:|:---:|
| Autenticación | ✔ | ✔ | ✔ |
| Usuarios y sucursales (gestión) | ✔ | — | — |
| Inventario (consulta propia) | ✔ | ✔ | ✔ |
| Inventario (consulta otras sucursales) | ✔ | ✔ | ✔ |
| Inventario (ingresos/retiros) | — | ✔ (supervisión) | ✔ (ejecución) |
| Compras | — | ✔ (aprueba/consulta) | ✔ (registra) |
| Ventas | — | ✔ (consulta) | ✔ (registra) |
| Transferencias (solicitar) | ✔ | ✔ | ✔ |
| Transferencias (aprobar envío/recepción) | ✔ | ✔ | ✔ (ejecución operativa) |
| Logística (reportes) | ✔ | ✔ (de su sucursal/rutas) | — |
| Dashboard (propio) | ✔ | ✔ | — |
| Dashboard (comparativo entre sucursales) | ✔ (exclusivo) | — | — |

## 3. Catálogo de casos de uso por actor

### 3.1. Administrador general
- UC-01 Iniciar sesión (RF-01)
- UC-02 Gestionar usuarios (crear/editar/desactivar, asignar rol y sucursal) (RF-02)
- UC-03 Gestionar sucursales (crear/editar/desactivar) (RF-03)
- UC-04 Consultar inventario de cualquier sucursal (RF-06)
- UC-05 Consultar dashboard comparativo entre sucursales (RF-33)
- UC-06 Aprobar/supervisar transferencias entre sucursales (RF-20–RF-24)
- UC-07 Consultar reportes de cumplimiento logístico globales (RF-28)

### 3.2. Gerente de sucursal
- UC-01 Iniciar sesión (RF-01)
- UC-08 Consultar inventario de su sucursal (RF-05)
- UC-04 Consultar inventario de otra sucursal (RF-06)
- UC-09 Aprobar orden de compra (RF-12)
- UC-10 Consultar histórico de compras/ventas de su sucursal (RF-14, RF-19)
- UC-11 Aprobar / confirmar recepción de transferencia (completa o parcial) (RF-23, RF-24)
- UC-12 Consultar dashboard de su sucursal (RF-29–RF-32)
- UC-13 Consultar reportes de cumplimiento logístico de su sucursal/rutas (RF-28)

### 3.3. Operador de inventario
- UC-01 Iniciar sesión (RF-01)
- UC-08 Consultar inventario de su sucursal (RF-05)
- UC-04 Consultar inventario de otra sucursal (RF-06)
- UC-14 Registrar ingreso de producto (compra, devolución, ajuste) (RF-07)
- UC-15 Registrar retiro de producto (venta, merma, ajuste) (RF-08)
- UC-16 Registrar orden de compra a proveedor (RF-12)
- UC-17 Confirmar recepción de compra (RF-13)
- UC-18 Registrar venta (RF-16–RF-19)
- UC-19 Solicitar transferencia desde otra sucursal (RF-20)
- UC-20 Preparar/despachar transferencia solicitada por otra sucursal (RF-21, RF-22)
- UC-11 Confirmar recepción de transferencia (completa o parcial) (RF-23, RF-24)

### 3.4. Sistema externo (opcional)
- UC-21 Consultar catálogo/inventario vía API (fuera de alcance obligatorio)
- UC-22 Registrar venta/compra vía API (fuera de alcance obligatorio)

## 4. Casos de uso detallados

Se detallan los 4 casos de uso más críticos del sistema — los que involucran más reglas de negocio y son los que además se piden como **diagrama de actividades** obligatorio (sección 7.1).

---

### UC-18 — Registrar venta

- **Actor primario:** Operador de inventario
- **Precondición:** el usuario tiene sesión activa; el producto existe en el catálogo de su sucursal.
- **Flujo principal:**
  1. El operador selecciona el producto y la cantidad a vender.
  2. El sistema valida que exista stock suficiente en la sucursal (RF-17).
  3. El operador aplica descuento o lista de precio si corresponde (RF-18).
  4. El sistema confirma la venta, descuenta el stock y registra el movimiento de inventario (retiro) con fecha, responsable y motivo "venta" (RF-08, RF-11).
  5. El sistema genera el comprobante de venta (RF-19).
- **Flujo alternativo:** si no hay stock suficiente (paso 2), el sistema rechaza la operación y no se genera ningún movimiento.
- **Postcondición:** el inventario de la sucursal queda actualizado; existe un comprobante de venta y un movimiento de inventario trazable.

---

### UC-19 a UC-11 — Transferencia de producto entre sucursales (flujo de 5 pasos)

- **Actores:** Operador de inventario o Gerente de sucursal (destino, solicita) → Operador de inventario (origen, despacha) → Operador/Gerente (destino, recibe).
- **Precondición:** ambas sucursales existen; el producto existe en el catálogo.
- **Flujo principal:**
  1. **Solicitud (UC-19):** la sucursal destino genera una solicitud indicando producto, cantidad y sucursal de origen (RF-20).
  2. **Preparación (UC-20):** la sucursal origen revisa disponibilidad y confirma o ajusta la cantidad a enviar (RF-21).
  3. **Despacho (UC-20):** se registra el envío con fecha estimada de llegada y transportista (RF-22).
  4. **Recepción completa (UC-11):** la sucursal destino confirma que llegó todo lo despachado; el inventario destino se actualiza automáticamente (RF-23).
  5. **Recepción parcial (UC-11, alternativo al paso 4):** si falta cantidad, se registra el faltante, se genera una alerta y se define un tratamiento: reenvío, ajuste o reclamación (RF-24).
- **Postcondición:** el inventario de origen y destino reflejan el movimiento; queda registro trazable de cada paso del ciclo (relevante para el módulo de Logística, RF-25–RF-28).

---

### UC-05 — Consultar dashboard comparativo entre sucursales

- **Actor primario:** Administrador general (exclusivo — RF-33)
- **Precondición:** existen datos de ventas/inventario en al menos dos sucursales.
- **Flujo principal:**
  1. El administrador accede al dashboard general.
  2. El sistema calcula y muestra: ventas del mes vs. meses anteriores por sucursal (RF-29), rotación de inventario (RF-30), estado de transferencias activas (RF-31), productos por agotarse (RF-32).
  3. El sistema presenta una comparativa de rendimiento entre sucursales.
- **Postcondición:** ninguna (caso de uso de solo lectura).

---

### UC-02 — Gestionar usuarios

- **Actor primario:** Administrador general
- **Precondición:** el administrador tiene sesión activa.
- **Flujo principal:**
  1. El administrador crea un usuario indicando nombre, email, contraseña inicial, rol y (si aplica) sucursal (RF-02).
  2. El sistema valida que solo el rol `general_admin` pueda quedar sin sucursal asignada.
  3. El sistema almacena la contraseña con hash (RNF-02) y activa el usuario.
- **Flujo alternativo:** el administrador desactiva un usuario existente, que deja de poder iniciar sesión sin perder su historial de movimientos previos (trazabilidad, RNF-10).
- **Postcondición:** el usuario queda disponible para iniciar sesión y operar según su rol.

---

*Última actualización: 22/08/2026. Trazable con `requirements/documento-requisitos.md` (RF-xx) y base del Diagrama de Casos de Uso y del Diagrama de Actividades de la Fase 2.*
