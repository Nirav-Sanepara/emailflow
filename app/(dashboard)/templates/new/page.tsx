import { TemplateForm } from "@/components/templates/TemplateForm"

export default function NewTemplatePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.875rem] font-semibold tracking-tight">Create Template</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a new email template</p>
      </div>
      <TemplateForm />
    </div>
  )
}
