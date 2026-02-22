import React from 'react';
import Markdown from 'react-markdown';
import { Heading, Body, MonoLabel } from '@/components/rc';

interface RemyMarkdownProps {
  content: string;
}

const WINE_BRIEF_VERDICT = 'THE VERDICT';
const WINE_BRIEF_MONO_HEADERS = new Set([
  'THE WINE',
  'WHAT TO EXPECT IN THE GLASS',
  'THIS VINTAGE',
  'VALUE VERDICT',
]);
const WINE_BRIEF_CALL = "REMY'S CALL";

function renderH2({ children }: { children?: React.ReactNode }) {
  const text = typeof children === 'string' ? children : String(children ?? '');
  const upper = text.toUpperCase().trim();

  if (upper === WINE_BRIEF_VERDICT) {
    return (
      <Heading scale="heading" colour="primary" as="h2" className="mb-3 mt-6">
        {children}
      </Heading>
    );
  }

  if (upper === WINE_BRIEF_CALL) {
    return (
      <div className="border-l-[3px] border-[var(--rc-accent-acid)] pl-3 mb-3 mt-6">
        <MonoLabel size="label" colour="ghost" as="h3" className="w-auto uppercase tracking-wider">
          {children}
        </MonoLabel>
      </div>
    );
  }

  if (WINE_BRIEF_MONO_HEADERS.has(upper)) {
    return (
      <MonoLabel size="label" colour="ghost" as="h3" className="w-auto mb-3 mt-6 uppercase tracking-wider">
        {children}
      </MonoLabel>
    );
  }

  return (
    <Heading scale="subhead" colour="primary" as="h3" className="mb-3">
      {children}
    </Heading>
  );
}

const RemyMarkdown: React.FC<RemyMarkdownProps> = ({ content }) => (
  <Markdown
    components={{
      h1: ({ children }) => (
        <Heading scale="subhead" colour="primary" as="h2" className="mb-3">
          {children}
        </Heading>
      ),
      h2: renderH2,
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
