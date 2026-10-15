# GOXION · Goxy F7 · Gateway seguro de IA (beta)

## Estado
- Render original Canvas `robot-heads` y fases F1–F6 intactos.
- Chat opcional mediante nueva Edge Function **`goxy-ai-beta`**: debe estar aislada de `mi-espacio`, `admin-*`, acciones financieras y cualquier operación de escritura de servicios.
- **La IA no se considera activa hasta comprobar `GROQ_API_KEY` en Secrets.** La beta tiene fallback a las guías existentes aun sin clave.
- En la página, primero elegir plataforma y situación concreta: el backend solo acepta guías incluidas en el snapshot derivado del archivo oficial.

## Arquitectura
```
Mi Espacio (token cliente firmado) → Goxy beta (solo UI)
                                       │
                    guías: assets/js/ayuda/data/support-issues.js
                                       │
                           puente goxy-ai-client.js
                                       │ HMAC token (X-Client-Token)
                                       ▼
                     Supabase /functions/v1/goxy-ai-beta
                            │  verificar firma, exp, cliente activo
                            │  rechazar PII/códigos y guía no aprobada
                            │  cuota PostgreSQL transaccional
                            ▼
                     Groq chat completions, gpt-oss-20b
                            │ respuesta
                            ▼
                  Goxy: speaking / happy / error
```

## Controles que no se negocian
1. **Clave únicamente en secret de Supabase**: `GROQ_API_KEY` en el panel de Supabase, jamás en `ayuda.html`, GitHub, JavaScript, `localStorage` ni mensajes de chat.
2. Supabase `verify_jwt=false` **solo porque** GOXION firma tokens HMAC de dos segmentos y no usa JWT Auth estándar en Mi Espacio. La función valida HMAC SHA-256 con la misma clave `SUPABASE_SERVICE_ROLE_KEY` que usa `login-goxion`, expiración, rol y estado del cliente en BD. No basta un ID de cliente enviado por browser.
3. El proveedor solo recibe **pregunta saneada y guía oficial pública**. No se consultan ni envían saldos, claves, perfiles, PIN, correos, cuentas, registro de pagos o cualquier otro dato de Mi Espacio.
4. La función **no escribe** en tablas de GOXION ni genera solicitudes a Admin. Únicamente añade una fila de cuota en `goxy_ai_beta_requests`. No guarda mensajes ni respuestas.
5. Cuota transaccional por cliente: **8 solicitudes/24 h; mínimo 20 s entre llamadas**, mediante la función `goxy_ai_beta_take_quota`. RLS activado y privilegios revocados a roles públicos.
6. El modelo elegido es `openai/gpt-oss-20b`. No usar IDs de Llama 3.1/3.3 retirados para la modalidad gratuita.
7. CORS solo origen `https://henrygonzalezestrada-cyber.github.io`. El CORS no reemplaza la validación HMAC.
8. Ante proveedor no disponible, cuota agotada, expiración de sesión o error, vuelve a las guías y el contacto humano aprobado.
9. Las indicaciones de IA son explicativas: cuando una gestión requiere correo maestro, autorización o código, solo puede intervenir un asesor; Goxy nunca pide los secretos al cliente.
10. **Privacidad:** antes de habilitar la IA a usuarios finales informar que sus consultas saneadas y fragmentos públicos de la guía se enviarán a Groq conforme a sus términos de tratamiento de datos.

## Fuente de conocimiento
- **Única fuente editada a mano:** `assets/js/ayuda/data/support-issues.js`.
- `knowledge.json` es un snapshot **generado automáticamente**, sin `templateWA` ni `labelInput`, para que el backend nunca confíe en instrucciones inyectadas desde el navegador.
- Verificar sincronía: `node scripts/goxy-knowledge-sync.mjs`.
- Actualizar después de modificar el archivo canónico: `node scripts/goxy-knowledge-sync.mjs --write`, revisar diff y volver a desplegar la función.

## Activación del proveedor (acción del administrador)
1. Crear una API key en el panel del proveedor **GroqCloud**. No pegarla en ChatGPT ni en GitHub.
2. Abrir **Supabase Dashboard → GOXION principal → Edge Functions → Secrets** y guardar el nombre exacto `GROQ_API_KEY`.
3. Consultar F7 iniciando sesión como cliente de prueba en **Mi Espacio**. Si el estado señala IA habilitada, elegir una guía y probar una pregunta segura.
4. Comprobar 401 sin token, 403 con cliente suspendido, 422 con código/correo, 429 al superar cuota, 200 con guía válida, caída de red y escalamiento humano **antes** de mostrar la IA a clientes.
5. Respetar la cuota/términos del proveedor; el límite GOXION no es promesa de gratuidad.

## QA
- `node preview/goxion-ai/check.mjs`: regresión visual F1–F6 y estructura cliente F7.
- `node scripts/goxy-knowledge-sync.mjs`: catálogo canónico sincronizado.
- `node --test scripts/goxy-f7-security.test.mjs`: HMAC, mínimos de autorización, cuotas, privacidad y modelo.
- Suite GOXION existente: `npm run verify`, `npm run test:smoke`.
- Aceptación visual Safari: caricia horizontal, scroll vertical, chat sin teclado automático, indicador thinking/searching/speaking/error, cierre durante solicitud, reingreso de sesión.

## NO incluye aún
- Consultas privadas de estado financiero o beneficios.
- Atención automática de códigos o administración de plataformas.
- IA libre fuera de una guía verificada.
- Integración de Goxy en Soporte oficial `ayuda.html`; se conserva ruta `preview/goxion-ai/`.

## Próximo hito
Tras aprobar la IA F7 y el funcionamiento con proveedor activo: fase privada autorizada mediante herramientas de lectura del backend financiero existente, con auditoría de datos mínimos, sin delegar operaciones de pago al LLM.
