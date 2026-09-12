import { IsoInsiteLogo } from './IsoInsiteLogo';

interface IsoLogoProps {
  size?: number;
  className?: string;
}

/** @deprecated Use IsoInsiteLogo or IsoAppIcon explicitly. */
export function IsoLogo({ size = 32, className = '' }: IsoLogoProps) {
  return <IsoInsiteLogo size={size} className={className} />;
}
