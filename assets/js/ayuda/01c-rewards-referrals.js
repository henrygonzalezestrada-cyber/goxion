        async function reclamarCuponSilencioso(nombre, folio, descuento) {
            const btn = document.getElementById('btn-claim-coupon');
            const token = localStorage.getItem(GXCORE.STORAGE.CLIENT_TOKEN) || "";
            const key = getCurrentClientKey() || "";

            if(!token || !key) {
                alert("Tu sesión expiró. Inicia sesión nuevamente.");
                return;
            }

            if(btn) {
                btn.disabled = true;
                btn.innerHTML = "⏳ Registrando tu cupón…";
            }

            try {
                const response = await fetch(GXCORE.endpoint("mi-espacio"), {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json",
                        "X-Client-Token":token
                    },
                    body:JSON.stringify({modo:"reclamar_cupon"})
                });
                const data = await response.json().catch(() => ({}));

                if(!response.ok || data?.ok !== true) {
                    throw new Error(data?.error || "No fue posible registrar el cupón.");
                }

                if(globalClientesData?.[key]?.gamificacion) {
                    globalClientesData[key].gamificacion.cupon_reclamado = true;
                    globalClientesData[key].gamificacion.cupon_reclamado_at = data.reclamado_at || new Date().toISOString();
                    globalClientesData[key].gamificacion.cupon_reclamado_ciclo = Number(data.ciclo || globalClientesData[key].gamificacion.cupon_ciclo || 1);
                }

                if(btn) {
                    btn.classList.add("gx-claim-done");
                    btn.innerHTML = "✅ Ya has reclamado tu cupón";
                    btn.onclick = null;
                    btn.disabled = true;
                    btn.style.display = "block";
                    btn.style.opacity = "1";
                }

                const cupSubtitle = document.getElementById("gx-coupon-subtitle");
                if(cupSubtitle) {
                    cupSubtitle.innerHTML = '<span style="color:var(--success-green);font-weight:800;">Cupón reclamado ✓</span>';
                    const card = cupSubtitle.closest(".gamif-btn");
                    if(card) {
                        card.classList.remove("gx-referral-ready");
                        const icon = card.querySelector(".gamif-icon");
                        if(icon) icon.textContent = "🥇";
                    }
                }

                if(!data.ya_reclamado) {
                    notificarAdmin(
                        "logins",
                        "🏆 CUPÓN RECLAMADO",
                        `El cliente **${nombre}** (Folio: ${folio}) completó sus misiones y reclamó su **${descuento}% de descuento**.`,
                        "2ea043"
                    );
                }

                lanzarConfeti();
            } catch(error) {
                console.error(error);
                if(btn) {
                    btn.disabled = false;
                    btn.innerHTML = `✅ Aplicar Cupón del ${descuento}%`;
                }
                alert(error?.message || "No fue posible registrar el cupón.");
            }
        }

        async function reclamarMesGratis(nombre, folio, referidoNombre) {
            const btn = document.getElementById("btn-claim-free-month");
            const token = localStorage.getItem(GXCORE.STORAGE.CLIENT_TOKEN) || "";
            const key = getCurrentClientKey() || "";

            if(!token || !key) {
                alert("Tu sesión expiró. Inicia sesión nuevamente.");
                return;
            }

            if(btn) {
                btn.disabled = true;
                btn.innerHTML = "⏳ Registrando beneficio…";
            }

            try {
                const response = await fetch(GXCORE.endpoint("mi-espacio"), {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json",
                        "X-Client-Token":token
                    },
                    body:JSON.stringify({modo:"reclamar_mes_referido"})
                });
                const data = await response.json().catch(() => ({}));

                if(!response.ok || data?.ok !== true) {
                    throw new Error(data?.error || "No fue posible registrar tu mes gratis.");
                }

                if(globalClientesData?.[key]?.referido_activo) {
                    globalClientesData[key].referido_activo.beneficio_reclamado = true;
                    globalClientesData[key].referido_activo.beneficio_reclamado_at = data.reclamado_at || new Date().toISOString();
                }

                if(btn) {
                    btn.classList.add("gx-claim-done");
                    btn.innerHTML = "✅ Mes gratis reclamado";
                    btn.onclick = null;
                    btn.disabled = true;
                }

                const refStatus = document.getElementById("gx-referral-status");
                if(refStatus) {
                    refStatus.textContent = "Mes gratis reclamado ✓";
                    refStatus.style.color = "var(--success-green)";
                    const card = refStatus.closest(".gamif-btn");
                    if(card) {
                        card.classList.remove("gx-referral-ready", "pulse-referral", "pulse-mission");
                        const icon = card.querySelector(".gamif-icon");
                        if(icon) icon.textContent = "💝";
                    }
                }

                if(!data.ya_reclamado) {
                    notificarAdmin(
                        "logins",
                        "🎁 MES GRATIS RECLAMADO",
                        `El cliente **${nombre}** (Folio: ${folio}) reclamó su **mes gratis** por el referido **${referidoNombre}**.`,
                        "00ff9d"
                    );
                }

                lanzarConfeti();
            } catch(error) {
                console.error(error);
                if(btn) {
                    btn.disabled = false;
                    btn.innerHTML = "🎁 Reclama tu mes gratis";
                }
                alert(error?.message || "No fue posible registrar tu mes gratis.");
            }
        }

        window.solicitarMejoraSilenciosa = function(mejoraStr) {
            const key = getCurrentClientKey();
            if(!key || !globalClientesData[key]) return;
            
            let cliente = globalClientesData[key];
            notificarAdmin("pedidos", "🔥 SOLICITUD DE UPGRADE", `El cliente **${cliente.nombre}** (Folio: ${cliente.folio}) quiere agregar: **${mejoraStr}** para armar su Combo GOXION.`, "ffaa00");
            
            alert("¡Excelente decisión! Hemos notificado a nuestro equipo para aplicar la mejora a tu cuenta. Te contactaremos en breve para confirmar la activación.");
        };
