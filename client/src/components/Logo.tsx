import { IsoInsiteLogo } from './IsoInsiteLogo';

interface LogoProps {
  className?: string;
  iconSize?: number;
  /** Text color variant for light and dark navigation materials. */
  variant?: 'light' | 'dark';
}

export function Logo({ className = '', iconSize = 36, variant = 'light' }: LogoProps) {
  const textColor = variant === 'dark' ? 'text-white' : 'text-accent-500';

  return (
    <div className={`flex items-center gap-2 bg-transparent ${className}`}>
      <IsoInsiteLogo size={iconSize} />
      <span className={`text-[17px] font-semibold tracking-tight ${textColor}`}>iso</span>
    </div>
  );
}
