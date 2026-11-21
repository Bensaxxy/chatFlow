import type { NotificationSound } from "@/types/notification";

let audioContext: AudioContext | null = null;

const soundNotes: Record<Exclude<NotificationSound, "none">, number[]> = {
  chime: [880, 1320],
  pulse: [660, 660],
  pop: [1047],
};

const playSound = async (sound: NotificationSound): Promise<void> => {
  if (sound === "none" || typeof window === "undefined" || !window.AudioContext) {
    return;
  }

  try {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContext();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const context = audioContext;
    const startAt = context.currentTime;

    soundNotes[sound].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startAt + index * 0.12;

      oscillator.type = sound === "pop" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.08, noteStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.14);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.15);
    });
  } catch {
    // Some browsers block audio until the user has interacted with the page.
  }
};

const vibrate = (): void => {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  navigator.vibrate?.([70, 45, 70]);
};

export const playMessageFeedback = ({
  sound,
  vibration,
}: {
  sound: NotificationSound;
  vibration: boolean;
}): void => {
  void playSound(sound);

  if (vibration) {
    vibrate();
  }
};
