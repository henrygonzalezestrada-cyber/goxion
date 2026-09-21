(() => {
    const canvas = document.getElementById('gx-wave-canvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        powerPreference: 'high-performance'
    });

    if (!gl) {
        canvas.style.display = 'none';
        document.querySelector('.bg')?.classList.add('gx-wave-fallback');
        return;
    }

    const vertexSource = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    const fragmentSource = `
        precision mediump float;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_motion;

        vec3 goxionFlow(float x, float y, float t) {
            vec3 purple = vec3(0.58, 0.09, 1.00);
            vec3 blue   = vec3(0.025, 0.22, 1.00);
            vec3 cyan   = vec3(0.00, 0.88, 1.00);

            // Larger, slower color masses: purple and blue dominate for longer.
            float wp = 0.55 + 0.45 * sin(x * 0.92 - t * 0.34 + 0.20 * sin(y * 0.70));
            float wb = 0.55 + 0.45 * sin(x * 1.05 + t * 0.29 + 2.15);
            float wc = 0.45 + 0.45 * sin(x * 1.32 - t * 0.42 + 4.20 + y * 0.30);

            wp = pow(max(wp, 0.0), 2.55);
            wb = pow(max(wb, 0.0), 2.40);
            wc = pow(max(wc, 0.0), 3.50) * 0.42;

            float sumW = max(wp + wb + wc, 0.001);
            return (purple * wp + blue * wb + cyan * wc) / sumW;
        }

        void main() {
            vec2 res = max(u_resolution, vec2(1.0));
            vec2 p = (gl_FragCoord.xy * 2.0 - res) / min(res.x, res.y);

            float t = u_time * u_motion;
            float x = p.x;

            // Slow base motion + occasional stronger deformation.
            float calm =
                  0.105 * sin(x * 1.38 - t * 0.40)
                + 0.050 * sin(x * 3.00 + t * 0.29 + 1.10)
                + 0.024 * sin(x * 5.15 - t * 0.20);

            // A slow "energy cycle" creates moments of much stronger movement.
            float burstCycle = pow(0.5 + 0.5 * sin(t * 0.235 + 0.45), 7.0);
            float travellingBend = sin(x * 1.18 - t * 0.72 + 0.80);

            float yCenter =
                  1.12 * x
                + calm
                + (0.035 + 0.150 * burstCycle) * travellingBend
                + 0.065 * sin(t * 0.27)
                + 0.025 * sin(t * 0.53 + x * 0.72)
                - 0.02;

            float d = abs(p.y - yCenter);

            // Gentle breathing most of the time.
            float thickA = 0.5 + 0.5 * sin(x * 1.75 - t * 0.55);
            float thickB = 0.5 + 0.5 * sin(x * 3.45 + t * 0.37 + 1.8);
            float breathe = 0.5 + 0.5 * sin(t * 0.43 + x * 1.05);

            // Less frequent but much more dramatic travelling swell.
            float swellCarrier = 0.5 + 0.5 * sin(x * 0.93 - t * 0.68 + 0.55);
            float swell = pow(swellCarrier, 12.0);

            // Secondary swell appears at a different rhythm, kept subtle.
            float swell2Carrier = 0.5 + 0.5 * sin(x * 0.62 + t * 0.47 + 2.5);
            float swell2 = pow(swell2Carrier, 14.0) * 0.55;

            float width = 0.039
                        + 0.020 * thickA * thickA
                        + 0.008 * thickB
                        + 0.007 * breathe
                        + 0.090 * swell
                        + 0.040 * swell2;

            // White center becomes broader and brighter exactly when the ribbon swells.
            float coreWidthBoost = 1.0 + 0.55 * swell + 0.25 * swell2;
            float coreWhite = 1.0 - smoothstep(width * 0.040, width * (0.165 * coreWidthBoost), d);
            float coreTint  = 1.0 - smoothstep(width * 0.16,  width * 0.42, d);
            float body      = 1.0 - smoothstep(width * 0.40,  width * 1.00, d);
            float edge      = 1.0 - smoothstep(width * 0.90,  width * 1.42, d);

            // Halo widens mainly in the thick sections.
            float glowNear = exp(-d * (8.8 - 2.1 * swell));
            float glowMid  = exp(-d * (4.5 - 1.4 * swell));
            float glowFar  = exp(-d * (2.35 - 0.75 * swell));

            vec3 wave = goxionFlow(x, p.y, t);

            // Moving white energy, synchronized with thickness more than before.
            float energyTravel = pow(0.5 + 0.5 * sin(x * 1.22 - t * 0.78 + 0.75), 9.0);
            float energy = clamp(0.35 * energyTravel + 0.95 * swell + 0.45 * swell2, 0.0, 1.0);

            vec3 whiteHot = mix(
                vec3(1.0),
                vec3(0.82, 0.95, 1.0),
                0.10 + 0.20 * energyTravel
            );

            vec3 col = vec3(0.0);

            // Cleaner when thin, expansive bloom when thick.
            col += wave * glowFar  * (0.026 + 0.095 * swell + 0.040 * swell2);
            col += wave * glowMid  * (0.075 + 0.120 * swell + 0.055 * breathe);
            col += wave * glowNear * (0.150 + 0.150 * swell + 0.060 * energyTravel);

            col += wave * edge * 0.095;
            col += wave * body * (0.27 + 0.11 * thickA + 0.16 * swell);
            col += wave * coreTint * (0.17 + 0.16 * energy);

            // Stronger dazzling white center, especially during swells.
            float flare = 0.70 + 0.28 * energyTravel + 0.72 * swell + 0.30 * swell2;
            col += whiteHot * coreWhite * flare;

            // Local neon cloud follows the dramatic thick section.
            col += wave * glowMid * swell * 0.16;
            col += whiteHot * glowNear * swell * 0.055;

            float vignette = smoothstep(1.72, 0.25, length(p * vec2(0.58, 0.42)));
            col *= 0.78 + 0.22 * vignette;

            float lum = max(col.r, max(col.g, col.b));
            float alpha = clamp(lum * 0.99, 0.0, 0.97);
            gl_FragColor = vec4(col, alpha);
        }
    `;

    function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.warn('GOXION Wave shader:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vs = compile(gl.VERTEX_SHADER, vertexSource);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) { canvas.style.display = 'none'; return; }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn('GOXION Wave program:', gl.getProgramInfoLog(program));
        canvas.style.display = 'none';
        return;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMotion = gl.getUniformLocation(program, 'u_motion');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, raf = 0, visible = true, paused = false;
    const start = performance.now();

    function resize() {
        const mobile = Math.min(window.innerWidth, window.innerHeight) < 760;
        const maxDpr = mobile ? 1.35 : 1.65;
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
        const w = Math.max(1, Math.round(window.innerWidth * dpr));
        const h = Math.max(1, Math.round(window.innerHeight * dpr));
        if (w === width && h === height) return;
        width = canvas.width = w;
        height = canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uResolution, w, h);
    }

    function frame(now) {
        if (!visible || paused) return;
        resize();
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.uniform1f(uMotion, reduced.matches ? 0.0 : 1.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        raf = requestAnimationFrame(frame);
    }

    document.addEventListener('visibilitychange', () => {
        visible = !document.hidden;
        if (visible && !paused) {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(frame);
        } else {
            cancelAnimationFrame(raf);
        }
    });

    window.gxWaveSetPaused = function(value) {
        paused = !!value;
        cancelAnimationFrame(raf);
        if (!paused && visible) {
            raf = requestAnimationFrame(frame);
        }
    };

    window.addEventListener('resize', resize, {passive:true});
    resize();
    raf = requestAnimationFrame(frame);
})();