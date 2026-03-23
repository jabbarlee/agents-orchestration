/**
 * Placeholder for a real markdown renderer (e.g. react-markdown).
 * Renders draft text in a readable monospace block.
 */
export function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">
      {content}
    </div>
  );
}
