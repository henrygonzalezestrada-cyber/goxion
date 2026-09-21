window.GOXION_DATA = window.GOXION_DATA || {};
window.GOXION_DATA.supportIssues = { 
            "Netflix": [ 
                { 
                    issue: "🔑 Solicitar Código de Acceso", 
                    instructions: "1. En tu pantalla selecciona 'Iniciar Sesión con Código'.<br>2. Al hacerlo, el sistema enviará un código <strong>al correo que nosotros administramos</strong>.<br>3. Abajo indícanos el correo exacto que aparece en tu pantalla y envíanos la solicitud. Te responderemos con el código al instante.", 
                    labelInput: "Correo que aparece en tu TV:", 
                    templateWA: "Hola GOXION, acabo de enviar un código al correo asignado. Solicito CÓDIGO DE ACCESO para NETFLIX.\n\n👤 Correo en pantalla: " 
                }, 
                { 
                    issue: "📺 Tu TV pide Actualizar Hogar", 
                    instructions: "1. Selecciona <strong>'Actualizar Hogar'</strong> en tu TV.<br>2. La pantalla enviará un correo de confirmación <strong>a nuestra bandeja</strong>.<br>3. Ingresa abajo el correo que aparece en pantalla y envíanos tu solicitud para autorizar tu TV.", 
                    labelInput: "Correo que aparece en tu TV:", 
                    templateWA: "Hola GOXION, mi TV pide actualizar HOGAR en NETFLIX. Ya envié el correo de autorización.\n\n📧 Correo en pantalla: " 
                }, 
                { 
                    issue: "⚠️ Límite de Pantallas", 
                    instructions: "Recuerda que cada perfil equivale a 1 pantalla. Si te marca límite, revisa que no tengas otra TV usándolo al mismo tiempo. Si el problema persiste, indícanos el nombre de tu perfil para revisarlo.", 
                    labelInput: "Nombre de tu Perfil:", 
                    templateWA: "Hola GOXION, tengo problemas de límite de pantallas en NETFLIX.\n\n👤 Mi Perfil es: " 
                } 
            ],
            "Disney+": [ 
                { 
                    issue: "🔑 Código de Verificación", 
                    instructions: "1. Ingresa a la app y presiona 'Continuar' con el correo asignado.<br>2. La plataforma enviará un código de 6 dígitos <strong>a nuestra bandeja de entrada</strong>.<br>3. Escribe el correo aquí abajo para indicarnos que ya lo solicitaste y te lo enviaremos.", 
                    labelInput: "El correo que acabas de ingresar:", 
                    templateWA: "Hola GOXION, solicito CÓDIGO DE VERIFICACIÓN para DISNEY+.\n\n📧 Correo: " 
                }, 
                { 
                    issue: "🏠 Mensaje de 'Hogar Principal'", 
                    instructions: "Selecciona 'Actualizar Hogar' en tu dispositivo. Eso nos enviará una solicitud de autorización al correo maestro. Escríbelo abajo para proceder.", 
                    labelInput: "Correo de tu cuenta Disney+:", 
                    templateWA: "Hola GOXION, Disney+ me pide autorización de Hogar.\n\n📧 Correo asignado: " 
                } 
            ],
            "Max": [ 
                { 
                    issue: "🔑 Iniciar Sesión con Código", 
                    instructions: "1. Selecciona 'Iniciar Sesión con un Código' en tu TV.<br>2. Aparecerán 6 letras/números en tu pantalla.<br>3. Como nosotros manejamos la plataforma, escribe ese código abajo para que nosotros lo vinculemos manually.", 
                    labelInput: "Código en tu pantalla de TV:", 
                    templateWA: "Hola GOXION, solicito que vinculen mi TV a MAX.\n\n🔤 Código TV: " 
                }, 
                { 
                    issue: "❌ Contraseña Incorrecta", 
                    instructions: "Asegúrate de no haber dejado espacios al copiar los datos. Si no te deja entrar, indícanos el correo de la cuenta para enviarte la contraseña actualizada.", 
                    labelInput: "Correo de la cuenta MAX:", 
                    templateWA: "Hola GOXION, me marca contraseña incorrecta en MAX.\n\n📧 Correo: " 
                } 
            ],
            "Prime Video": [ 
                { 
                    issue: "📺 Registrar Dispositivo", 
                    instructions: "1. Abre Prime Video y presiona 'Identifícate'.<br>2. Mostrará un código de registro en pantalla.<br>3. Escríbelo abajo para que nosotros enlacemos tu dispositivo desde nuestro panel maestro.", 
                    labelInput: "Código en Pantalla de TV:", 
                    templateWA: "Hola GOXION, solicito vincular mi TV a PRIME VIDEO.\n\n📺 Código TV: " 
                } 
            ],
            "YouTube": [ 
                { 
                    issue: "📩 No me llegó la invitación", 
                    instructions: "Verifica tu carpeta de SPAM en Gmail. Recuerda que no debes estar en otro grupo familiar activo. Si no está, compártenos tu correo para reenviarla.", 
                    labelInput: "Tu correo personal de Gmail:", 
                    templateWA: "Hola GOXION, requiero reenviar la INVITACIÓN a YOUTUBE PREMIUM.\n\n📧 Mi Gmail: " 
                } 
            ],
            "ViX": [ 
                { 
                    issue: "🔑 Vincular TV o Iniciar Sesión", 
                    instructions: "Selecciona 'Iniciar Sesión'. Envíanos el código alfanumérico que aparece en tu pantalla de TV para enlazarlo desde nuestra base de datos.", 
                    labelInput: "Código en pantalla:", 
                    templateWA: "Hola GOXION, necesito ayuda para vincular VIX PREMIUM.\n\n📱 Código TV: " 
                } 
            ],
            "Crunchyroll": [ 
                { 
                    issue: "🔑 Vincular Consola o TV", 
                    instructions: "Dirígete a 'Activar dispositivo' en tu consola o TV. Aparecerá un código, escríbelo aquí para que nosotros autoricemos la cuenta.", 
                    labelInput: "Código de activación de pantalla:", 
                    templateWA: "Hola GOXION, solicito vincular mi dispositivo a CRUNCHYROLL.\n\n🎮 Código: " 
                } 
            ],
            "Microsoft": [ 
                { 
                    issue: "💻 Reenviar Invitación familiar", 
                    instructions: "Indícanos el correo personal (Outlook/Hotmail) con el que te uniste para verificar y enviarte el enlace nuevamente.", 
                    labelInput: "Tu correo Outlook/Hotmail:", 
                    templateWA: "Hola GOXION, necesito que me reenvíen la invitación de MICROSOFT 365.\n\n📧 Correo: " 
                } 
            ],
            "Google One": [ 
                { 
                    issue: "☁️ Espacio no reflejado", 
                    instructions: "Asegúrate de haber aceptado la invitación de familia en tu Gmail. Indícanos tu correo si sigues sin ver los beneficios.", 
                    labelInput: "Tu correo Gmail personal:", 
                    templateWA: "Hola GOXION, sigo sin ver reflejado mi almacenamiento de GOOGLE ONE.\n\n📧 Mi Gmail: " 
                } 
            ],
            "Default": [ 
                { 
                    issue: "🔑 Solicitar Código / Asistencia", 
                    instructions: "Inicia sesión en tu dispositivo. Si te solicita un código o confirmación por correo, presiona 'Enviar' e indícanos tu correo o código en pantalla para proceder.", 
                    labelInput: "Dato en pantalla / Correo:", 
                    templateWA: "Hola GOXION, requiero asistencia/código para la plataforma seleccionada.\n\n📱 Dato: " 
                } 
            ]
        };
