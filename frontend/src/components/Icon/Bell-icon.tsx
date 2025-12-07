import React from 'react';

type BellIconProps = {
    size?: number;
    variant?: 'outline' | 'solid';
    className?: string;
};

export const BellIcon: React.FC<BellIconProps> = ({
  size = 24,
  variant = 'outline',
  className = '',
  }) => {
    if (variant === 'solid') {
        return (
            <svg
                className={`block overflow-visible ${className}`}
                width={size}
                height={size}
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
            >
                <path
                    d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
            </svg>
        );
    }

    return (
        <svg
            className={`block overflow-visible ${className}`}
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z"
            />
        </svg>
    );
};
