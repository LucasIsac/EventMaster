                                 [ ENTRADA: Cinta Transportadora ]
                                  (Arribos cada 4 min constantes)
                                                │
                                                ▼
                                    [ Escáner / Clasificador ]
                                                │
                                   ┌────────────┴────────────┐
                         p = 0.70  │                         │  p = 0.30
                                   ▼                         ▼
                           ┌──────────────┐          ┌──────────────┐
                           │   Fila A     │          │   Fila B     │
                           │(Clase A, K=10)          │ (Clase B, K=∞)
                           └──────┬───────┘          └──────┬───────┘
                                  │                         │
            Si Fila A = 10 ───────┼────────┐                │ (Prioridad Absoluta B > A)
            al arribar            │        │                │
                                  ▼        ▼                │
                       [Depósito Externo] [Fila A]          │
                       (Desvío Saturación) │                │
                                           └────────┬───────┘
                                                    │
                                                    ▼
                                       ┌────────────────────────┐
                                       │    Asignador / FEL     │
                                       └────────────┬───────────┘
                                                    │
                                   ┌────────────────┴────────────────┐
                                   ▼                                 ▼
                         ┌───────────────────┐             ┌───────────────────┐
                         │       AGV 1       │             │       AGV 2       │
                         │                   │             │                   │
                         │ Estados:          │             │ Estados:          │
                         │ • LIBRE           │             │ • LIBRE           │
                         │ • OCUPADO (A/B)   │             │ • OCUPADO (A/B)   │
                         │ • EN RECARGA (20m)│             │ • EN RECARGA (20m)│
                         │                   │             │                   │
                         │ Autonomía:        │             │ Autonomía:        │
                         │ Viajes_AGV1 [0..5]│             │ Viajes_AGV2 [0..5]│
                         └─────────┬─────────┘             └─────────┬─────────┘
                                   │                                 │
                                   └────────────────┬────────────────┘
                                                    ▼
                                        [ Dásenas de Despacho ]
                                          (Salida del Sistema)