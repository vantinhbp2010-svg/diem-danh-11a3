import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

function AnimatedNumber({ value }) {
  const motionValue = useMotionValue(0);
  const roundedValue = useTransform(motionValue, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.8 });
    return () => controls.stop();
  }, [motionValue, value]);

  return <motion.span>{roundedValue}</motion.span>;
}

export default AnimatedNumber;
