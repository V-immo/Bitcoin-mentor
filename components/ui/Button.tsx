"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

type AsButton = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type AsLink = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

type Props = AsButton | AsLink;

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  function Button({ variant = "primary", size = "md", loading, className, children, ...rest }, ref) {
    const cls = [
      "btn",
      `btn-${variant}`,
      size !== "md" ? `btn-${size}` : "",
      loading ? "btn-loading" : "",
      className ?? "",
    ].filter(Boolean).join(" ");

    if ("href" in rest && rest.href) {
      const { href, ...linkProps } = rest as AsLink;
      return (
        <Link href={href} className={cls} ref={ref as React.Ref<HTMLAnchorElement>} {...linkProps}>
          {children}
        </Link>
      );
    }

    const btnProps = rest as AsButton;
    return (
      <button className={cls} ref={ref as React.Ref<HTMLButtonElement>} disabled={loading || btnProps.disabled} {...btnProps}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
