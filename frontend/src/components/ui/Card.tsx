import type { ReactNode, CSSProperties } from "react";
import { ProCard } from "@ant-design/pro-components";
import { cardStyles } from "../../theme/styles";

type CardProps = {
  children: ReactNode;
  title?: string;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
};

export function Card({ children, title, style, bodyStyle }: CardProps) {
  return (
    <ProCard
      bordered
      title={title}
      size="small"
      style={{ ...cardStyles, ...style }}
      bodyStyle={{ padding: 14, ...bodyStyle }}
    >
      {children}
    </ProCard>
  );
}
