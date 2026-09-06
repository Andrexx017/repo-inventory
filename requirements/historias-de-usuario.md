# Historias de Usuario — Sistema de Inventario Multi-Sucursal

> Elaborado según la sección 6.3 de `requirements/Prueba Tecnica Inventario.pdf` (recomendado, no obligatorio). Complementa `requirements/documento-requisitos.md` (RF-xx) y `requirements/casos-de-uso.md` (UC-xx) con la perspectiva de negocio: no solo *qué* hace el sistema, sino *para qué* le sirve a cada rol.
>
> Formato: **Como** \<rol\>, **quiero** \<acción\>, **para** \<beneficio\>. Las historias más críticas incluyen criterios de aceptación (Given/When/Then).

## Autenticación y usuarios

**HU-01.** Como **cualquier usuario**, quiero iniciar sesión con mi email y contraseña, para acceder únicamente a las funciones que correspondan a mi rol y sucursal. *(RF-01, UC-01)*

**HU-02.** Como **Administrador general**, quiero crear usuarios y asignarles un rol y una sucursal, para controlar quién puede operar el sistema y desde dónde. *(RF-02, UC-02)*

> **Criterios de aceptación:**
> - Given que soy Administrador general autenticado, When creo un usuario con rol distinto a "Administrador general" sin asignarle sucursal, Then el sistema rechaza la operación pidiendo una sucursal.
> - Given un usuario creado, When ese usuario inicia sesión, Then su token refleja su rol y su sucursal.

## Inventario

**HU-03.** Como **Operador de inventario**, quiero registrar el ingreso de productos con su precio de compra, para mantener el costo promedio del inventario actualizado y generar órdenes de pago a proveedores. *(RF-07, RF-15, UC-14 — ejemplo del PDF, sección 6.3)*

**HU-04.** Como **Operador de inventario**, quiero consultar el inventario de otra sucursal antes de solicitar una transferencia, para saber si realmente tiene el stock que necesito. *(RF-06, UC-04)*

**HU-05.** Como **Gerente de sucursal**, quiero recibir una alerta cuando un producto llegue a su stock mínimo, para reabastecerlo antes de quedarme sin inventario y perder ventas. *(RF-09)*

> **Criterios de aceptación:**
> - Given un producto con stock mínimo configurado en 10 unidades, When el stock disponible baja a 10 o menos tras un retiro, Then el sistema genera una alerta visible para el Gerente de esa sucursal.

## Compras

**HU-06.** Como **Operador de inventario**, quiero crear una orden de compra a un proveedor con precio, descuento y plazo de pago, para formalizar la adquisición antes de que llegue la mercancía. *(RF-12, UC-16)*

**HU-07.** Como **Gerente de sucursal**, quiero consultar el histórico de compras por proveedor, para negociar mejores condiciones comerciales con base en el volumen histórico. *(RF-14, UC-10)*

## Ventas

**HU-08.** Como **Operador de inventario**, quiero registrar una venta y que el sistema valide el stock disponible antes de confirmarla, para no vender algo que ya no tengo físicamente. *(RF-16, RF-17, UC-18)*

> **Criterios de aceptación:**
> - Given un producto con 5 unidades disponibles, When intento vender 8 unidades, Then el sistema rechaza la venta y no descuenta inventario.
> - Given un producto con 5 unidades disponibles, When vendo 3 unidades, Then el sistema confirma la venta, descuenta el stock a 2 y genera un comprobante.

## Transferencias entre sucursales

**HU-09.** Como **Operador de inventario**, quiero solicitar la transferencia de un producto desde otra sucursal con indicación de urgencia, para que la sucursal origen pueda priorizar el despacho según disponibilidad. *(RF-20, UC-19 — ejemplo del PDF, sección 6.3)*

**HU-10.** Como **Operador de inventario** (sucursal origen), quiero confirmar o ajustar la cantidad disponible antes de despachar una transferencia, para no comprometerme a enviar algo que ya no tengo completo. *(RF-21, UC-20)*

**HU-11.** Como **Gerente de sucursal** (destino), quiero registrar una recepción parcial cuando falte producto, para dejar constancia del faltante y decidir si pido reenvío, ajusto el inventario o hago una reclamación. *(RF-24, UC-11)*

> **Criterios de aceptación:**
> - Given una transferencia despachada por 100 unidades, When confirmo recepción de solo 90, Then el sistema registra un faltante de 10, genera una alerta y me permite elegir tratamiento (reenvío/ajuste/reclamación).

## Logística

**HU-12.** Como **Gerente de sucursal**, quiero ver el tiempo real de entrega comparado con el estimado por ruta, para identificar qué transportistas o rutas cumplen peor y tomar decisiones logísticas. *(RF-25, RF-28)*

## Dashboard y análisis

**HU-13.** Como **Gerente de sucursal**, quiero ver en un dashboard la comparativa de ventas entre el mes actual y los tres meses anteriores, para identificar tendencias y tomar decisiones de compra anticipadas. *(RF-29, UC-12 — ejemplo del PDF, sección 6.3)*

**HU-14.** Como **Administrador general**, quiero ver una comparativa de rendimiento entre todas las sucursales, para identificar cuáles necesitan apoyo o están teniendo mejores resultados. *(RF-33, UC-05)*

## Funcionalidad adicional

**HU-15.** Como **Gerente de sucursal**, quiero recibir una alerta automática cuando el stock de un producto crítico cruce el umbral mínimo o máximo configurado, para actuar antes de quedarme sin inventario (o con exceso), sin tener que estar revisando el dashboard manualmente. *(RF-34, "Sistema de alertas inteligentes" — decidida)*

> **Criterios de aceptación:**
> - Given un producto con `minimum_stock` = 10, When el stock baja a 10 o menos, Then se crea una alerta `low_stock` en estado `pending`, y no se crea una segunda alerta duplicada mientras la primera siga sin resolverse.
> - Given una alerta `pending`, When un Gerente la marca como atendida, Then queda `resolved` con su usuario y fecha registrados.

**HU-16.** Como **Administrador general**, quiero exportar a PDF o Excel los movimientos de inventario, ventas o transferencias de un rango de fechas, para compartir esa información fuera del sistema (ej. con contabilidad o con la gerencia general) sin depender de que alguien más tenga acceso a la aplicación. *(RF-35, "Reportes exportables" — decidida)*

---

*Última actualización: 22/08/2026. Funcionalidad adicional confirmada como plan firme (alertas inteligentes + reportes exportables). Historias sujetas a ajuste si aparecen nuevos detalles al implementar.*
