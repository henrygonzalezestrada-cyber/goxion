import { animate } from "https://esm.sh/motion@13.4.0";

function reducedMotion() {
  return Boolean(
    window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function waapi(element, keyframes, options = {}) {
  return element.animate(keyframes, options);
}

function compatControls(controls, fallbackElement, fallbackKeyframes, fallbackOptions) {
  if (!controls) {
    return waapi(fallbackElement, fallbackKeyframes, fallbackOptions);
  }

  const finished = Promise.resolve(controls).catch(() => {});

  return {
    finished,
    cancel() {
      try {
        if (typeof controls.stop === "function") controls.stop();
        else if (typeof controls.cancel === "function") controls.cancel();
      } catch {}
    },
    finish() {
      try {
        if (typeof controls.complete === "function") controls.complete();
        else if (typeof controls.finish === "function") controls.finish();
      } catch {}
    },
  };
}

function animateElement(element, keyframes, options = {}) {
  if (!element) {
    return {
      finished: Promise.resolve(),
      cancel() {},
      finish() {},
    };
  }

  if (reducedMotion()) {
    return waapi(element, keyframes, { ...options, duration: 1 });
  }

  const {
    duration,
    delay,
    easing,
    fill: _fill,
    ...rest
  } = options || {};

  try {
    const controls = animate(element, keyframes, {
      ...rest,
      ...(duration != null ? { duration: Number(duration) / 1000 } : {}),
      ...(delay != null ? { delay: Number(delay) / 1000 } : {}),
      ...(easing ? { ease: easing } : {}),
    });

    return compatControls(controls, element, keyframes, options);
  } catch (error) {
    console.warn("GOXION Motion fallback:", error);
    return waapi(element, keyframes, options);
  }
}

function nextFrame(count = 1) {
  return new Promise((resolve) => {
    const run = (remaining) => {
      requestAnimationFrame(() => {
        if (remaining <= 1) resolve();
        else run(remaining - 1);
      });
    };
    run(Math.max(1, Number(count) || 1));
  });
}

window.GOXION_MOTION = Object.freeze({
  animateElement,
  nextFrame,
  reducedMotion,
  version: "motion@13.4.0",
});
