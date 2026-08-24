# Reglas de negocio críticas — responsabilidad del backend

> Postgres puede garantizar muchas reglas por sí solo con `CHECK`, `UNIQUE` y claves foráneas — y el esquema (`database/init/01-schema.sql`) ya usa bastante eso (`current_quantity >= 0`, `origin_branch_id <> destination_branch_id`, etc.). Pero hay reglas que **necesitan mirar otra tabla o combinar varias filas**, y eso Postgres no lo puede expresar como restricción declarativa. Esas reglas no desaparecen: alguien tiene que aplicarlas, y ese alguien es el backend, en la Fase 4. Este documento existe para que no se te "olvide" ninguna al construir el CRUD — si una regla vive solo en la cabeza de quien programa y no queda escrita en ningún lado, es fácil que se pierda.

## ¿Por qué la base de datos no puede solita?

Un `CHECK` en Postgres solo puede mirar **columnas de la misma fila** que está insertando o actualizando. No puede decir "revisa si el rol de esta fila es `general_admin` consultando la tabla `roles`" — eso es una subconsulta, y Postgres no permite `CHECK` con subconsultas a otra tabla. Tampoco puede decir "la suma de estas 10 filas de `sale_items` debe ser igual al `total` de `sales`" — eso son varias filas combinadas, otra vez fuera del alcance de un `CHECK`. Para esos casos existen 3 herramientas: **validación en el backend** (la más simple, la que vamos a usar), **triggers de base de datos** (más robusto pero más complejo, normalmente se reserva para reglas muy críticas de integridad) o **constraints diferidos + procedimientos** (poco común fuera de sistemas muy grandes). Para el alcance de esta prueba, validación en el backend es la elección correcta — es lo que ya asumen los comentarios del propio esquema SQL.

## Las reglas, una por una

### RN-CRIT-01 — Solo el Administrador general puede no tener sucursal

**Por qué la BD no la garantiza:** requiere consultar `roles` para saber si el `role_id` de la fila corresponde a `general_admin`; `CHECK` no permite subconsultas a otra tabla.

**Dónde validarla:** en el servicio/handler que crea o edita un `User` (módulo de Fase 4, punto 2), antes de guardar. Ejemplo de la forma de la validación (no importa aún si termina en un servicio, un `IValidator` de FluentValidation o un método del propio agregado `User` — eso depende de la Decisión 3, patrones de diseño, que sigue pendiente):

```csharp
if (role.Code != "general_admin" && branchId is null)
    throw new DomainException("Solo el Administrador general puede no tener sucursal asignada.");

if (role.Code == "general_admin" && branchId is not null)
    throw new DomainException("El Administrador general no debe tener sucursal asignada.");
```

**Si se viola:** un Gerente u Operador sin sucursal rompería toda la autorización por sucursal (RNF-01) — no sabrías contra qué `branch_id` comparar sus permisos.

### RN-CRIT-02 — Los totales de `purchase_orders` y `sales` deben reflejar la suma de sus líneas

**Por qué la BD no la garantiza:** `subtotal`, `total_discount` y `total` viven en la tabla cabecera; las líneas que los originan viven en otra tabla (`purchase_order_items` / `sale_items`). Postgres no soporta columnas `GENERATED` que agreguen datos de otra tabla.

**Dónde validarla:** cada vez que se agregue, edite o elimine una línea, el servicio debe recalcular y guardar los totales de la cabecera **dentro de la misma transacción** (ver RN-CRIT-04). No delegar el cálculo al frontend — eso violaría además la regla obligatoria del PDF de "cero lógica de negocio en el cliente".

**Si se viola:** el comprobante de venta o la orden de compra mostrarían un total que no corresponde a lo realmente vendido/comprado — un problema serio si se usa para cobrar o pagar.

### RN-CRIT-03 — Validar stock disponible *antes* de confirmar una venta (RF-17)

**Por qué la BD no la garantiza del todo:** sí existe una red de seguridad a nivel de base de datos (`inventory.current_quantity >= 0` vía `CHECK`), pero confiar solo en eso significa enterarte del problema por una excepción de base de datos después de haber intentado la operación — una experiencia de usuario pobre y, peor, si la venta y el descuento de stock no están bien encadenados, podrías terminar con un `sale` registrado pero sin el movimiento de inventario correspondiente.

**Dónde validarla:** el servicio de Ventas debe leer el `current_quantity` de `inventory` para ese `branch_id` + `product_id` **antes** de confirmar la venta, y rechazar con un mensaje claro si no alcanza — el `CHECK >= 0` de la base de datos queda como última red de seguridad, no como mecanismo principal.

**Si se viola:** se vendería stock inexistente, o la venta fallaría con un error de base de datos poco claro para el usuario.

### RN-CRIT-04 — Atomicidad: un movimiento de inventario y la actualización de `inventory.current_quantity` deben ocurrir juntos o no ocurrir (RNF-07)

**Por qué la BD no la garantiza sola:** son dos `UPDATE`/`INSERT` a tablas distintas (`inventory_movements` e `inventory`); si el backend los ejecuta como dos operaciones independientes y la segunda falla, queda un movimiento registrado que nunca afectó el stock real.

**Dónde validarla:** cada operación que toque inventario (venta, compra, transferencia, ajuste) debe envolver el `INSERT` en `inventory_movements` y el `UPDATE` de `inventory.current_quantity` en **una sola transacción de EF Core** (`BeginTransaction` / `SaveChanges` conjunto). Esto es aún más importante en una transferencia, donde una misma operación toca inventario de **dos sucursales** (origen y destino) — ambos cambios deben ser atómicos.

**Si se viola:** el historial de movimientos (que se supone es la fuente de verdad auditable, RF-11) dejaría de coincidir con el stock real — el peor tipo de bug para un sistema de inventario.

### RN-CRIT-05 — En una transferencia, `received_quantity` no debe superar `shipped_quantity`

**Por qué la BD no la garantiza:** ambas columnas están en la misma fila (`transfer_items`), así que técnicamente *sí* se podría expresar como `CHECK (received_quantity <= shipped_quantity)` — pero no está en el esquema actual porque la recepción parcial se registra en varios momentos (primero se despacha, después se recibe), y un `CHECK` se evalúa en cada `UPDATE`, incluyendo el momento en que `shipped_quantity` aún es 0 y `received_quantity` también — así que hay que decidir bien la secuencia de escritura. Lo más simple y explícito es validarlo en el backend, donde además puedes dar un mensaje de error útil.

**Dónde validarla:** el servicio de Transferencias, en el paso de "confirmación de recepción" (RF-23/RF-24).

**Si se viola:** el campo `difference` (columna generada) daría un faltante negativo — recibiste más de lo que se te envió, lo cual no tiene sentido de negocio y probablemente indica un bug o una recepción duplicada.

## Cómo usar este documento en la Fase 4

Cuando implementes cada módulo, revisa esta lista y verifica que la regla correspondiente quede cubierta por al menos una prueba unitaria (Fase 4, punto 12 del plan: "tests backend mínimos... validación de stock, flujo de transferencias" ya apunta directo a RN-CRIT-03 y RN-CRIT-05). Dónde exactamente vive el código de cada validación (¿un método del propio agregado `User`/`Sale`? ¿un `Validator` separado? ¿un `Handler` de CQRS?) se termina de definir con la Decisión 3 (patrones de diseño), que sigue pendiente.

---

*Última actualización: 22/08/2026.*
