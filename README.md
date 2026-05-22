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
git clone https://github.com/<tu-usuario>/EventMaster.git
cd EventMaster
```

### 2. Probar la Aplicación Web (React + Vite)
Para levantar la interfaz gráfica y probar la simulación visual interactiva:
```bash
# Ingresar al directorio del proyecto web
cd eventmaster-web

# Instalar las dependencias de la aplicación
npm install

# Iniciar el servidor de desarrollo
npm run dev
```
Una vez iniciado, abre tu navegador e ingresa a [http://localhost:5173](http://localhost:5173) para ver el simulador.

### 3. Probar el Motor Core desde Consola (CLI)
Si deseas ejecutar la versión de consola del simulador:
```bash
# Desde la raíz del proyecto (EventMaster/)
npm install
npm start
```

### 4. Ejecutar las Pruebas Unitarias
* **Pruebas del Motor Web**:
  ```bash
  cd eventmaster-web
  npm run test
  ```
* **Pruebas del Motor Core**:
  ```bash
  # Desde la raíz del proyecto
  npm test
  ```

## Estructura del Proyecto

```
eventmaster-web/
├── src/
│   ├── engine/
│   │   └── Simulator.js      # Motor de simulación DES
│   ├── App.jsx                # Componente principal
│   ├── App.css                # Estilos principales
│   └── main.jsx               # Punto de entrada
├── public/
│   └── favicon.svg            # Icono
├── index.html                  # HTML base
├── package.json                # Dependencias
├── vite.config.js              # Configuración Vite
└── eslint.config.js           # Configuración ESLint
```

## Casos de Prueba

El proyecto cuenta con 4 casos de prueba documentados en `resultados.md`. Cada caso valida diferentes configuraciones del simulador.

## Simbología Visual

- **Cuadrado azul:** Servidor (punto de atención)
- **Círculo naranja:** Cliente en cola (cliente VIP)
