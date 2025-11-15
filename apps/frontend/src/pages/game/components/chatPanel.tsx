import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageCircle, Send } from "lucide-react";
import type { ChatMessage } from "@scribble/shared";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatPanelProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  messages: ChatMessage[];
  inputPlaceholder?: string;
  disabled?: boolean;
  onSendMessage?: (message: string) => void;
};

export function ChatPanel({
  className,
  title = "Lobby chat",
  subtitle = "Keep the chatter friendly",
  messages,
  inputPlaceholder = "Say something fun...",
  disabled = true,
  onSendMessage,
}: ChatPanelProps) {
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmedMessage = messageInput.trim();
    if (disabled || !onSendMessage || trimmedMessage.length === 0) {
      return;
    }
    onSendMessage(trimmedMessage);
    setMessageInput("");
  };

  const isInputDisabled = disabled || !onSendMessage;
  const canSend = !isInputDisabled && messageInput.trim().length > 0;

  return (
    <Card
      className={cn(
        "flex flex-col border-primary/20 bg-background/60 backdrop-blur h-full",
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
        <div className="flex-1 space-y-3 overflow-y-auto pr-1 max-h-162">
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
                  {formatter.format(new Date(message.timestamp))}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{message.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form className="flex items-center gap-2" onSubmit={handleSend}>
          <Input
            placeholder={inputPlaceholder}
            className="flex-1"
            disabled={isInputDisabled}
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            size="icon"
            disabled={!canSend}
            aria-label="Send chat message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
