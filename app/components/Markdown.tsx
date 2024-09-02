import { type ComponentProps } from "react";
import RMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export const Markdown = (props: ComponentProps<typeof RMarkdown>) => {
  return <RMarkdown className="prose" remarkPlugins={[remarkGfm]} {...props} />;
};
