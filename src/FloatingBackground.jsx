const ITEMS = [
  { icon: "📚", left: "7%", top: "14%", size: 32, duration: 19, delay: -8 },
  { icon: "✏️", left: "20%", top: "72%", size: 27, duration: 23, delay: -15 },
  { icon: "📐", left: "34%", top: "28%", size: 30, duration: 21, delay: -4 },
  { icon: "📏", left: "48%", top: "82%", size: 25, duration: 18, delay: -12 },
  { icon: "🎒", left: "61%", top: "18%", size: 34, duration: 24, delay: -19 },
  { icon: "📖", left: "74%", top: "63%", size: 30, duration: 20, delay: -6 },
  { icon: "🧮", left: "89%", top: "32%", size: 28, duration: 22, delay: -17 },
  { icon: "📝", left: "13%", top: "45%", size: 26, duration: 25, delay: -11 },
  { icon: "🖍️", left: "55%", top: "48%", size: 27, duration: 19, delay: -2 },
  { icon: "📎", left: "83%", top: "86%", size: 25, duration: 23, delay: -14 },
];

export default function FloatingBackground() {
  return (
    <div className="floating-bg-container" aria-hidden="true">
      {ITEMS.map((item, index) => (
        <span
          key={`${item.icon}-${index}`}
          className="floating-icon"
          style={{
            left: item.left,
            top: item.top,
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
