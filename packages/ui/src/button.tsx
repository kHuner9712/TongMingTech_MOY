'use client';

import * as React from 'react';
import { tokens } from './tokens.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: tokens.color.brandPrimary,
    color: '#0A0E14',
    border: '1px solid transparent',
    fontWeight: 600,
  },
  secondary: {
    background: 'transparent',
    color: tokens.color.textPrimary,
    border: `1px solid ${tokens.color.borderStrong}`,
  },
  ghost: {
    background: 'transparent',
    color: tokens.color.textSecondary,
    border: '1px solid transparent',
  },
  danger: {
    background: tokens.color.danger,
    color: '#FFFFFF',
    border: '1px solid transparent',
    fontWeight: 600,
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '4px 10px', fontSize: '12px' },
  md: { padding: '8px 16px', fontSize: '14px' },
  lg: { padding: '12px 20px', fontSize: '16px' },
};

/**
 * MOY 基础按钮。深色未来科技感基调。
 * 后续阶段会扩展为完整组件库，本阶段仅占位以建立设计系统入口。
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  children,
  ...rest
}: ButtonProps): React.ReactElement {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.spacing.sm,
        borderRadius: tokens.radius.md,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        fontFamily: tokens.font.sans,
        transition: 'background 120ms ease, border-color 120ms ease, opacity 120ms ease',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...rest}
    >
      {loading ? <span aria-hidden>· · ·</span> : null}
      {children}
    </button>
  );
}
