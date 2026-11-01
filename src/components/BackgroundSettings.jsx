import { useState } from "react";

const BACKGROUND_KEY = "bg_animated";

function isBackgroundEnabled() {
  return window.localStorage.getItem(BACKGROUND_KEY) !== "false";
}

export default function BackgroundSettings() {
  const [enabled, setEnabled] = useState(isBackgroundEnabled);

  function handleChange(event) {
    const nextEnabled = event.target.checked;
    setEnabled(nextEnabled);
    window.localStorage.setItem(BACKGROUND_KEY, String(nextEnabled));
    window.dispatchEvent(
      new CustomEvent("app:background-change", { detail: nextEnabled })
    );
  }

  return (
    <section className="sound-settings" aria-labelledby="background-settings-title">
      <div>
        <h4 id="background-settings-title">Nền động</h4>
        <p>Bật hoặc tắt các biểu tượng học tập bay nhẹ phía sau.</p>
      </div>
      <label className="sound-settings-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleChange}
        />
        Bật nền động
      </label>
    </section>
  );
}
