const SOUND_KEY = "sound_enabled";

let audioContext;

function getAudioContext() {
  const AudioContextConstructor =
    window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

export function isSoundEnabled() {
  return window.localStorage.getItem(SOUND_KEY) !== "false";
}

export function setSoundEnabled(enabled) {
  window.localStorage.setItem(SOUND_KEY, String(Boolean(enabled)));
}

export async function unlockAudio() {
  const context = getAudioContext();
  if (context?.state === "suspended") {
    await context.resume();
  }
}

async function playTones(tones) {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") await context.resume();

  for (const tone of tones) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startsAt = context.currentTime + tone.delay;
    const endsAt = startsAt + tone.duration;

    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.from, startsAt);
    oscillator.frequency.exponentialRampToValueAtTime(tone.to, endsAt);
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(tone.volume, startsAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startsAt);
    oscillator.stop(endsAt);
  }
}

function play(tones) {
  if (!isSoundEnabled()) return;
  void playTones(tones).catch((error) => {
    console.warn("Không phát được âm thanh phản hồi:", error);
  });
}

export function playSuccess() {
  play([
    {
      type: "sine",
      from: 880,
      to: 1320,
      volume: 0.2,
      duration: 0.25,
      delay: 0,
    },
  ]);
}

export function playError() {
  play([
    {
      type: "square",
      from: 220,
      to: 180,
      volume: 0.15,
      duration: 0.3,
      delay: 0,
    },
  ]);
}

export function playAttendance() {
  play([
    {
      type: "sine",
      from: 660,
      to: 660,
      volume: 0.18,
      duration: 0.12,
      delay: 0,
    },
    {
      type: "sine",
      from: 990,
      to: 990,
      volume: 0.18,
      duration: 0.12,
      delay: 0.14,
    },
  ]);
}
