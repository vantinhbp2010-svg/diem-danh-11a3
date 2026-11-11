import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const ITEMS = [
  { icon: "📚", left: "7%", size: 32, duration: 19, delay: 8 },
  { icon: "✏️", left: "20%", size: 27, duration: 23, delay: 5 },
  { icon: "📐", left: "34%", size: 30, duration: 21, delay: 4 },
  { icon: "📏", left: "48%", size: 25, duration: 18, delay: 12 },
  { icon: "🎒", left: "61%", size: 34, duration: 24, delay: 9 },
  { icon: "📖", left: "74%", size: 30, duration: 20, delay: 6 },
  { icon: "🧮", left: "89%", size: 28, duration: 22, delay: 7 },
  { icon: "📝", left: "13%", size: 26, duration: 25, delay: 11 },
  { icon: "🖍️", left: "55%", size: 27, duration: 19, delay: 2 },
  { icon: "📎", left: "83%", size: 25, duration: 23, delay: 14 },
  { icon: "🎓", left: "27%", size: 31, duration: 20, delay: 1 },
  { icon: "💡", left: "41%", size: 26, duration: 24, delay: 10 },
  { icon: "📚", left: "68%", size: 29, duration: 22, delay: 3 },
  { icon: "✏️", left: "95%", size: 24, duration: 18, delay: 13 },
  { icon: "📝", left: "3%", size: 28, duration: 21, delay: 15 },
];

export default function FloatingBackground() {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(
    () => window.localStorage.getItem("bg_animated") !== "false"
  );

  useEffect(() => {
    const handlePreferenceChange = (event) => {
      setEnabled(event.detail);
    };
    window.addEventListener("app:background-change", handlePreferenceChange);
    return () => {
      window.removeEventListener("app:background-change", handlePreferenceChange);
    };
  }, []);

  if (!enabled || reduceMotion) return null;

  return (
    <div className="floating-bg-container" aria-hidden="true">
      {ITEMS.map((item, index) => (
        <span
          key={`${item.icon}-${index}`}
          className="floating-icon"
          style={{
            left: item.left,
            fontSize: `${item.size}px`,
            animationDuration: `${item.duration}s`,
            animationDelay: `${item.delay}s`,
          }}
        >
          {item.icon}
        </span>
      ))}
    </div>
  );
}
