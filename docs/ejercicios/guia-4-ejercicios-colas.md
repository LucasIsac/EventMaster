# Guía de Ejercicios: Teoría de Colas (Guía 4)

### Problema 1
Los clientes llegan uno a uno a intervalos de tiempo aleatorios para recibir servicio uno a uno en el mismo orden de llegada. Los tiempos de prestación del servicio son también aleatorios. Si al llegar un cliente al sistema el puesto de servicio está ocupado, ese cliente deberá hacer cola para aguardar que se le preste el servicio. Al terminar esto, el próximo cliente lo reemplaza en el puesto de servicio de forma instantánea. El servidor trabaja durante intervalos de tiempo aleatorios y descansa durante otro tiempo aleatorio. Cuando un cliente espera en la cola durante 10 minutos, abandona la cola para salir del sistema sin regresar a él.

Además, se desea saber:
* **a-** ¿Cuántos clientes abandonaron la cola al cabo de una hora?
* **b-** ¿Cuántos clientes fueron atendidos cuando comenzó el segundo descanso?

---

> **Validar las respuestas para valores de tiempo (dt) = 1 min (cte) para todos los eventos no definidos explícitamente**

¿Esto hace que todos los grupos obtengan el mismo resultado?

#### **V(0) -> q=100 y todos los clientes llevan esperando 10 segundos en cola**
* **a)** Aprox -> Menos de 60 abandonos
* **b)** Menos de 6 abandonos
* **c)** Mas de 60 abandonos

#### **V(0) -> q=0, ps=0, S=1 ¿Cuántos abandonos tendrían?**
* **a)** Aprox -> Menos de 60 abandonos
* **b)** Menos de 6 abandonos
* **c)** Mas de 60 abandonos

---

> **Validar las respuestas para valores de tiempo (dt) = 1 min (+/-10seg) [50~70seg] distribución uniforme para todos los eventos no definidos explícitamente**

#### **V(0) -> q=100 y todos los clientes llevan esperando 10 segundos en cola**
* **a)** Aprox -> Menos de 60 abandonos
* **b)** Menos de 6 abandonos
* **c)** Mas de 60 abandonos

#### **V(0) -> q=0, ps=0, S=1 ¿Cuántos abandonos tendrían?**
* **a)** Aprox -> Menos de 60 abandonos
* **b)** Menos de 6 abandonos
* **c)** Mas de 60 abandonos

***

### Problema 2
Una máquina produce piezas cada un minuto para ser procesadas por otra máquina. Esta segunda máquina termina el proceso cada 50seg +- 10seg (40” – 60”) y sale de servicio cada 5 minutos durante 30 segundos. Debido a las características propias del proceso, una pieza no puede esperar más de 3 minutos entre una máquina y otra y es retirada automáticamente como descarte.

* **A-** ¿Cuántas piezas se descartaron al cabo de dos horas?

#### **V(0) -> q=0, ps=0, S=1 ¿Cuántos abandonos tendrían al cabo de dos horas?**
* **a)** Aprox -> Menos de 60 abandonos
* **b)** Menos de 6 abandonos
* **c)** Mas de 60 abandonos

***

### Problema 3
Piezas llegan una a una a intervalos aleatorios para ser procesadas por una máquina que procesa una pieza por vez, en tiempos de procesamiento también aleatorios. Si una pieza llega a la máquina y ésta se encuentra procesando otra anterior, la que llega no espera, sino que es desviada en ese mismo instante hacia otra máquina, aunque esta última no es objeto de simulación en el presente problema.

* **a.** Relación entre piezas procesadas y desviadas, -> *Variables auxiliares: `pprocesadas`, `pdesviadas`*.

> **Modificar el script de llegada de clientes (q!!):** `qdesviadas +=1` -> `@llegadaClientes` y `ps==1`
> 
> **Definir el tiempo de espera para abandono == 0 seg:** `qdesviadas@abandonoCola`

***

### Problema 4
Un carpintero acaba de recibir el material necesario para realizar 6 sillas. El proceso consiste en armar las sillas (demora entre 30 y 40 minutos cada una). Luego de ello deberá lijarlas (entre 10 y 20 minutos cada una) y por último deberá lustrarlas (entre 5 y 30 minutos cada una).

Además, se desea saber:
* **a.** ¿Cuántas sillas habrá terminado al cabo de 6 horas?

#### **V(0) -> q=6, ps=0, S=1 ¿Cuántas sillas habrá terminado al cabo de 6 horas?**
* **a)** Ninguna
* **b)** Menos de 6 sillas
* **c)** Todas

***

### Para todos los problemas se pide:
1. Representación (modelado) con la simbología habitual.
2. Determinación (lista) de eventos y variables del sistema.
3. Determinación de variables auxiliares (No son necesarias para el método, pero sí para responder al problema planteado).
4. Determinación de distribuciones (uniformes) y tiempos aleatorios para simulación manual.
5. Matriz de simulación con 1 instancia de cada evento (mínimo).
6. Diagrama general del funcionamiento para armar la matriz de simulación.
7. Diagrama de cada evento en particular con un grado de detalle en su lógica que permita a un programador sin conocimientos de MySS poder escribir el código en un lenguaje a elección.
8. Adaptación del software propio para resolver cada caso.
