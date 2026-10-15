# GOXION AI · Beta visual F1

## Objetivo
Reemplazar temporalmente la cuadrícula de plataformas **solo en una vista previa** de `Ayuda → Soporte` por una mascota real dibujada con SVG, animada mediante CSS y estados JavaScript. Al tocarla se abre una ventana de chat demostrativa.

## Abrir beta
Una vez que estos archivos de preview estén publicados por GitHub Pages: `https://henrygonzalezestrada-cyber.github.io/goxion/preview/goxion-ai/`

**Importante:** este directorio aislado carga `../../ayuda.html` en un iframe *del mismo origen*, agrega estilos y comportamiento a esa página y abre automáticamente la pestaña Soporte. No sustituye, bifurca ni altera los archivos oficiales.

Acceso: usa **Mi Espacio** e inicia sesión como un cliente real. El bloqueo de Soporte que ya existe sigue funcionando. No se crea un usuario ficticio ni se elude la autorización.

## Lo que sí incluye
- Mascota animada por CSS/SVG, con parpadeo, leve movimiento, antena luminosa, alegría, escucha, pensamiento y habla simulada.
- Botón y mascota abren el mismo chat modal, con cierre por X, fondo y Escape.
- Ejemplos conversacionales explícitamente marcados como demostración; no envían peticiones a ninguna API.
- Respeta `prefers-reduced-motion`, navegación por teclado, foco sin halo de selección automática de la X y soporte móvil.
- Conserva las FAQ, comentarios, contacto humano y funciones anteriores del soporte debajo del bloque nuevo.
- Conservar los nodos antiguos ocultos evita errores en el renderizador de plataformas existente durante refrescos.

## Fuera del alcance
- **Sin IA, Groq, claves API ni conexión al correo.**
- **Sin consultas ni escritura de datos privados**, sin código de verificación automático.
- Sin cambios en `ayuda.html`, `admin.html`, `index.html` o motores financieros.
- Sin garantía de apariencia en Safari iOS físico hasta validación humana en el dispositivo.

## Arquitectura
- `index.html`: envoltorio de prueba de mismo origen sobre `../../ayuda.html`.
- `mascota.css`: estilo local bajo `#view-soporte`.
- `mascota.js`: inyección limitada al contenedor `smart-support-card`, estados, navegación y chat.
- `check.mjs`: revisión estática y de sintaxis.

Estética inspirada en el concepto [robot-heads](https://github.com/fayazara/robot-heads) (MIT, Fayaz Ahmed), **sin reutilizar su código React** para no incorporar librerías, CDNs ni dependencias en GOXION.

## Siguientes fases
Aprobar primero proporciones/animaciones. Después: API segura para respuestas verificadas, lectura autorizada de Mi Espacio y escalamiento a las notificaciones existentes de Admin.
