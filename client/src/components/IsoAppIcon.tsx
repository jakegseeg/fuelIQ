import { publicAsset } from '../lib/assets';

interface IsoAppIconProps {
  size?: number;
  className?: string;
}

/** Rounded app icon — home screen / install / PWA face. */
export function IsoAppIcon({ size = 32, className = '' }: IsoAppIconProps) {
  return (
    <img
      src={publicAsset('iso-app-icon.png')}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 bg-transparent ${className}`}
      aria-hidden="true"
      draggable={false}
    />
  );
}
