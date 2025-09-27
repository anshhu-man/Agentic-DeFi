import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

type MarkdownProps = {
  children: string;
  className?: string;
};

export default function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          code: ({ inline, className, children, ...props }: any) => {
            // Minimal renderer (no syntax highlighting per request)
            return inline ? (
              <code className={className} {...props}>{children}</code>
            ) : (
              <pre className={className}>
                <code {...props}>{children}</code>
              </pre>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
