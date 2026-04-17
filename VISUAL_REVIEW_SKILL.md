# Skill: Revisión y Corrección Visual de EventMaster

## Objetivo
Revisar la interfaz de EventMaster y corregir problemas de alineación, espaciado
y layout, especialmente en la tabla de simulación que cambia de tamaño dinámicamente.

## Checklist de revisión

### Formulario de configuración
- [ ] Todos los campos de la misma fila tienen la misma altura
- [ ] Los labels están alineados arriba de cada input, no centrados verticalmente
- [ ] El espaciado entre secciones (Tiempo, ΔtLL, ΔtS, etc.) es uniforme
- [ ] Los toggles (Abandonos, Clientes VIP, Zona de Seguridad) están alineados
      con sus labels en la misma línea
- [ ] Cuando se activa una sección (ej: Ciclo Trabajo-Descanso), los campos que
      aparecen no desplazan abruptamente el resto del formulario
- [ ] El indicador de modo (Constante / Lista / Rango) no desplaza otros elementos
      al aparecer

### Tabla de simulación
- [ ] Cuando se activan columnas nuevas (Servidor Descanso, FEL, etc.), la tabla
      se expande horizontalmente sin romper el layout de la página
- [ ] Las columnas tienen ancho mínimo para que el contenido no se corte
- [ ] Los headers de grupos (FEL - Próximos Eventos, Servidor Descanso) están
      centrados sobre sus columnas hijos
- [ ] Las celdas con "-" están centradas
- [ ] Los números en celdas están alineados a la derecha dentro de la celda
- [ ] Las celdas de hora (HH:MM:SS) tienen ancho fijo para evitar saltos al cambiar
      el valor
- [ ] La tabla tiene scroll horizontal en pantallas pequeñas sin romper el layout
- [ ] El número de fila (#) tiene ancho fijo y no se expande

### Indicadores de estado (fila de métricas)
- [ ] Los indicadores (Tiempo, Estado P.S., Servidor, Cola, Utiliz., Atend., Aband.,
      FEL, Inc.) están distribuidos uniformemente
- [ ] Cuando hay pocos indicadores activos, el espacio se redistribuye correctamente
- [ ] Los valores numéricos no rompen el layout al cambiar de 1 a múltiples dígitos

### Responsividad
- [ ] En pantallas menores a 1024px, el formulario hace stack vertical correctamente
- [ ] La tabla siempre tiene scroll horizontal antes de romper el layout

## Reglas de corrección

1. **Ancho de tabla**: Usar `min-width` en las columnas de hora (mínimo 90px) y
   `table-layout: fixed` cuando todas las columnas están visibles.

2. **Columnas dinámicas**: Cuando se activa una nueva sección (descansos, zona de
   seguridad), agregar las columnas con transición suave (`transition: width 0.2s`).

3. **Alineación de formulario**: Usar CSS Grid con `align-items: start` en las filas
   del formulario, no `align-items: center`.

4. **Espaciado consistente**: Usar las variables CSS existentes del proyecto para
   gaps y paddings. No hardcodear valores de px distintos en cada componente.

5. **Indicador de modo de input**: Posicionar con `position: absolute` debajo del
   input para que no empuje otros elementos. El input debe tener `margin-bottom`
   suficiente para el indicador.

## Cómo usar este skill

Cuando se pida "revisar la UI" o "corregir el layout":
1. Leer este archivo
2. Revisar el componente principal de la UI (App.jsx o similar)
3. Revisar los componentes de tabla y formulario
4. Aplicar correcciones según el checklist, de arriba hacia abajo
5. No cambiar lógica de simulación, solo CSS y estructura JSX