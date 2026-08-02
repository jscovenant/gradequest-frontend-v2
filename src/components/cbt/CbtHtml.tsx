type CbtHtmlProps = {
  html?: string | null;
  className?: string;
};

export default function CbtHtml({ html, className = "" }: CbtHtmlProps) {
  const value = String(html || "");
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(value);
  const safeHtml = hasHtml ? value : value.replace(/\n/g, "<br />");

  return <div className={`cbt-html ${className}`} dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}
