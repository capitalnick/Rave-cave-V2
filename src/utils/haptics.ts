export function hapticLight() {
  navigator.vibrate?.(10);
}

export function hapticMedium() {
  navigator.vibrate?.(30);
}

export function hapticHeavy() {
  navigator.vibrate?.(50);
}
