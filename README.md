# MyMoney — versión 2.1 corregida

Aplicación web instalable (PWA) para iPhone orientada a responder una pregunta principal:

> ¿Cuánto puedo gastar todavía este mes sin terminar en negativo?

## Funciones incluidas

- Panel principal con dinero disponible del mes.
- Límite orientativo diario y semanal.
- Semáforo de riesgo: verde, amarillo y rojo.
- Ingresos fijos mensuales.
- Gastos fijos mensuales.
- Gastos variables con fecha, categoría y notas.
- Límites opcionales por categoría.
- Sección completa “Mis financiaciones”.
- Cuota mensual, día de pago, cuotas pagadas, cuotas totales y mes final.
- Estimación de cuotas restantes y capital pendiente.
- Línea temporal de cuándo se liberan las cuotas.
- Alertas de carga financiera.
- Objetivos de ahorro con aportación mensual.
- Colchón mensual que no quieres gastar.
- Previsión de los próximos 12 meses.
- Calendario de pagos del mes.
- Simulador “¿Me lo puedo permitir?” al contado o financiado.
- Cierre de mes e historial.
- Exportación/importación de copia de seguridad.
- Exportación de gastos a CSV.
- Funcionamiento offline.
- Migración automática desde la primera versión si se abre en el mismo dominio/navegador.
- Datos guardados únicamente en el dispositivo mediante localStorage.

## Fórmula principal

Dinero disponible =
Ingresos
− gastos fijos
− cuotas de financiaciones activas
− aportaciones de ahorro incluidas
− colchón reservado
− gastos variables ya realizados

## Publicación gratuita con GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube todos los archivos de esta carpeta a la raíz.
3. En el repositorio, abre Settings > Pages.
4. Elige Deploy from a branch.
5. Selecciona `main` y `/ (root)`.
6. Abre la URL publicada en Safari del iPhone.
7. Safari > Compartir > Añadir a pantalla de inicio.

## Importante sobre privacidad

La web puede estar alojada públicamente, pero los datos financieros que introduces NO están dentro de los archivos publicados. Se guardan localmente en tu navegador/dispositivo.

Haz copias de seguridad periódicas desde Más > Exportar copia.


## Corrección 2.1
- Corregido el panel modal “Añadir” que podía aparecer abierto y vacío al cargar la página.
- Actualizada la versión de caché del Service Worker para forzar al iPhone a descargar los archivos corregidos.
