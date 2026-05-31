import Handlebars from "handlebars";

export function renderTemplate(
  subject: string,
  htmlBody: string,
  data: Record<string, unknown>
): { subject: string; html: string } {
  // Prepare safe data proxy to handle missing fields gracefully
  const safeData = new Proxy(data, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as string];
      }
      return `[MISSING: ${String(prop)}]`;
    },
  });

  // Compile the subject directly; Handlebars will handle any placeholders within.
  const subjectTemplate = Handlebars.compile(subject, { noEscape: true });
  const renderedSubject = subjectTemplate(safeData);

  const bodyTemplate = Handlebars.compile(htmlBody, { noEscape: true });
  const renderedBody = bodyTemplate(safeData);

  return { subject: renderedSubject, html: renderedBody };
}
