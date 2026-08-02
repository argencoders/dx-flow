# Fuertemente Tipado Framework Core

Estudio arquitectónico avanzado para el diseño de motores de estado e inmutabilidad en TypeScript Estricto.

## 📂 Estructura del Repositorio

- `src/core/`: Utilidades base de infraestructura (`types-testing`, `deep-readonly`, `state-counter`).
- `src/nomenclature/`: Control de convenciones de texto y alfabetos (`object-keys`).
- `src/state/`: Validación jerárquica y profunda de estructuras de datos (`state-deep`).
- `src/examples/`: Casos de uso de integración ejecutable en el mundo real.

## 📖 Documentación Técnica Detallada

- [Sistema de Inmutabilidad Absoluta](docs/deep-readonly.md)
- [Motor de Convención de Nomenclatura de Claves](docs/object-casing.md)
- [Motor de Validación de Estado Profundo](docs/validation-state.md)
- [Mutations y Event Logger](docs/mutations-pipeline.md)

## ⬜ Próximo Bloque Core: Factoría de Mutaciones

Planificación en progreso para el diseño del interceptor de firmas externas y validación estricta de payloads para acciones del Store.
