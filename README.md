# EventMaster - Simulador de Eventos Discretos

Simulador visual académico de teoría de colas para sistemas de atención al cliente (modelos M/M/1 a M/M/S). Implementa el método de simulación de eventos discretos (DES) para modelar la llegada de clientes, el servicio, y diversas configuraciones avanzadas incluyendo topologías de sistema, múltiples servidores y abandono de clientes.

## Stack Tecnológico

- **Frontend:** React 19
- **Build:** Vite
- **Lenguaje:** JavaScript ES6+
- **Estilos:** CSS3
- **Testing:** Vitest

## Requisitos Previos

Asegúrate de tener instalado:
* **Node.js** (versión 18.0.0 o superior)
* **npm** (incluido con Node.js)
* **Git** para clonar el repositorio

## Instalación y Uso

### 1. Clonar el repositorio
Abre una terminal y ejecuta el siguiente comando para clonar el repositorio en tu máquina local:
```bash
git clone https://github.com/LucasIsac/EventMaster.git
cd EventMaster
```

### 2. Levantar la Aplicación Web (React + Vite)
Para instalar dependencias y probar la simulación interactiva en tu navegador:
```bash
# Instalar las dependencias de la aplicación
npm install

# Iniciar el servidor de desarrollo
npm run dev
```
Una vez iniciado, abre tu navegador e ingresa a [http://localhost:5173](http://localhost:5173) para ver el simulador.

### 3. Ejecutar las Pruebas Unitarias (Vitest)
Para validar la integridad de la lógica de simulación frente a refactorizaciones:
```bash
npm run test
```

---

## Estructura del Proyecto

```
EventMaster/
├── docs/                 # Documentación, ejercicios y casos de estudio
│   ├── ejercicios/       # Trabajos prácticos y guías del simulador
│   ├── casos-estudio/    # Problemas avanzados de simulación
│   └── README.md         # Índice central y teoría de problemas resueltos
├── src/                  # Código fuente de la aplicación React + Vite
│   ├── engine/           # Motor de Simulación de Eventos Discretos (DES)
│   │   └── Simulator.js
│   ├── components/       # Componentes visuales de la interfaz de usuario
│   ├── utils/            # Generadores de distribuciones estadísticas
│   ├── App.jsx           # Componente principal React
│   └── main.jsx          # Punto de entrada de React
├── public/               # Recursos públicos (iconos, favicon)
├── index.html            # Plantilla HTML base
├── package.json          # Dependencias y scripts del proyecto
└── vite.config.js        # Configuración de Vite
```

---

## Casos de Estudio y Documentación

Para ver la explicación detallada de cada problema que EventMaster puede simular y la lógica de cómo los resuelve el motor paso a paso, consulta el **[Índice de Documentación en docs/README.md](file:///c:/Users/Leo/Documents/Programming/github/repositories/EventMaster/docs/README.md)**.

## Simbología Visual de la Interfaz

- **Cuadrado azul:** Servidor o puesto de atención.
- **Círculo naranja:** Cliente común en cola.
- **Círculo violeta:** Cliente VIP en cola con prioridad.

