# EventMaster - Simulador de Eventos Discretos

Simulador visual académico de teoría de colas para sistemas de atención al cliente (M/M/1). Implementa el método de simulación de eventos discretos (DES) para modelar la llegada de clientes, el servicio y diversas configuraciones avanzadas.

## Stack Tecnológico

- **Frontend:** React 19
- **Build:** Vite
- **Lenguaje:** JavaScript ES6+
- **Estilos:** CSS3

## Instalación y Uso

```bash
npm install
npm run dev
```

El servidor de desarrollo se iniciara en `http://localhost:5173`.

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
