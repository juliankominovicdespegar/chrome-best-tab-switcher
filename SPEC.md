# Best Chrome Tab Switcher

## Problema con el tab switcher actual

- No es responsivo
- No puedo ver las URLs
- No puedo ver las miniaturas de las pestañas
- No se ordenan según la fecha de uso
- Si no encuenta la pestaña no busca en el historial

## Cosas que me gusta del tab switcher de Chrome

- Puede ver los titulos de las pestañas
- Puedo ver los iconos
- Puedo cerrarlas una por una
- Puedo buscar por nombre o URL
- Puedo buscar tabs que cerré recientemente y volver a abrirlos
- Navegación por teclado y mouse

## Que quiero?

Cubrir los problemas del tab switcher actual, manteniendo las cosas que me gustan del tab switcher de Chrome actual.

- Quiero hacer Ctrl+Shift+A para abrir el tab switcher que vamos a crear.
- Lo quiero ver en el centro de la pantalla.
- Quiero velocidad por sobre todo, pero mantiendo simplicidad y en un grado un poquito menor la estética.
- Quiero navegar por teclado y mouse.

## Cómo lo quiero?

- Se me ocurre algo parecido a Raycast o Command-K,
- Usar React y Shadcn para la interfaz.
- En el menú desplegable de las tabs quiero ver una lista de pestañas, con sus miniaturas, titulos y URLs y fecha de última actividad.
- Apenas abra el desplegable haciendo CTRL+ALT+K, quiero que, de ser posible, en el centro de la pantalla se muestre el menú desplegable con las pestañas.
- El menu desplagble tendrá, describiendolo de arriba para abajo:
  - Un input para buscar por titulo o URL.
    - El input buscará tambien en el historial de navegación, pero priorizará las tabs abiertas recientemente y las que están abiertas.
    - Evaluar posibles problemas de performance al buscar en el historial de navegación, se puede evaluar incluso hacerlo lazy cuando no haya resultados de la búsqueda dentro de las tabs abiertas o recientes.
  - La lista de tabs que coincidan con la búsqueda, donde cada tab tendrá:
    - Favicon
    - Miniatura
      - Para la miniatura se me ocurre que al cambiar de pestaña saquemos screenshot de la pestaña actual, lo guardamos en el cache y lo usamos para la miniatura.
    - Titulo
    - URL
    - Fecha de última actividad
    - Un botón para cerrar la pestaña.
- Navegación por teclado:
  - Se puede navegar por las tabs con las flechas del teclado.
  - Se puede cerrar una pestaña con la tecla de eliminar.
  - Se puede abrir una pestaña con la tecla de enter.
- Navegación por mouse:
  - Se puede navegar por las tabs con el mouse.
  - Se puede cerrar una pestaña clickeando la X de la lista de tabs.
  - Se puede abrir una pestaña con el botón izquierdo del mouse.

## Tech stack

- React
- Shadcn
- Tailwind CSS
- Vite
- Tanstack Query (si es necesario)
- Tanstack Table (si es necesario)
- Alguna libreria de virtualización de listas (si es necesario)
- Alguna libreria de iconos (si es necesario)
