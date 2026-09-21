const GXCORE = window.GOXION_CORE;
if (!GXCORE) throw new Error("GOXION_CORE no disponible antes de Ayuda.");
        const NUMERO_GOXION = GXCORE.BUSINESS.WHATSAPP;
        
        const WEBHOOKS_DISCORD = GXCORE.BUSINESS.CHANNELS;

        let globalClientesData = null;
        let greetingInterval = null;
        let carritoPedidos = {};
        window.goxionCurrentClientKey = "";
        function getCurrentClientKey() { return String(window.goxionCurrentClientKey || ""); }
        
        window.catalogGroups = {}; 

        let gxWelcomeCycle=0;
