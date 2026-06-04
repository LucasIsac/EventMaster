# Lógica del Problema "El Aeropuerto"

Este documento detalla cómo se adaptó el motor de EventMaster para soportar el caso de estudio del Aeropuerto con pista única, donde conviven aviones que desean aterrizar (prioridad) y aviones que desean despegar (sujetos a carreteo previo).

## 1. Mapeo Conceptual en Simulación de Eventos Discretos (DES)

Para encajar el problema en un sistema de teoría de colas tradicional, se realizó la siguiente asignación de roles:

* **Cliente (`C`)**: Representa a cualquier avión que solicite usar la pista, independientemente de si quiere despegar o aterrizar. Todos los aviones que ingresan reciben un identificador incremental (C1, C2, C3...).
* **Servidor (Puesto de Servicio)**: Representa la **Pista Única** del aeropuerto.
* **Zona de Seguridad (`SZ`)**: Representa el **Carreteo** de 11 minutos que deben hacer los aviones desde la plataforma hasta la cabecera de la pista.
* **Cliente VIP**: Representa a un avión que desea **Aterrizar**. Según las reglas del problema, no hacen carreteo y tienen prioridad por sobre los despegues.
* **Cliente Normal**: Representa a un avión que desea **Despegar**. Deben hacer el carreteo de 11 minutos y ceder el paso a los aterrizajes.

## 2. Reglas del Motor Implementadas

Para lograr este comportamiento, se introdujo el nuevo flag interno `vipSkipsSecurityZone` (Los VIP ignoran la Zona de Seguridad).

### Llegada con pista libre
- Si un avión Normal (despegue) llega y la pista está libre, entra a la Zona de Seguridad durante 11 minutos. Durante este tiempo bloquea la zona para cualquier otro avión normal.
- Si un avión VIP (aterrizaje) llega y la pista está libre, ignora la Zona de Seguridad y pasa directo a usar la pista.

### Prioridad e Interrupciones
- Mientras un avión normal está carreteando (Zona de Seguridad ocupada), la pista se considera *reservada* (aunque temporalmente vacía de facto). Si llega un VIP en este transcurso de 11 minutos, **no puede interrumpir al avión que ya fue autorizado a carretear**. El VIP va a la cola de espera.
- Cuando la pista se desocupa (evento `FIN_SERVICIO`), el despachador mira la cola. Si hay aviones VIP esperando (aterrizajes), se les otorga la pista de forma inmediata, saltándose la zona de carreteo.
- Si no hay VIPs esperando, se le da autorización al siguiente avión Normal de la cola para que inicie sus 11 minutos de carreteo.

## 3. Dinámica del Sistema y Cuello de Botella (Starvation)

Al probar el simulador con los parámetros establecidos (Duración 1h, Llegadas cada ~3 min, Servicio de ~16 min), se observa un fenómeno clásico de colas conocido como **Inanición (Starvation)**:

1. El primer avión (C1) generalmente inicia su proceso sin problemas. Si es un despegue, toma sus 11 min de carreteo y sus 16 min de pista.
2. Como el tiempo de uso de pista (16 min) es muchísimo mayor que la tasa de llegadas (3 min), durante la atención del primer avión se forma una gran cola de espera en el aire y en tierra.
3. Dado que el ~30% de los vuelos son aterrizajes (VIPs) y estos tienen **prioridad absoluta**, para cuando la pista se libera siempre hay al menos un VIP esperando.
4. El sistema le da la pista al VIP, quien la usa por otros 16 minutos. 
5. Este ciclo se repite indefinidamente. Como los VIPs se saltan la zona de seguridad, la columna de "Zona Seguridad" mostrará ceros (0) casi todo el resto de la simulación, ya que los aviones normales (despegues) quedan relegados indefinidamente en la cola sin recibir nunca permiso para carretear.

## 4. Estadísticas Resultantes

Al finalizar la simulación, la estadística de **"Usaron pista"** (Atendidos / Served) agrupa tanto a los despegues (Normales) como a los aterrizajes (VIPs) que hayan finalizado con éxito su maniobra. Por la dinámica explicada arriba, de los pocos aviones que logren usar la pista en 1 hora, la inmensa mayoría habrán sido aterrizajes.
