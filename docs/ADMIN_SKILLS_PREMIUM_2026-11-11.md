# GOXION · Skills de diseño premium para Admin (investigación 11/nov/2026)

**Objetivo:** aprovechar habilidades reales de diseño para mejorar el Admin **existente** sin convertir GOXION en una plantilla, cambiar el motor financiero, instalar frameworks innecesarios ni perder las animaciones de Index.

## Popularidad comprobada en GitHub (consulta 11/nov/2026)

Las cifras son estrellas del **repositorio completo**, no de cada skill y no equivalen a pruebas de calidad ni a popularidad en TikTok.

| Recurso | GitHub, aprox. | Aporte concreto | Ajuste a GOXION |
|---|---:|---|---|
| [Anthropic / frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | 193 100 estrellas (repositorio skills) | Dirección estética con identidad propia; rechazo de diseños genéricos y autocrítica | Muy útil para una visión premium sin perder identidad |
| [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 148 208 | Biblioteca de estilos, paletas, tipografía, UX, densidad y gráficos; design-system persistente | **Alta:** dashboard, datos densos y componentes |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | 113 537 | Dirección artística, control anti-plantilla, revisión de capturas en navegador | **Media:** excelente para superficies públicas; adaptar con cuidado a Admin |
| [Impeccable](https://github.com/pbakaus/impeccable) | 108 280 | `critique`, `audit`, `polish` y detector de problemas visuales/UX en navegador | **Prioridad 1:** mejorar una app que ya existe |
| [Emil Kowalski / Skills](https://github.com/emilkowalski/skills) | 56 133 | Microinteracciones, timing, easing y revisión de movimiento | **Alta:** transiciones con intención, sin efectos gratuitos |
| [Hallmark](https://github.com/Nutlope/hallmark) | 53 378 | Reglas anti-"AI slop", tokens y revisión de resultado; rediseño explícito | **Alta como filtro**, no copiar sus temas |
| [Vercel / web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | 33 910 (colección agent-skills) | Auditoría de accesibilidad, interacciones, estados, formularios y responsive | **Prioridad 1 como lista de calidad** |

**Datos adicionales:** los autores identifican licencias MIT/Apache-2.0 según el proyecto. Revisar la licencia de cada recurso, la dependencia y cualquier ejecutable antes de instalarlo; no copiar scripts de terceros sin auditoría.

## Señales en redes (no confundir con ranking oficial de TikTok)

- Una recopilación de publicaciones públicas de TikTok de terceros atribuye a @felix.jro (junio de 2026) un video de ~141 mil visualizaciones sobre Taste Skill, Impeccable y las skills de Emil Kowalski, y a @nocode.joshua (~134 mil visualizaciones) un video de skills que incluye Emil/UI UX Pro Max.
- Otra entrada de esa recopilación, del 7/nov/2026, menciona específicamente UI UX Pro Max + Impeccable para mejorar interfaces genéricas.
- Estas cifras proceden de **agregadores externos** ([TTAnon codex UI](https://ttanon.com/discover/codex-ui-design), [TTAnon Claude skills](https://ttanon.com/discover/claude-skills-design)), no de la API oficial de TikTok. No se deben interpretar como auditoría exhaustiva de tendencias. La popularidad mejor confirmada aquí es la de GitHub.

## Conclusión: combinación adecuada para GOXION

1. **Dirección:** frontend-design para definir qué hace exclusivo a GOXION antes del CSS, más la biblioteca UI/UX Pro Max enfocada en dashboard.
2. **Pulido:** Impeccable para crítica estructurada de componentes; Hallmark para detectar repeticiones genéricas y adornos sin propósito.
3. **Movimiento:** reglas de Emil Kowalski para animar estados y acciones, no pantallas completas sin necesidad.
4. **QA:** Vercel para accesibilidad, contraste, formularios, teclado, responsividad y estados. Revisión visual real con capturas y navegador.
5. **Taste Skill:** usar principalmente en futuras páginas de marketing o como inspiración de dirección artística; su enfoque de sitio empresarial no debe sustituir el patrón de uso de un panel de administración.

Las skills son instrucciones y herramientas para agentes de programación, no un reentrenamiento de ChatGPT. **No se han instalado ni ejecutado scripts de terceros en GOXION.** Para trabajar con esta guía en otro chat, leer este documento y la skill propia indicada abajo.

## Skill propia del proyecto

Archivo: [`.agents/skills/goxion-admin-premium/SKILL.md`](../.agents/skills/goxion-admin-premium/SKILL.md)

Incluye un protocolo específico de GOXION: diseño no genérico, identidad Admin, auditoría previa, datos desde el motor financiero, estados y acciones, motion, accesibilidad, pruebas en iPhone/Safari y restricciones del contrato visual. Es una guía original derivada de criterios de ingeniería y diseño, no una copia literal de otra skill.

## Antes de un cambio visual futuro

- Leer `AGENTS.md`, `docs/GOXION_VISUAL_CONTRACT.md`, `docs/ADMIN_FUNCTION_REGISTRY.md`, archivos JS/CSS/HTML actuales y las guías anteriores.
- Auditar pantallas y flujos actuales de Admin; conservar lo aprobado, definir qué cambia y qué no.
- **Separar cambio visual y cambio financiero en PR distintos**. No hacer que Admin sume precios, deduzca mora o altere datos contables.
- Respetar Rajdhani en Admin, Poppins en Index/Ayuda, navegación y ficha aprobadas.
- Probar 280/320/360/375/390/430/768 px, iOS Safari, enfoque, teclado, `prefers-reduced-motion`, scroll y tablas.
- Confirmar cambios mediante capturas y pruebas, no por afirmaciones del agente.

**Estado:** investigación + skill documental, sin modificaciones visuales ni de producción.
