UNIVERSIDAD REGIONAL - CÁTEDRA DE MODELOS Y SIMULACIÓN
EXAMEN FINAL
Contexto del Sistema
Un centro de distribución recibe pallets de mercancía que llegan a una zona de clasificación
mediante una cinta transportadora de manera continua cada 4 minutos constantes.
Al llegar al punto de control, un escáner clasifica los pallets según su tipo:
● 70% Pallets Estándar (Clase A): Se dirigen a la Fila A, la cual tiene una capacidad
máxima de 10 pallets. Si la Fila A se encuentra llena al momento del arribo, el pallet
es derivado a un depósito externo ("Desvío por saturación").
● 30% Pallets de Alta Prioridad (Clase B): Se dirigen a la Fila B, la cual posee
prioridad absoluta de atención y capacidad de almacenamiento ilimitada.
El traslado de los pallets desde las filas hacia las dársenas de despacho se realiza mediante
2 Vehículos de Guiado Automático (AGV) idénticos que operan en paralelo.
Reglas de Operación del Sistema
1. Prioridad de Atención: Los AGVs atienden siempre con prioridad a los pallets de la
Fila B. Solo si la Fila B está vacía al momento de liberarse un AGV, este tomará un
pallet de la Fila A.
2. Ciclo de Recarga de Batería (Mantenimiento de Servidores):
○ Cada AGV cuenta con autonomía para realizar exactamente 5 viajes
completos (independientemente del tipo de pallet transportado).
○ Al finalizar el 5.º viaje, el AGV entra automáticamente en modo Recarga de
Batería, quedando inoperativo durante 20 minutos. Finalizado dicho tiempo,
el vehículo vuelve a estar disponible para el servicio.
3. Tiempos de Viaje: El tiempo de traslado, descarga y retorno del AGV depende de la
categoría del pallet:
○ Pallet Clase A: Distribución uniforme entre [10 y 14] minutos.
○ Pallet Clase B: Distribución uniforme entre [8 y 12] minutos.
4. Política de Espera: Si ambos AGVs están ocupados o en proceso de recarga, los
pallets deben permanecer esperando en sus respectivas filas.
Condiciones de Simulación
El sistema comienza a operar a las 08:00 h completamente vacío (sin pallets en fila) y con
ambos AGVs con carga completa de batería (0 viajes realizados). El período de análisis es
de 10 horas de operación continua.
Se Pide:
1. Diagrama del Sistema: Representación conceptual utilizando la simbología habitual
de la cátedra, identificando estados de colas y puestos de servicio (Libre, Ocupado,
En Recarga).
2. Variables del Sistema y Vectores de Control:
Definir el vector de variables de estado (método) necesario para gestionar las
filas y el control de viajes/batería de cada vehículo (Viajes_AGV[1..2]).
3. Lista de Eventos Futuros (FEL):
○ Identificar y listar los eventos del sistema, incluyendo los eventos asociados
al ciclo de vida del servidor (Fin_Viaje_AGV y Fin_Recarga_AGV).
○
4. Mini-especificaciones de Código (Tratamiento Especial):
○ Desarrollar la lógica algorítmica para los eventos Fin_Viaje_AGV (evaluación
de recarga vs. atención por prioridad B > A) y Fin_Recarga_AGV.
○
5. Variables Auxiliares y Métricas: Definir las variables necesarias para responder:
○ ¿Cuántos eventos de recarga de batería se completaron en total durante la
jornada?
○ ¿Cuál fue el tiempo máximo de espera en fila registrado para un pallet Clase
B?
○ ¿Cuántos pallets Clase A fueron derivados al depósito externo por saturación
de la Fila A?