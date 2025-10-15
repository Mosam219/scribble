import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageCircle, Send } from "lucide-react";

export type ChatMessage = {
  id: string | number;
  author: string;
  text: string;
  time: string;
};

type ChatPanelProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  messages: ChatMessage[];
  inputPlaceholder?: string;
  disabled?: boolean;
};

export function ChatPanel({
  className,
  title = "Lobby chat",
  subtitle = "Keep the chatter friendly",
  messages,
  inputPlaceholder = "Say something fun...",
  disabled = true,
}: ChatPanelProps) {
  return (
    <Card
      className={cn(
        "flex flex-col border-primary/20 bg-background/60 backdrop-blur",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            {title}
          </CardTitle>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <MessageCircle className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className="rounded-xl border border-primary/10 bg-background/70 px-3 py-2 text-sm shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {message.author}
                </span>
                <span className="text-xs text-muted-foreground">
                  {message.time}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{message.text}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder={inputPlaceholder}
            className="flex-1"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={disabled}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
