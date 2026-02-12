import React from 'react';
import Markdown from 'react-markdown';
import { Heading, Body } from '@/components/rc';

interface RemyMarkdownProps {
  content: string;
}

const RemyMarkdown: React.FC<RemyMarkdownProps> = ({ content }) => (
  <Markdown
    components={{
      h1: ({ children }) => (
        <Heading scale="subhead" colour="primary" as="h2" className="mb-3">
          {children}
        </Heading>
      ),
      h2: ({ children }) => (
        <Heading scale="subhead" colour="primary" as="h3" className="mb-3">
          {children}
        </Heading>
      ),
      h3: ({ children }) => (
        <Heading scale="subhead" colour="primary" as="h4" className="mb-3">
          {children}
        </Heading>
      ),
      p: ({ children }) => (
        <Body size="body" colour="primary" as="p" className="mb-3 last:mb-0 leading-relaxed w-auto">
          {children}
        </Body>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold">{children}</strong>
      ),
      em: ({ children }) => (
        <em>{children}</em>
      ),
      ul: ({ children }) => (
        <ul className="pl-4 space-y-2 mb-3 last:mb-0 list-disc marker:text-[var(--rc-ink-ghost)]">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="pl-4 space-y-2 mb-3 last:mb-0 list-decimal marker:text-[var(--rc-ink-ghost)]">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <Body size="body" colour="primary" as="li" className="leading-relaxed w-auto">
          {children}
        </Body>
      ),
      code: ({ children }) => (
        <code className="font-[var(--rc-font-mono)] text-[0.9em] bg-[var(--rc-surface-primary)] px-1.5 py-0.5 rounded">
          {children}
        </code>
      ),
    }}
  >
    {content}
  </Markdown>
);

export default RemyMarkdown;
