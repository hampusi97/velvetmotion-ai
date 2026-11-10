import type { Variants } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export const pageFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.28, ease } },
  exit: { opacity: 0, transition: { duration: 0.16, ease } },
};

export const riseContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.06 },
  },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease },
  },
};
