import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { MarkdownPreview } from "./MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, Code } from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function MarkdownEditor({ value, onChange, label }: MarkdownEditorProps) {
  const insertMarkdown = (before: string, after: string = before) => {
    const textarea = document.getElementById("markdown-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText =
      value.substring(0, start) +
      before +
      selectedText +
      after +
      value.substring(end);

    onChange(newText);

    // Restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 border-b border-border p-2 flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown("**")}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown("*")}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const lines = value.split("\n");
              const textarea = document.getElementById("markdown-textarea") as HTMLTextAreaElement;
              if (!textarea) return;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const selectedText = value.substring(start, end);
              const bulletList = selectedText
                .split("\n")
                .map((line) => `- ${line}`)
                .join("\n");
              const newText =
                value.substring(0, start) +
                bulletList +
                value.substring(end);
              onChange(newText);
            }}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown("`")}
            title="Code"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>
        <ResizablePanelGroup direction="horizontal" className="min-h-[300px]">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full p-4">
              <Textarea
                id="markdown-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Write your markdown here..."
                className="min-h-full border-none shadow-none focus-visible:ring-0 resize-none font-mono text-sm"
                maxLength={5000}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full p-4 overflow-auto bg-card">
              <MarkdownPreview content={value} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length}/5000 characters
      </p>
    </div>
  );
}
