# GOXION · Gixys · Fase 8 · Alegría, tipografía y recompensa premium

**Fecha:** 16 de octubre de 2026. **Rama beta:** `beta/gixys-gusto-ojos-confeti-v8-20261016`. **Base:** PR #138 / beta V7. **Aún no aprobado para Ayuda oficial**.

## Observaciones expresas del usuario
1. Evitar exceso de líneas en la burbuja de texto y palabras solitarias como «que», sin ocupar todo el ancho de la pantalla.
2. Gixys más vivos y alegres: ojos felices con forma de arcos «n n», corazones, brillos y partículas discretas.
3. El desbloqueo del secreto requiere celebración memorable y breve, con confeti.
4. La recompensa debe parecer parte de GOXION: glass/blur, Poppins, púrpura/cian, proporciones, sombras y botones coherentes con Ayuda.
5. Corregir **ahora**, en beta espejo, la alineación exacta del corazón de lealtad, sin esperar su incorporación oficial.

## Realización beta
- Distribución de líneas precalculada con algoritmo de puntuación de ancho y penalizaciones por palabras huérfanas; ancho máximo acotado alrededor de 140px. Conserva la escritura progresiva, sin saltos o líneas reacomodadas a mitad de frase.
- No reemplazar la librería de referencia **`bot-avatars@0.2.2`**: material Plastic y solo ojos. El estado nativo `working` activa sus propios momentos de risa con **párpados en arco**; conservar expresión natural en vez de pegar una cara falsa. Las partículas de corazones/destellos son una capa temporal y no bloquean el toque.
- 8 partículas delicadas, distribuidas alrededor del avatar mientras se escribe o reacciona; reducidas/ocultas con `prefers-reduced-motion`.
- Recompensa del secreto de 3 encuentros: 30 partículas de confeti, aura suave y entrada del importe; se crea dentro de una **`glass-card` oficial** con estilos GOXION, no en un sistema visual paralelo. El 5% sigue siendo **SIMULADO** (no se crea cupón, descuento, servicio, transacción ni derecho a descuento).
- Corazón PulseHeart original conservado en rojo `#ff4d6d`, ahora de 30px y situado en un área de 30x30 con eje vertical exacto respecto a «Nivel de Lealtad» y sin invadir `loyalty-count`. Ajustes limitados a la beta.
- QA: Chromium y WebKit, siete anchos, bloqueos, saltos de línea sin huérfanos, centros geométricos de corazón/título, confeti, partículas, glass, navegación y no tráfico privado.

## Pendientes no negociables
- Aprobación visual de esta beta en Safari/iPhone **antes** de tocar Ayuda oficial.
- Para cupón real 5%: definir elegibilidad, vigencia, límite por cliente, combinabilidad con promociones/registro/lealtad, generación segura del servidor, unicidad/idempotencia y auditoría en motor existente, sin inventar motor de descuentos paralelo.
- Persistir en GitHub el cierre de fase y guía de integración únicamente tras aceptación.
