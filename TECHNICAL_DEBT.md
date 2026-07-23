# Deuda técnica registrada

## Análisis estático

La versión respaldada compila y cuenta con pruebas funcionales, pero ESLint
detecta observaciones heredadas en componentes de la aplicación:

- actualizaciones sincrónicas de estado dentro de algunos efectos;
- acceso a referencias React durante el renderizado;
- tipos `any` en la ruta de supermercados;
- dependencias faltantes y directivas no utilizadas.

Por esta razón, el paso de lint en GitHub Actions es inicialmente informativo.
Las pruebas y la construcción siguen siendo obligatorias.

## Plan de regularización

1. Corregir primero los tipos explícitos de las rutas API.
2. Refactorizar los hooks de animación conservando el comportamiento visual.
3. Sustituir estados derivados por cálculos durante el renderizado cuando
   corresponda.
4. Agregar pruebas de regresión para cada refactorización.
5. Convertir lint nuevamente en control bloqueante.

Estas correcciones deben realizarse en pull requests separados del respaldo
inicial para mantener trazabilidad y facilitar la reversión.
