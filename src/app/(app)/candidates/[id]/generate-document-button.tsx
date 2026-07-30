import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

// Просте посилання на завантаження — сервер сам генерує .docx на льоту,
// JS/форма не потрібні: браузер обробляє Content-Disposition: attachment.
export function GenerateDocumentButton({
  candidateId,
}: {
  candidateId: string;
}) {
  return (
    <a
      href={`/api/candidates/${candidateId}/document`}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2",
      )}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Повідомлення про зарахування</span>
    </a>
  );
}
