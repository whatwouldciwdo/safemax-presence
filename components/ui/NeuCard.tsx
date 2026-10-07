import React from 'react';

interface NeuCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'inset' | 'deep' | 'sm' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const NeuCard: React.FC<NeuCardProps> = ({
  variant = 'flat',
  children,
  className = '',
  ...props
}) => {
  let variantClass = 'neu-card';
  if (variant === 'inset') variantClass = 'neu-inset rounded-2xl';
  if (variant === 'deep') variantClass = 'neu-inset-deep rounded-2xl';
  if (variant === 'sm') variantClass = 'neu-card-sm';
  if (variant === 'lg') variantClass = 'neu-card-lg';

  return (
    <div
      className={`${variantClass} p-5 md:p-6 transition-all duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
