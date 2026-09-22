export {};

declare global {
  interface Window {
    GOXION_MOTION?: {
      animateElement(
        element: Element,
        keyframes: Keyframe[] | PropertyIndexedKeyframes,
        options?: KeyframeAnimationOptions & { easing?: string },
      ): {
        finished: Promise<unknown>;
        cancel(): void;
        finish(): void;
      };
      nextFrame(count?: number): Promise<void>;
      reducedMotion(): boolean;
      version: string;
    };
  }
}
