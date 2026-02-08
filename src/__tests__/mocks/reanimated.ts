const Easing = {
  linear: (t: number) => t,
  out: () => (t: number) => t,
  cubic: (t: number) => t,
};

module.exports = {
  Easing,
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (fn: () => object) => fn(),
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  withTiming: (toValue: number) => toValue,
  withSpring: (toValue: number) => toValue,
  default: {
    View: 'Animated.View',
  },
};
