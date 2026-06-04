# CINCO PROBLEMAS DE SIMULACIÓN DE SISTEMAS DE COLA

*Enunciados sintéticos, lista de eventos y lista de variables de estado.*

---

### Problema No. 1
Los clientes llegan uno a uno a intervalos de tiempo aleatorios para recibir servicio uno a uno en el mismo orden de llegada. Los tiempos de prestación del servicio son también aleatorios. El servidor no abandona nunca el puesto de servicio.

Si al llegar un cliente al sistema el puesto de servicio está ocupado, ese cliente deberá hacer cola para aguardar que se le preste el servicio. Al terminar de prestarse el servicio a un cliente, el próximo lo reemplaza en el puesto de servicio en forma instantánea.

#### Eventos
1. Llegada de un cliente al sistema.
2. Fin de servicio.

#### Variables de estado
1. Estado de ocupado o libre del puesto de servicio.
2. Cantidad de clientes en cola.

#### Generadores
1. Generador de tiempo de llegada de un cliente al sistema: $\Delta\text{tLL} = 45''$ (cte).
2. Generador de tiempo de servicio: $\Delta\text{tS} = 40''$ (cte).

---

### Problema No. 2
Igual al problema nro. 1, pero el servidor trabaja durante intervalos de tiempo aleatorios y entre ellos descansa durante intervalos de tiempo también aleatorios (trabaja unos minutos, descansa unos minutos, trabaja otros minutos, descansa otros minutos, etc.).

#### Eventos
1. Llegada de un cliente al sistema.
2. Fin del servicio.
3. Salida del servidor.
4. Llegada del servidor.

#### Variables de estado
1. Estado de ocupado o libre del puesto de servicio.
2. Cantidad de clientes en cola.
3. Presencia o ausencia del servidor.

---

### Problema No. 3
Igual que el problema 1, pero cuando un cliente espera en cola durante cierto intervalo de tiempo (por ejemplo, 10 minutos), abandona la cola para salir del sistema sin regresar a él.

#### Eventos
1. Llegada de un cliente al sistema.
2. Fin del servicio.
3. Abandono de cola.

#### Variables de estado
1. Estado de ocupado o libre del puesto de servicio.
2. Cantidad de clientes en cola.

#### Otras variables necesarias
1. Hora de llegada a cola de cada cliente de la cola.

---

### Problema No. 4
Similar al problema 1, pero llegan dos tipos de clientes, llamados A y B. Los de tipo A tienen prioridad sobre los B para la entrada al puesto de servicio (PS). No debe discriminarse entre ambos tipos de clientes dentro del PS.

#### Eventos
1. Llegada de un cliente A al sistema.
2. Llegada de un cliente B al sistema.
3. Fin del servicio.

#### Variables de estado
1. Estado de ocupado o libre del PS.
2. Cantidad de clientes A en cola.
3. Cantidad de clientes B en cola.

---

### Problema No. 5
Similar al problema 1, pero el PS está alejado de la cola por razones de seguridad. El primer cliente de cola solo puede ingresar a la zona de seguridad, camino al PS, cuando sale del PS el cliente que estaba en servicio; mientras el cliente que acaba de ingresar no llegue al PS y termine de ser atendido (salga del PS), no podrá ingresar a la zona de seguridad el próximo cliente que está primero en cola. El único caso de ingreso directo a la zona de seguridad se produce ante la llegada de un cliente sin cola y con zona de seguridad y PS libres.

#### Eventos
1. Llegada de un cliente al sistema.
2. Llegada de un cliente al PS.
3. Fin del servicio.

#### Variables de estado
1. Estado de ocupado o libre del PS.
2. Cantidad de clientes en cola.
3. Estado de ocupado o libre de la zona de seguridad.

---
---

# TABLAS DE SIMULACIÓN MANUAL PARA LOS CINCO PROBLEMAS

### Problema No. 1

**Leyenda para la columna "Gráficamente":**
* `(■)` = Servidor ocupado (Estado del P.S. = 1)
* `( )` = Servidor libre (Estado del P.S. = 0)
* `○` = Cliente en cola
* `*` = Indica el evento seleccionado para la siguiente iteración de tiempo.

| Hora actual | Hora de prox. Llegada | Hora de prox. Fin de servicio | Cant. De clientes en cola | Estado del P:S. | Gráficamente |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **8:00:00** | 8:05:00 | 8:03:00 * | 3 | 1 | `(■) ○ ○ ○` |
| **8:03:00** | 8:05:00 | 8:03:40 * | 2 | 1 | `(■) ○ ○` |
| **8:03:40** | 8:05:00 | 8:04:20 * | 1 | 1 | `(■) ○` |
| **8:04:20** | 8:05:00 * | 8:05:00 | 0 | 1 | `(■)` |
| **8:05:00** | 8:05:45 | 8:05:00 | 1 | 1 | `(■) ○` |
| **8:05:00** | 8:05:45 | 8:05:40 | 0 | 1 | `(■)` |
| **8:05:40** | 8:05:45 | | 0 | 0 | `( )` |
| **8:05:45** | 8:06:30 | 8:06:25 | 0 | 1 | `(■)` |
| **8:06:25** | 8:06:30 | Etc. | 0 | 0 | `( )` |

---

### Problema No. 2

**Datos:**
* $\Delta\text{LL} = 1'\ 5'', 6'', 2'', 21'', 42'', \dots$
* $\Delta\text{FS} = 5'', 10'', \dots$
* $\Delta\text{D} = 60''$ (cte)
* $\Delta\text{T} = 30''$ (cte)

| Hora actual | Hora de prox. Llegada | Hora de prox. F. servicio | Hora comienzo descanso | Hora comienzo trabajar | Cant. De clientes en cola | Estado del P:S. | Est. Servidor | Gráficamente |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **10:30:00** | 10:30:20 | | 10:31:34 | | 0 | 0 | 1 | `( )` |
| **10:30:20** | 10:31:25 | 10:30:25 | 10:31:34 | | 0 | 1 | 1 | `(■)` |
| **10:30:25** | 10:31:25 | | 10:31:34 | | 0 | 0 | 1 | `( )` |
| **10:31:25** | 10:31:31 | 10:31:35 | 10:31:34 | | 0 | 1 | 1 | `(■)` |
| **10:31:31** | 10:31:33 | 10:31:35 | 10:31:34 | | 1 | 1 | 1 | `(■) ○` |
| **10:31:33** | 10:31:54 | 10:31:35 | 10:31:34 | | 2 | 1 | 1 | `(■) ○ ○` |
| **10:31:34** | 10:31:54 | 10:32:35 | | 10:32:34 | 2 | 1 | 0 | |
| **10:31:54** | 10:32:36 | 10:32:35 | | 10:32:34 | 3 | 1 | 0 | |
| **10:32:34** | 10:32:36 | 10:32:35 | 10:33:04 | | 3 | 1 | 1 | |
| **10:32:35** | | | | | 2 | 1 | 1 | |

---

### Problema No. 3

**Datos:**
* $\Delta\text{LL} = 10'', 5'', 7'', 7'', 1'\ 47'', 24'', \dots$
* $\Delta\text{FS} = 50'', 1'\ 16'', \dots$
* $\Delta\text{SC} = 2'$ (cte)

| Hora actual | Hora de prox. Llegada | Hora de prox. F. servicio | Hora abandono de cola | Cant. De clientes en cola | Estado del P:S. | 1 | 2 | 3 | 4 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **9:00:32** | 9:00:49 | 9:01:07 | | 0 | 1 | | | | |
| **9:00:49** | 9:00:59 | 9:01:07 | 9:02:49 | 1 | 1 | 9:00:49 | | | |
| **9:00:59** | 9:01:04 | 9:01:07 | 9:02:49 | 2 | 1 | 9:00:49 | 9:00:59 | | |
| **9:01:04** | 9:01:11 | 9:01:07 | 9:02:49 | 3 | 1 | 9:00:49 | 9:00:59 | 9:01:04 | |
| **9:01:07** | 9:01:11 | 9:01:57 | 9:02:59 | 2 | 1 | 9:00:59 | 9:01:04 | | |
| **9:01:11** | 9:01:18 | 9:01:57 | 9:02:59 | 3 | 1 | 9:00:59 | 9:01:04 | 9:01:11 | |
| **9:01:18** | 9:03:05 | 9:01:57 | 9:02:59 | 4 | 1 | 9:00:59 | 9:01:04 | 9:01:11 | 9:01:18 |
| **9:01:57** | 9:03:05 | 9:03:13 | 9:03:04 | 3 | 1 | 9:01:04 | 9:01:11 | 9:01:18 | |
| **9:03:04** | 9:03:05 | 9:03:13 | 9:03:11 | 2 | 1 | 9:01:11 | 9:01:18 | | |
| **9:03:05** | 9:03:29 | 9:03:13 | 9:03:11 | 3 | 1 | 9:01:11 | 9:01:18 | 9:03:05 | |
| **9:03:11** | 9:03:29 | 9:03:13 | 9:03:18 | 2 | 1 | 9:01:18 | 9:03:05 | | |
