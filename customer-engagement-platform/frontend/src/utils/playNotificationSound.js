// A small Web-Audio-generated beep — no audio asset/dependency needed.
// Shared by the Chat Widget (incoming message) and the Executive
// Workspace ("proper notification system" for a newly-assigned chat) so
// there's one implementation, not two independently-drifting copies.
export default function playNotificationSound({ frequency = 880 } = {}) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
  } catch {
    // Web Audio unavailable (e.g. a headless test environment) — not critical.
  }
}
