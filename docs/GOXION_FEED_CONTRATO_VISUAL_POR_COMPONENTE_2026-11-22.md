# GOXION · Contrato visual POR COMPONENTE del feed «Mi Espacio»

**Revisión de coherencia:** 22 de noviembre de 2026  
**Alcance:** laboratorio `preview/experiencia-mi-espacio-inteligente/morph-v2.html` y futuras adaptaciones oficiales.  
**Estado:** reglas basadas en acuerdos y en el código existente; esto NO implica aprobación productiva ni validación Safari física.

## Corrección de una interpretación demasiado amplia

La regresión del **separador de color bajo el logo al abrir Servicios** motivó una regla de eliminación de rayas y de texto duplicado. Esa decisión es **correcta para la tarjeta de Servicios observada**, pero **no autoriza prohibir líneas, gradientes, colores, cristales, textos funcionales ni animaciones en otras piezas del feed**. Antes se redactó con palabras demasiado categóricas; el criterio correcto es **responsabilidad y jerarquía por componente, no uniformidad de apariencia ni eliminación sistemática de efectos**.

**Principio superior compartido:** mantener el ADN GOXION (material neutro, tipografía, tamaños táctiles, márgenes, cromática medida, animaciones con intención, progresive disclosure); cada componente conserva lo que necesita para cumplir su función. No cambiar elementos ya aprobados en otro módulo para resolver el diseño local de Servicios.

## Matriz obligatoria antes de cualquier nueva edición

| Componente | Función y jerarquía | Recursos que SE DEBEN preservar | Evitar, específicamente |
| --- | --- | --- | --- |
| **Hero / saludo** (`.focus`, `.greeting`) | Estado principal y acción; saludo independiente | Diseño «Compacta centrada», cristal control **Neutro 15%** (valor del control, NO alfa CSS 15%), CTA **8%**, iluminación/onda, rotación de saludo y transiciones aprobadas. Fuente inmutable: `docs/GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md` | Rediseñarlo o tocar cadencia, texto, material y geometría sin instrucción explícita |
| **Lealtad** (`.gxb-*`) | Pagos consecutivos, avance y recompensa | Barra de progreso informativa animada; emoji estrella a color y watermark ampliado abajo; contraste en título; morph contextual; detalle/condiciones disponibles | Eliminar el medidor o la animación por una prohibición de «líneas»; llenar la compacta con reglas |
| **Referidos** (`.gxb-*`) | Invitación, validación de meses y beneficio | Emoji expresivo, estados sin invitado/parcial/listo/reclamado, progreso **solo cuando existe avance real**, títulos contrastados, acciones y condiciones; morph y microanimaciones con intención | Mostrar barra ficticia si no hay invitado; ocultar acciones o aplanar todos los estados visuales |
| **Misiones** (`.gxb-*`) | Tareas individuales, avance y recompensa | Barra animada, checkbox con microanimación, separadores de filas **cuando organizan tareas**, emoji/dibujo expandido, estados de recompensa, contraste tipográfico | Quitar divisiones funcionales o ticks por una regla de Servicios; transformar tareas en párrafos largos |
| **Ahorro** (`.gxv-*`) | Mostrar de un vistazo logos y cuantía comparativa | Superficie neutra, logos reales flotantes con profundidad y leve solape, escala/profundidad por cantidad de plataformas, cifra protagonista y contador animado, 1 sola frase explicativa, ritmo vertical previamente ajustado | Aplanar logos, eliminar flotación por tratarla como «decoración» o inventar ahorro real; añadir más cajas/títulos |
| **Servicios** (`.gxs-*`) | Reconocer plataforma/estado y administrar accesos | Logo, nombre, estado semántico corto (punto + texto), expansión local, datos y acciones reales, X **35px/16px** sobre área táctil **44px**; un aviso breve cuando aporte decisión | **La línea decorativa bajo el logo** (color o neutra), repetir el mismo estado en título/aviso/párrafo, tintar toda la tarjeta o generar más recuadros |
| **Catálogo** (`.gxc-mini-*` y oficial) | Descubrimiento y exploración | Sus geometrías/morph, promociones y componentes acordados; no reemplazarlo por la estética de Servicios | Regresión de efectos funcionales, duplicación de barras/encabezados o cambio accidental desde selectores compartidos |

## Matices concretos de los recursos

1. **Líneas:** la raya/gradiente inmediatamente bajo el logo de **Servicios** fue decorativa y se elimina. Una barra de progreso, un separator entre tareas o un medidor que organiza información **no** son esa misma raya, y deben conservarse cuando siguen cumpliendo su función.
2. **Color:** el verde/ámbar/naranja/rojo de **Servicios** es una semántica de estado local. Lealtad, Referidos, Misiones y Ahorro pueden usar sus acentos de identidad, degradados informativos, checkbox y emojis. No imponer un sistema monocromático de estado a todo el feed.
3. **Texto:** en el resumen de Servicios, «logo + nombre + estado» y aviso corto sin repetición. El límite práctico de 30–65 caracteres se diseñó para **avisos breves de muestra de Servicios**, **no** para condiciones legales, explicaciones de beneficios, tareas ni pasos de seguridad; esos detalles siguen disponibles bajo demanda.
4. **Efectos y movimiento:** hay funciones distintas: progreso animado, tick de misión, morph espacial, logos flotantes, contador de ahorro y estados de acceso. Conservar sus animaciones actuales y `prefers-reduced-motion`; evaluar mejoras de modo local sin convertir «no decorar» en «no animar».
5. **Cristal y opacidad:** el material compartido base `.gxc-surface` conserva `rgba(8,8,12,.371)` y `blur(11.75px)`; eso corresponde al control de profundidad **15%**. Los CTA translúcidos aprobados usan `rgba(255,255,255,.08)` donde aplica. Una microsuperficie más oscura para legibilidad o un contraste tipográfico no implica «encapsular todo».
6. **Futuras tarjetas:** compartir ADN, tamaño de cierre, accesibilidad y ritmo; **no exigir idénticos emojis, barras, cromática, animación, altura, densidad o acciones** entre módulos de objetivos distintos.

## Verificación técnica del alcance actual

Inspección del código en `main` tras retirar la línea de Servicios:

- **Servicios del laboratorio:** selectores `.gxs-card`, `.gxs-status`, `.gxs-notice`, `.gxs-extra-notice`; se eliminó `.gxs-line` y su elemento HTML. No se alteraron las clases `.gxb-mini-progress`, `.gxb-meter`, `.gxb-task-check` ni `.gxv-slot` / `.gxv-amount`.
- **Rama de integración conectada:** PR borrador [#231](https://github.com/henrygonzalezestrada-cyber/goxion/pull/231), selectors limitados a `#view-dashboard .gx-service-*` y `.gx-services-stack`; no fusionada ni publicada. CSS compartido del hero/beneficios/ahorro no debe recibir el veto local de Servicios.
- **X común confirmada por el usuario:** círculo cian 35px + glifo 16px, área táctil 44×44px. Es una regla transversal **porque se aprobó explícitamente como común**.
- **Fuente de auditoría de beneficios:** `docs/GOXION_AUDITORIA_BENEFICIOS_FEED_2026-11-22.md`; **fuente de continuidad de ahorro:** `docs/GOXION_FEED_MI_ESPACIO_CONTINUIDAD_2026-11-22.md`.

**Puerta de control antes de cada PR del feed:** enumerar los selectores tocados; declarar qué componente cambia y cuáles quedan congelados; comparar visualmente compacta/expandida y casos de estado; verificar que animaciones y funciones previamente aprobadas sigan presentes. No dar por aprobado el aspecto de iPhone sin verlo allí. Este documento ajusta la INTERPRETACIÓN de la regla de Servicios; no modifica el código, la versión oficial ni las decisiones visuales anteriores.
