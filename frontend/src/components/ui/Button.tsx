import type { ReactNode, CSSProperties, MouseEvent } from "react";
import { buttonStyles } from "../../theme/styles";

type ButtonVariant = "primary" | "subtle";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  style?: CSSProperties;
  title?: string;
};

export function Button({
  children,
  variant = "primary",
  onClick,
  disabled,
  style,
  title,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...buttonStyles[variant],
        ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}
