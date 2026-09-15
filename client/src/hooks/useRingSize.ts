import { useEffect, useState } from 'react';

/** Responsive macro ring diameter — hero scale on the dashboard. */
export function useRingSize(): number {
  const [size, setSize] = useState(() =>
    typeof window !== 'undefined' ? ringSizeForWidth(window.innerWidth) : 300,
  );

  useEffect(() => {
    const update = () => setSize(ringSizeForWidth(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
}

function ringSizeForWidth(width: number): number {
  if (width >= 1024) return 360;
  if (width >= 640) return 320;
  return 290;
}
