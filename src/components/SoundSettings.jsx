import { useState } from "react";
import {
  isSoundEnabled,
  playSuccess,
  setSoundEnabled,
} from "../utils/sound";

export default function SoundSettings() {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  function handleChange(event) {
    const nextEnabled = event.target.checked;
    setEnabled(nextEnabled);
    setSoundEnabled(nextEnabled);
  }

  return (
    <section className="sound-settings" aria-labelledby="sound-settings-title">
      <div>
        <h4 id="sound-settings-title">Âm thanh phản hồi</h4>
        <p>Phát âm thanh nhẹ khi điểm danh thành công.</p>
      </div>
      <label className="sound-settings-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleChange}
        />
        Bật âm thanh
      </label>
      <button type="button" onClick={playSuccess} disabled={!enabled}>
        🔊 Nghe thử
      </button>
    </section>
  );
}
