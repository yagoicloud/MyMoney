# MyMoney - versión 3.0

Aplicación web instalable (PWA) para iPhone orientada a responder una pregunta principal:

> ¿Cuánto puedo gastar todavía este mes sin terminar en negativo?

## Funciones incluidas

- Panel principal con dinero disponible del mes.
- Límite orientativo diario y semanal.
- Semáforo de riesgo: verde, amarillo y rojo.
- Ingresos fijos mensuales.
- Gastos fijos mensuales y gastos periódicos bimestrales, trimestrales, semestrales o anuales.
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

## Pruebas locales

Ejecuta la app desde esta carpeta con:

```powershell
py -m http.server 8000 --bind 0.0.0.0
```

Después abre `http://localhost:8000`. MyMoney desactiva automáticamente el Service Worker y elimina únicamente sus cachés cuando se ejecuta en `localhost`, `127.0.0.1` o `0.0.0.0`. Así, los cambios aparecen al recargar sin borrar los datos guardados en `localStorage`.

Si vienes de una versión anterior que todavía controla el navegador, abre una vez `http://localhost:8000/?update=3.1.0`. Las URLs versionadas de los recursos fuerzan la carga del código actual y completan la limpieza automática.

En GitHub Pages el Service Worker continúa activo para mantener el funcionamiento offline.


## Corrección 2.1
- Corregido el panel modal “Añadir” que podía aparecer abierto y vacío al cargar la página.
- Actualizada la versión de caché del Service Worker para forzar al iPhone a descargar los archivos corregidos.

## Corrección 2.2
- Sustituido el símbolo emoji de la pestaña Movimientos por un icono SVG vectorial.
- El nuevo icono es monocromo, sin fondo y hereda el color activo/inactivo de la barra inferior.
- Actualizada la caché para que Safari descargue el cambio.

## Versión 2.3
- Renombrada la app como MyMoney en la interfaz, instalación y copias de seguridad.
- Unificados los cinco iconos de navegación con SVG del mismo tamaño y alineación.
- Añadidos iconos más claros para financiaciones (tarjeta) y planificación (calendario).
- Mejorado el simulador para valorar una compra o nueva cuota según el margen y la carga financiera actuales.
- Mejorada la lectura de importes escritos con formato español.
- Actualizada la caché para que Safari descargue los cambios.
- Desactivado automáticamente el Service Worker durante las pruebas locales para evitar versiones antiguas en caché.

## Versión 3.0
- Rediseñada la pantalla de Inicio para priorizar el dinero disponible y explicar mejor el margen mensual.
- Sustituido el semáforo aislado por estados de texto claros: buen margen, margen ajustado o en negativo.
- Separados visualmente el progreso temporal del mes y el porcentaje de ingresos ya asignado.
- Añadida una configuración inicial guiada para ingresos, gastos fijos y financiaciones.
- Sustituido el gráfico circular por una barra apilada y un desglose más legible en iPhone.
- Añadidos accesos directos para registrar gastos y simular compras o nuevas financiaciones.
- Reorganizada Planificación para mostrar primero el simulador “¿Me lo puedo permitir?”.
- Mejorados tamaños táctiles, contraste, jerarquía tipográfica, estados, formularios y navegación inferior.
- Actualizada la caché offline y la versión de los recursos a 3.0.0.
- Eliminado completamente el botón rápido `+`; cada pantalla utiliza únicamente sus acciones contextuales.
- Eliminados los accesos duplicados para añadir gastos y abrir el simulador desde una misma área funcional.
- Unificados los textos de creación con el verbo “Añadir”, sin símbolos ni términos inconsistentes.
- Eliminada la fila vacía “Nómina” que se creaba por defecto y podía confundirse con un ingreso real.
- Añadida la opción que faltaba para eliminar límites por categoría.

## Versión 3.1
- Añadida periodicidad mensual, bimestral, trimestral, semestral y anual a los gastos fijos.
- Para periodicidades no mensuales se solicita el mes del próximo cobro y se calcula el calendario desde ese mes.
- Los gastos periódicos se aplican al dinero disponible, próximos pagos, calendario y previsión de 12 meses únicamente cuando corresponden.
- Los gastos existentes y las copias antiguas se conservan como mensuales.
- Simplificado el campo de financiación “O mes de última cuota” a “Mes de última cuota”.
- Actualizada la versión de datos, recursos y caché a 3.1.0.
