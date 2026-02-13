import { useState, useEffect } from 'react';

const KEYBOARD_THRESHOLD = 150; // px — URL bar changes are ~50-80px, keyboards are ~250-350px

export function useKeyboardVisible(): { keyboardVisible: boolean } {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const delta = window.innerHeight - vv.height;
      setKeyboardVisible(delta > KEYBOARD_THRESHOLD);
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update); // Safari fires scroll during keyboard open/close

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return { keyboardVisible };
}
