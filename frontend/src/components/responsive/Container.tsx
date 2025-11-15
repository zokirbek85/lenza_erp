import clsx from 'clsx';
import { ReactNode, useMemo } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

const Container = ({ children, className }: ContainerProps) => {
  const { isMobile, isTablet } = useIsMobile();

  const padding = useMemo(() => {
    if (isMobile) return '12px';
    if (isTablet) return '16px';
    return '24px 32px';
  }, [isMobile, isTablet]);

  return (
    <div className={clsx('w-full transition-[padding] duration-300 ease-in-out', className)} style={{ padding }}>
      {children}
    </div>
  );
};

export default Container;
