# TRES PROBLEMAS DE SIMULACIÓN DE SISTEMAS DE COLA CON MÁS DE UN PUESTO DE SERVICIO

## Problema No. 1
Los clientes llegan uno a uno a intervalos de tiempo aleatorios para recibir tres tipos de servicio diferentes en el mismo orden de llegada. Los tiempos de prestación de cada uno de los tres servicios prestados son también aleatorios y no tienen ninguna relación entre cada uno de ellos. Los servidores no abandonan nunca el puesto de servicio. Si al llegar un cliente al sistema el puesto de servicio al que necesita llegar está ocupado, ese cliente deberá hacer cola para aguardar a que se le preste el servicio. Al terminar de prestarse el servicio a un cliente, el próximo que necesita ese servicio lo reemplaza en el puesto de servicio en forma instantánea.

*(Nota: El sistema está compuesto por tres subsistemas independientes: SUBSISTEMA 1, SUBSISTEMA 2 y SUBSISTEMA 3).*

### Eventos
1. Llegada de un cliente al sistema **PARA RECIBIR EL SERVICIO 1**.
2. Llegada de un cliente al sistema **PARA RECIBIR EL SERVICIO 2**.
3. Llegada de un cliente al sistema **PARA RECIBIR EL SERVICIO 3**.
4. Fin de servicio **DEL SERVICIO PS1** (Puesto de Servicio 1).
5. Fin de servicio **DEL SERVICIO PS2** (Puesto de Servicio 2).
6. Fin de servicio **DEL SERVICIO PS3** (Puesto de Servicio 3).

### Variables de estado
1. Cantidad de clientes en cola 1.
2. Cantidad de clientes en cola 2.
3. Cantidad de clientes en cola 3.
4. Estado de ocupado (1) o libre (0) del PS1.
5. Estado de ocupado (1) o libre (0) del PS2.
6. Estado de ocupado (1) o libre (0) del PS3.

---

## Problema No. 2
Igual al problema nro. 1, pero los tres (o más) puestos de servicio prestan el mismo servicio (es decir, que para el cliente es indistinto en qué puesto de servicio será atendido).

### Eventos
1. Llegada de un cliente al sistema **PARA RECIBIR EL SERVICIO ÚNICO**.
2. Fin de servicio PS1. *(Distribución uniforme entre 3 y 5 minutos)*
3. Fin de servicio PS2.
4. Fin de servicio PS3.

### Variables de estado
1. Estado de ocupado (1) o libre (0) del PS1.
2. Estado de ocupado (1) o libre (0) del PS2.
3. Estado de ocupado (1) o libre (0) del PS3.
4. Cantidad de clientes en cola.

---

## Problema No. 3
Igual que el problema 1, los clientes esperan recibir los tres (o más) servicios en orden sucesivo. Es decir, que todos llegan para que les sea prestado el servicio del primer puesto de servicio, a continuación esperarán a que en otro puesto de servicio se les preste el servicio dos, y por último esperarán a que se les brinde el servicio tres.

### Eventos
1. Llegada de un cliente al sistema.
2. Fin de servicio **DEL SERVICIO UNO** (y llegada al servicio dos).
3. Fin de servicio **DEL SERVICIO DOS** (y llegada al servicio TRES).
4. Fin de servicio **DEL SERVICIO TRES**.

### Variables de estado
1. Estado de ocupado (1) o libre (0) del puesto de servicio 1.
2. Estado de ocupado (1) o libre (0) del puesto de servicio 2.
3. Estado de ocupado (1) o libre (0) del puesto de servicio 3.
4. Cantidad de clientes en cola 1.
5. Cantidad de clientes en cola 2.
6. Cantidad de clientes en cola 3.

---

# MATRICES DE SIMULACIÓN MANUAL PARA LOS TRES PROBLEMAS

## Problema No. 1

### Datos:
* $\Delta FS1 = 40''$ (cte) | $\Delta LL1 = 45''$ (cte)
* $\Delta FS2 = 20''$ (cte) | $\Delta LL2 = 25''$ (cte)
* $\Delta FS3 = 10''$ (cte) | $\Delta LL3 = 15''$ (cte)

*(Nota: El asterisco `*` en las horas indica el evento seleccionado para avanzar al siguiente estado en la simulación).*

| Hora actual | Próx. Llegada S1 | Próx. Llegada S2 | Próx. Llegada S3 | Próx. Fin PS1 | Próx. Fin PS2 | Próx. Fin PS3 | Cola PS1 | Cola PS2 | Cola PS3 | Estado PS1 | Estado PS2 | Estado PS3 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **8:00:00** | 8:05:00 | 8:04:15 | 8:04:18 | 8:03:00* | 8:03:50 | 8:04:00 | 4 | 4 | 4 | 1 | 1 | 1 |
| **8:03:00** | 8:05:00 | 8:04:15 | 8:04:18 | 8:03:40* | 8:03:50 | 8:04:00 | 3 | 4 | 4 | 1 | 1 | 1 |
| **8:03:40** | 8:05:00 | 8:04:15 | 8:04:18 | 8:04:20 | 8:03:50* | 8:04:00 | 2 | 3 | 4 | 1 | 1 | 1 |
| **8:03:50** | 8:05:00 | 8:04:15 | 8:04:18 | 8:04:20 | 8:04:50 | 8:04:00* | 2 | 3 | 4 | 1 | 1 | 1 |
| **8:04:00** | 8:05:00 | 8:04:15 | 8:04:18 | 8:04:20 | 8:04:50 | 8:04:10* | 2 | 3 | 3 | 1 | 1 | 1 |
| **8:04:10** | 8:05:00 | 8:04:15* | 8:04:18 | 8:04:20 | 8:04:50 | 8:04:20 | 2 | 3 | 2 | 1 | 1 | 1 |
| **8:04:15** | 8:05:00 | 8:04:40 | 8:04:18* | 8:04:20 | 8:04:50 | 8:04:20 | 2 | 4 | 2 | 1 | 1 | 1 |
| **8:04:18** | 8:05:00 | 8:04:40 | 8:04:33 | 8:04:20* | 8:04:50 | 8:04:20 | 2 | 4 | 3 | 1 | 1 | 1 |
| **8:04:20** | 8:05:00 | 8:04:40 | 8:04:33 | 8:05:00 | 8:04:50 | 8:04:30* | 1 | 4 | 2 | 1 | 1 | 1 |
| **8:04:30** | 8:05:00 | 8:04:40 | 8:04:33* | 8:05:00 | 8:04:50 | 8:04:40 | 1 | 4 | 1 | 1 | 1 | 1 |
| **8:04:33** | 8:05:00 | 8:04:40 | 8:04:48 | 8:05:00 | 8:04:50 | 8:04:40 | 1 | 4 | 2 | 1 | 1 | 1 |

*y continúa...*

---

## Problema No. 2

### Datos:
* $\Delta LL = 60'', 6'', 15'', 2'', 13'', ...$
* $\Delta FS1 = 11''$ (cte)
* $\Delta FS2 = 12''$ (cte)
* $\Delta FS3 = 14''$ (cte)

*(Nota 1: Se asume que siempre se ocupa en primer lugar el PS1 si hay puestos libres, aunque esto también podría responder a algún criterio alternativo o aleatorio).*

| Hora actual | Hora de prox. Llegada | Próx. Fin PS1 | Próx. Fin PS2 | Próx. Fin PS3 | Cant. de clientes en cola | Estado PS1 | Estado PS2 | Estado PS3 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **10:30:00** | 10:30:20 | 10:31:00 | 10:31:10 | 10:31:30 | 4 | 1 | 1 | 1 |
| **10:30:20** | 10:31:20 | 10:31:00 | 10:31:10 | 10:31:30 | 5 | 1 | 1 | 1 |
| **10:31:00** | 10:31:20 | 10:31:11 | 10:31:10 | 10:31:30 | 4 | 1 | 1 | 1 |
| **10:31:10** | 10:31:20 | 10:31:11 | 10:31:22 | 10:31:30 | 3 | 1 | 1 | 1 |
| **10:31:11** | 10:31:20 | 10:31:22 | 10:31:22 | 10:31:30 | 2 | 1 | 1 | 1 |
| **10:31:20** | 10:31:26 | 10:31:22 | 10:31:22 | 10:31:30 | 3 | 1 | 1 | 1 |
| **10:31:22** | 10:31:26 | 10:31:33 | 10:31:35 | 10:31:30 | 1 | 1 | 1 | 1 |
| **10:31:26** | 10:31:41 | 10:31:33 | 10:31:35 | 10:31:30 | 2 | 1 | 1 | 1 |
| **10:31:30** | 10:31:41 | 10:31:33 | 10:31:35 | 10:31:44 | 1 | 1 | 1 | 1 |
| **10:31:33** | 10:31:41 | 10:31:44 | 10:31:35 | 10:31:44 | 0 | 1 | 1 | 1 |
| **10:31:35** | 10:31:41 | 10:31:44 | - | 10:31:44 | 0 | 1 | 0 | 1 |
| **10:31:41** | 10:31:43 | 10:31:44 | 10:31:53 | 10:31:44 | 0 | 1 | 1 | 1 |
| **10:31:43** | 10:31:56 | 10:31:44 | 10:31:53 | 10:31:44 | 1 | 1 | 1 | 1 |
| **10:31:44** | 10:31:56 | 10:31:55 | 10:31:53 | - | 0 | 1 | 1 | 0 |
| **10:31:53** | 10:31:56 | 10:31:55 | - | - | 0 | 1 | 0 | 0 |
| **10:31:55** | 10:31:56 | - | - | - | 0 | 0 | 0 | 0 |
| **10:32:56** | 10:32:56 | 10:32:07 | - | - | 0 | 1 | 0 | 0 |

*(y continúa...)*

---

## Problema No. 3

### Datos:
* $\Delta LL = 35'', 16'', 41'', 1':09''$
* $\Delta FS1 = 20''$ (cte)
* $\Delta FS2 = 11''$ (cte)
* $\Delta FS3 = 7''$ (cte)

| Hora actual | Hora de prox. Llegada | Próx. Fin PS1 | Próx. Fin PS2 | Próx. Fin PS3 | Cola 1 (C1) | Cola 2 (C2) | Cola 3 (C3) | Estado PS1 | Estado PS2 | Estado PS3 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **10:30:00** | 10:30:20 | 10:31:00 | 10:31:10 | 10:31:30 | 2 | 1 | 3 | 1 | 1 | 1 |
| **10:30:20** | 10:30:55 | 10:31:00 | 10:31:10 | 10:31:30 | 3 | 1 | 3 | 1 | 1 | 1 |
| **10:30:55** | 10:31:11 | 10:31:00 | 10:31:10 | 10:31:30 | 4 | 1 | 3 | 1 | 1 | 1 |
| **10:31:00** | 10:31:11 | 10:31:20 | 10:31:10 | 10:31:30 | 3 | 2 | 3 | 1 | 1 | 1 |
| **10:31:10** | 10:31:11 | 10:31:20 | 10:31:21 | 10:31:30 | 3 | 1 | 4 | 1 | 1 | 1 |
| **10:31:11** | 10:31:52 | 10:31:20 | 10:31:21 | 10:31:30 | 4 | 1 | 4 | 1 | 1 | 1 |
| **10:31:20** | 10:31:52 | 10:31:40 | 10:31:21 | 10:31:30 | 3 | 2 | 4 | 1 | 1 | 1 |
| **10:31:21** | 10:31:52 | 10:31:40 | 10:31:32 | 10:31:30 | 3 | 1 | 5 | 1 | 1 | 1 |
| **10:31:30** | 10:31:52 | 10:31:40 | 10:31:32 | 10:31:37 | 3 | 1 | 4 | 1 | 1 | 1 |
| **10:31:32** | 10:31:52 | 10:31:40 | 10:31:43 | 10:31:37 | 3 | 0 | 5 | 1 | 1 | 1 |
| **10:31:37** | 10:31:52 | 10:31:40 | 10:31:43 | 10:31:44 | 3 | 0 | 4 | 1 | 1 | 1 |
| **10:31:40** | 10:31:52 | 10:32:00 | 10:31:43 | 10:31:44 | 2 | 1 | 4 | 1 | 1 | 1 |
| **10:31:43** | 10:31:52 | 10:32:00 | 10:31:54 | 10:31:44 | 2 | 0 | 5 | 1 | 1 | 1 |
| **10:31:44** | 10:31:52 | 10:32:00 | 10:31:54 | 10:31:51 | 2 | 0 | 4 | 1 | 1 | 1 |
| **10:31:51** | 10:31:52 | 10:32:00 | 10:31:54 | 10:31:58 | 2 | 0 | 3 | 1 | 1 | 1 |
| **10:31:52** | 10:33:01 | 10:32:00 | 10:31:54 | 10:31:58 | 3 | 0 | 3 | 1 | 1 | 1 |
| **10:31:54** | 10:33:01 | 10:32:00 | - | 10:31:58 | 3 | 0 | 4 | 1 | 0 | 1 |
| **10:31:58** | 10:33:01 | 10:32:00 | - | 10:32:05 | 3 | 0 | 3 | 1 | 0 | 1 |
| **10:32:00** | 10:33:01 | 10:32:40 | 10:32:11 | 10:32:05 | 2 | 0 | 3 | 1 | 1 | 1 |
| **10:32:05** | 10:33:01 | 10:32:40 | 10:32:11 | 10:32:12 | 2 | 0 | 2 | 1 | 1 | 1 |
| **10:32:11** | 10:33:01 | 10:32:40 | - | 10:32:12 | 2 | 0 | 3 | 1 | 0 | 1 |
| **10:32:12** | 10:33:01 | 10:32:40 | - | 10:32:19 | 2 | 0 | 2 | 1 | 0 | 1 |
| **10:32:19** | 10:33:01 | 10:32:40 | - | 10:32:26 | 2 | 0 | 1 | 1 | 0 | 1 |
| **10:32:26** | 10:33:01 | 10:32:40 | - | 10:32:33 | 2 | 0 | 0 | 1 | 0 | 1 |

*y continúa...*
