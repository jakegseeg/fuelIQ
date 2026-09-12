import { publicAsset } from '../lib/assets';

/** Insite mark aspect ratio (1024×1003 source). */
const INSITE_ASPECT = 1024 / 1003;

interface IsoInsiteLogoProps {
  size?: number;
  className?: string;
}

/** Balance mark — in-app wordmark companion and browser tab preview. */
export function IsoInsiteLogo({ size = 32, className = '' }: IsoInsiteLogoProps) {
  const height = size;
  const width = Math.round(size * INSITE_ASPECT);

  return (
    <img
      src={publicAsset('iso-insite-logo.png')}
      alt=""
      width={width}
      height={height}
      className={`shrink-0 bg-transparent ${className}`}
      aria-hidden="true"
      draggable={false}
    />
  );
}
