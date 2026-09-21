        function revealOnScroll() {
            var reveals = document.querySelectorAll(".reveal");
            for (var i = 0; i < reveals.length; i++) {
                var windowHeight = window.innerHeight;
                var elementTop = reveals[i].getBoundingClientRect().top;
                var elementVisible = 50;
                if (elementTop < windowHeight - elementVisible) {
                    reveals[i].classList.add("active");
                }
            }
        }
        window.addEventListener("scroll", revealOnScroll);

        window.addEventListener('scroll', () => {
            const bar = document.getElementById('sticky-client-bar');
            const dashActive = document.getElementById('view-dashboard').classList.contains('active');
            
            if (dashActive && window.scrollY > 120) {
                bar.classList.add('show');
            } else if (bar) {
                bar.classList.remove('show');
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            // Tras una recarga, la identidad vive otra vez sólo en memoria.
            // Si existe token, esperamos a Supabase antes de decidir la vista final.
            const hasSessionToken = Boolean(localStorage.getItem(GXCORE.STORAGE.CLIENT_TOKEN));
            const initialKey = getCurrentClientKey();
            const restoringSession = hasSessionToken && !initialKey;

            if(initialKey || restoringSession) {
                document.getElementById('view-inicio').classList.remove('active');
                document.getElementById('view-dashboard').classList.add('active');
                document.getElementById('tab-inicio-icon').innerText = '👤';
                document.getElementById('tab-inicio-text').innerText = 'Mi Espacio';

                const guestCard = document.getElementById('guest-action-card');
                if(guestCard) guestCard.style.display = 'none';

                // No mostramos "Cerrar Sesión" hasta confirmar qué cliente corresponde al token.
                document.getElementById('header-btn-text').innerText =
                    initialKey ? 'Cerrar Sesión' : 'Mi Espacio';
            } else {
                document.getElementById('view-inicio').classList.add('active');
                document.getElementById('view-dashboard').classList.remove('active');
            }
            setTimeout(revealOnScroll, 100);

            const popLogosEls = document.querySelectorAll('.pop-logo');
            let popIdx = 0;
            if(popLogosEls.length > 0) {
                setInterval(() => {
                    popLogosEls.forEach(el => el.classList.remove('active'));
                    popIdx = (popIdx + 1) % popLogosEls.length;
                    popLogosEls[popIdx].classList.add('active');
                }, 3000);
            }

            const comboPairs = [
                ["logos/hbo-max.PNG", "logos/prime-video.PNG"],
                ["logos/netflix.PNG", "logos/spotify.PNG"],
                ["logos/disney.PNG", "logos/youtube.PNG"]
            ];
            let comboIdx = 0;
            const leftEl = document.getElementById('combo-img-left');
            const rightEl = document.getElementById('combo-img-right');
            
            if(leftEl && rightEl) {
                setInterval(() => {
                    comboIdx = (comboIdx + 1) % comboPairs.length;
                    leftEl.src = comboPairs[comboIdx][0];
                    rightEl.src = comboPairs[comboIdx][1];
                }, 4000); 
            }

            const benefitsEls = document.querySelectorAll('.rotating-benefit-item');
            let benIdx = 0;
            if(benefitsEls.length > 0) {
                setInterval(() => {
                    benefitsEls.forEach(el => el.classList.remove('active'));
                    benIdx = (benIdx + 1) % benefitsEls.length;
                    benefitsEls[benIdx].classList.add('active');
                }, 3500);
            }
        });

        const rotatorTexts = [
            "✓ Calidad 4K Ultra HD", 
            "✓ Perfiles 100% privados", 
            "✓ Renovación sin perder historial", 
            "✓ Compatibles con cualquier TV"
        ];
        
        let rotatorIdx = 0;
        setInterval(() => {
            const textEl = document.getElementById('dynamic-rotator');
            const boxEl = document.getElementById('rotator-box');
            if(textEl && boxEl) {
                textEl.style.opacity = '0';
                setTimeout(() => {
                    rotatorIdx = (rotatorIdx + 1) % rotatorTexts.length;
                    textEl.innerText = rotatorTexts[rotatorIdx];
                    textEl.style.opacity = '1';
                }, 400); 
            }
        }, 4000);

        const INFO_SERVICIOS = {
            "netflix": "Vive una experiencia superior con tu perfil totalmente individual y personalizable con PIN. Disfruta películas y estrenos en calidad 4K Ultra HD y sonido Dolby Atmos. Tu historial, lista de favoritos y recomendaciones se mantienen completamente privados.",
            "disney": "Acceso ilimitado al catálogo de Disney, Pixar, Marvel, Star Wars y National Geographic en calidad 4K UHD. Disfruta de un perfil individual para descargas offline y visualización cómoda sin interrupciones.",
            "max": "Suscripción Platino con calidad de video 4K UHD. Disfruta del universo de HBO, Warner Bros, DC Comics y Cartoon Network. Tu perfil privado garantiza que siempre reanudes donde te quedaste.",
            "prime": "Accede al catálogo completo de Prime Video. Perfil personalizado, reproducción en calidad superior 4K y descargas habilitadas para disfrutar contenido sin conexión a internet.",
            "youtube": "¡Doble beneficio! Incluye YouTube Premium (videos sin anuncios) y acceso total a YouTube Music Premium. Reproducción en segundo plano y descargas offline para todos tus dispositivos móviles o TV.",
            "vix": "Todos los partidos de la Liga MX, contenido de TV exclusivo, telenovelas y los mejores estrenos premium en español sin una sola interrupción publicitaria.",
            "crunchyroll": "Membresía Mega Fan. Disfruta del anime sin publicidad, episodios de estreno simulcast y visualización offline.",
            "spotify": "Música infinita sin anuncios, opción para descargas y calidad de sonido superior. Podemos asignarte un perfil individual o hacer el Upgrade a tu propia cuenta personal.",
            "microsoft": "Membresía Microsoft 365 Family. Incluye 1TB de almacenamiento seguro en nube (OneDrive) y acceso completo a las aplicaciones premium (Word, Excel, PowerPoint) para tus dispositivos.",
            "google": "Expande rápidamente tu almacenamiento en la nube para Google Drive, Gmail y Google Fotos. Además, desbloquea las funciones de edición avanzadas en la aplicación de Fotos.",
            "default": "Perfil seguro y estable. Garantizamos protección total, reposición inmediata en caso de caídas y soporte técnico dedicado durante todo tu periodo de suscripción."
        };

        function hideSplash() {
            const splash = document.getElementById('splash-screen');
            if (splash.style.opacity === '0') return;
            splash.style.opacity = '0';
            setTimeout(() => { 
                splash.style.visibility = 'hidden'; 
                document.body.classList.remove('no-scroll'); 
            }, 600);
        }

        window.addEventListener('load', async () => {
            // Evita mostrar fugazmente el Inicio público antes de restaurar Mi Espacio.
            const splashFallback = setTimeout(hideSplash, 4500);
            try {
                await cargarDatosYVerificarSesion();
            } finally {
                clearTimeout(splashFallback);
                actualizarBloqueoSoporte();
                setTimeout(hideSplash, 250);
            }
        });

        function actualizarBloqueoSoporte() {
            const overlay = document.getElementById("support-lock-overlay");
            const soporteView = document.getElementById("view-soporte");
            if (!overlay || !soporteView) return;

            const token = localStorage.getItem(GXCORE.STORAGE.CLIENT_TOKEN) || "";
            const key = getCurrentClientKey() || "";
            const autenticado = Boolean(token && key);
            const soporteActivo = soporteView.classList.contains("active");
            const bloquearScroll = !autenticado && soporteActivo;

            overlay.classList.toggle("show", !autenticado);
            overlay.setAttribute("aria-hidden", autenticado ? "true" : "false");

            if (bloquearScroll) {
                window.scrollTo({ top: 0, behavior: "auto" });
            }

            document.body.classList.toggle("support-scroll-locked", bloquearScroll);
        }

        function openModal(id) { document.getElementById(id).classList.add('show'); }
        function closeModal(id) { document.getElementById(id).classList.remove('show'); }
        window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.classList.remove('show'); }

        function iniciarSaludoDinamico(nombreCompleto) {
            const primerNombre = String(nombreCompleto || "Cliente").trim().split(/\s+/)[0] || "Cliente";
            const frases = [
                `¡Hola, <span>${primerNombre}</span>! 👋`, 
                `¡Qué gusto verte, <span>${primerNombre}</span>! ✨`, 
                `¡Bienvenido a tu espacio, <span>${primerNombre}</span>! 🚀`, 
                `Todo en orden por aquí, <span>${primerNombre}</span> 💎`
            ];
            let index = 0;
            const el = document.getElementById('dynamic-greeting-text');
            if(!el) return;
            
            if(greetingInterval) clearInterval(greetingInterval);
            el.innerHTML = frases[0]; 
            el.style.opacity = 1;
            
            greetingInterval = setInterval(() => {
                el.style.opacity = 0;
                setTimeout(() => { 
                    index = (index + 1) % frases.length; 
                    el.innerHTML = frases[index]; 
                    el.style.opacity = 1; 
                }, 500);
            }, 6000);
        }

    function resetSesionVisual() {
            window.goxionCurrentClientKey = "";
            if(greetingInterval) clearInterval(greetingInterval);
            document.getElementById('header-btn-text').innerText = 'Mi Espacio'; 
            document.getElementById('tab-inicio-icon').innerText = '🏠';
            document.getElementById('tab-inicio-text').innerText = 'Inicio';
            document.getElementById('login-id').value = ''; 
            document.getElementById('login-pin').value = '';
            
            const stickyName = document.getElementById('sticky-client-name');
            if(stickyName) stickyName.innerText = '';
            const bar = document.getElementById('sticky-client-bar');
            if(bar) bar.classList.remove('show');

            const guestCard = document.getElementById('guest-action-card');
            if(guestCard) guestCard.style.display = 'block';

            switchTab('inicio');
        
    }


        function irAlTicket() { 
            const key = getCurrentClientKey(); 
            if(key) {
                setTimeout(() => {
                    const indexUrl = new URL("index.html", window.location.href);
                    indexUrl.search = "";
                    indexUrl.hash = "";
                    indexUrl.searchParams.set("cliente", key);
                    window.location.href = indexUrl.toString(); 
                }, 800);
            }
        }

        function copiarDatoRapido(texto, tipo) { 
            navigator.clipboard.writeText(texto); 
            alert(`¡${tipo} copiado al portapapeles!`); 
        }

        function animarMisionesCompletadasEnSecuencia() {
            const items = Array.from(document.querySelectorAll('#gamif-expanded-coupon .mission-item.done'));
            const total = document.querySelectorAll('#gamif-expanded-coupon .mission-item').length;

            if(!items.length || items.length !== total) return;

            items.forEach(item => {
                item.classList.remove('gx-sequence-reveal', 'gx-seq-hidden');
                item.classList.add('gx-seq-hidden');
            });

            items.forEach((item, index) => {
                setTimeout(() => {
                    item.classList.remove('gx-seq-hidden');
                    item.classList.remove('gx-sequence-reveal');
                    void item.offsetWidth;
                    item.classList.add('gx-sequence-reveal');

                    setTimeout(() => {
                        item.classList.remove('gx-sequence-reveal');
                    }, 760);
                }, 180 + (index * 360));
            });
        }

        window.lanzarConfeti = function() {
            for(let i=0; i<40; i++) {
                let conf = document.createElement('div');
                conf.style.position = 'fixed';
                conf.style.left = Math.random() * 100 + 'vw';
                conf.style.top = '-10px';
                conf.style.width = Math.random() * 8 + 4 + 'px';
                conf.style.height = Math.random() * 8 + 4 + 'px';
                conf.style.backgroundColor = ['#00f2fe', '#7c4dff', '#ff3366', '#ffaa00', '#2ea043'][Math.floor(Math.random()*5)];
                conf.style.zIndex = '9999';
                conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                conf.style.transition = 'transform 2.5s cubic-bezier(0.2, 0.8, 0.2, 1), top 2.5s ease-in, opacity 2.5s';
                document.body.appendChild(conf);
                
                setTimeout(() => {
                    conf.style.top = '100vh';
                    conf.style.transform = `rotate(${Math.random() * 720}deg) translateX(${Math.random() * 150 - 75}px)`;
                    conf.style.opacity = '0';
                }, 50);
                setTimeout(() => conf.remove(), 2600);
            }
        };

        function mostrarMisionCompletada() {
            let toast = document.getElementById("gx-mission-toast");
            if(!toast) {
                toast = document.createElement("div");
                toast.id = "gx-mission-toast";
                toast.className = "gx-mission-toast";
                toast.innerHTML = "<span>✅</span><span>Misión completada</span>";
                document.body.appendChild(toast);
            }

            toast.classList.remove("show");
            void toast.offsetWidth;
            toast.classList.add("show");

            clearTimeout(toast._gxTimer);
            toast._gxTimer = setTimeout(() => toast.classList.remove("show"), 3650);
        }

        function marcarMisionVisual(index, btnId = 'btn-claim-coupon', celebrar = true) {
            const item = document.getElementById('mission-' + index);
            if(!item || item.classList.contains('done')) return;
            item.classList.add('done');
            item.classList.remove('locked');
            const checkbox = item.querySelector('.mission-checkbox');
            if(checkbox) checkbox.innerHTML = '';

            const couponPanel = document.getElementById('gamif-expanded-coupon');
            if(couponPanel && couponPanel.style.display === 'block') {
                item.classList.remove('gx-mission-just-completed');
                void item.offsetWidth;
                item.classList.add('gx-mission-just-completed');
                setTimeout(() => item.classList.remove('gx-mission-just-completed'), 900);
            }

            if(celebrar) {
                mostrarMisionCompletada();
                lanzarConfeti();
            }

            const allMissions = [...document.querySelectorAll('.mission-item')];
            const allDone = allMissions.length > 0 && allMissions.every(m => m.classList.contains('done'));
            const claimBtn = document.getElementById(btnId);
            if(claimBtn && !claimBtn.classList.contains('gx-claim-done')) {
                claimBtn.style.display = allDone ? 'block' : 'none';
                claimBtn.style.opacity = allDone ? '1' : '0';
                if(allDone && celebrar) {
                    setTimeout(lanzarConfeti, 300);
                    setTimeout(lanzarConfeti, 800);
                }
            }
        }

        window.toggleMission = async function(index, btnId, folio) {
            const item = document.getElementById('mission-' + index);
            if(!item || item.classList.contains('done')) return;
            try {
                const result = await window.goxionMissionAPI.completeIndex(index);
                const completed = Array.isArray(result?.completadas) ? result.completadas : [index];
                completed.forEach(i => marcarMisionVisual(Number(i), btnId, Number(i) === Number(index)));
                const key = getCurrentClientKey();
                const gamif = key && globalClientesData?.[key]?.gamificacion;
                if(gamif) gamif.progreso = Array.isArray(result?.progreso) ? result.progreso : gamif.progreso;
            } catch(e) {
                console.error("No se pudo guardar la misión:", e);
                alert("No fue posible sincronizar tu avance. Inténtalo nuevamente.");
            }
        };

        let activeFeedbackMissionIdx = null;
        let activeFeedbackFolio = null;

        window.openFeedbackModal = function(idx = null, folio = null) {
            activeFeedbackMissionIdx = idx;
            const key = getCurrentClientKey();
            activeFeedbackFolio = folio || (key && globalClientesData[key] ? globalClientesData[key].folio : null);
            document.getElementById('feedback-text').value = '';
            const feedbackSuccess = document.getElementById('feedback-success');
            const feedbackBtn = document.getElementById('btn-send-feedback');
            feedbackSuccess.style.display = 'none';
            feedbackSuccess.classList.remove('gx-feedback-message');
            feedbackBtn.style.display = 'block';
            feedbackBtn.disabled = false;
            feedbackBtn.classList.remove('gx-feedback-sending', 'gx-feedback-success');
            feedbackBtn.innerHTML = 'Enviar Comentario';
            openModal('modal-feedback');
        };

        window.enviarFeedback = function() {
            let text = document.getElementById('feedback-text').value.trim();
            if(!text) return alert("Por favor, escribe un comentario antes de enviar.");
            
            const key = getCurrentClientKey();
            let clienteNombre = key && globalClientesData[key] ? globalClientesData[key].nombre : "Usuario Anónimo";
            let clienteFolio = activeFeedbackFolio || (key && globalClientesData[key] ? globalClientesData[key].folio : "N/A");
            
            notificarAdmin("soporte", "💬 Nuevo Feedback Recibido", `**Cliente:** ${clienteNombre} (Folio: ${clienteFolio})\n**Comentario:**\n"${text}"`, "ffaa00");
            
            const feedbackBtn = document.getElementById('btn-send-feedback');
            const feedbackSuccess = document.getElementById('feedback-success');

            feedbackBtn.disabled = true;
            feedbackBtn.classList.add('gx-feedback-sending');
            feedbackBtn.textContent = 'Enviando…';

            setTimeout(() => {
                feedbackBtn.classList.remove('gx-feedback-sending');
                feedbackBtn.classList.add('gx-feedback-success');
                feedbackBtn.innerHTML = '✓ Comentario enviado';
                feedbackSuccess.classList.add('gx-feedback-message');
            }, 160);
            
            if(activeFeedbackMissionIdx !== null) {
                toggleMission(activeFeedbackMissionIdx, 'btn-claim-coupon', activeFeedbackFolio);
            } else {
                completarMisionInteligente('feedback');
            }
            
            setTimeout(() => {
                closeModal('modal-feedback');
            }, 1650);
        };

        window.completarMisionInteligente = async function(tipo) {
            const key = getCurrentClientKey();
            if(!key || !globalClientesData?.[key]) return;
            try {
                const result = await window.goxionMissionAPI.completeType(tipo);
                const completed = Array.isArray(result?.completadas) ? result.completadas : [];
                completed.forEach((idx, pos) => marcarMisionVisual(Number(idx), 'btn-claim-coupon', pos === 0));
                const gamif = globalClientesData[key].gamificacion;
                if(gamif) gamif.progreso = Array.isArray(result?.progreso) ? result.progreso : gamif.progreso;
            } catch(e) {
                console.error(`No se pudo registrar la misión ${tipo}:`, e);
            }
        };

        window.abrirRedSocial = function(idx, folio, url) {
            if(!url.startsWith('http')) url = 'https://' + url;
            window.open(url, '_blank');
            setTimeout(() => {
                let m = document.getElementById('mission-' + idx);
                if(m && !m.classList.contains('done')) {
                    m.classList.remove('locked');
                    m.querySelector('.mission-checkbox').innerHTML = '';
                    m.onclick = function() { toggleMission(idx, 'btn-claim-coupon', folio); };
                    toggleMission(idx, 'btn-claim-coupon', folio);
                }
            }, 2000);
        };

        window.compartirAppGoxion = function(msgWhatsApp) {
            let text = '¡Te invito a unirte a GOXION para tener los mejores servicios de streaming! Usa este enlace para contactarlos y decirles que vas de mi parte: https://wa.me/' + NUMERO_GOXION + '?text=' + encodeURIComponent(msgWhatsApp);
            window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
            setTimeout(() => {
                completarMisionInteligente('compartir');
                completarMisionInteligente('referidos');
            }, 2000);
        };
        
        window.copiarEnlace = function() {
            const input = document.getElementById('ref-link-input');
            input.select();
            input.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(input.value);
            alert("¡Enlace copiado al portapapeles!");
            completarMisionInteligente('compartir');
            completarMisionInteligente('referidos');
        };

        function toggleCreds(id) { 
            const box = document.getElementById(id); 
            box.style.display = (box.style.display === 'none') ? 'flex' : 'none'; 
        }
