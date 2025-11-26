import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Mic, Image, FileText, Video } from "lucide-react";
import { AutoResizeTextarea } from "./chat/AutoResizeTextarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ChatInput({ value, onChange, onSend, disabled, loading }: ChatInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  const handleFileSelect = (type: string) => {
    // TODO: Implement file upload logic
    console.log("File type selected:", type);
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording logic
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 pb-6">
      <div className="relative flex items-end gap-2 bg-card border-2 border-border/40 rounded-3xl shadow-xl hover:shadow-2xl transition-all p-2">
        {/* File Upload Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 flex-shrink-0 hover:bg-muted"
              disabled={disabled}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => handleFileSelect("image")}>
              <Image className="h-4 w-4 mr-2" />
              Upload Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFileSelect("document")}>
              <FileText className="h-4 w-4 mr-2" />
              Upload Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFileSelect("video")}>
              <Video className="h-4 w-4 mr-2" />
              Upload Video
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Text Input */}
        <AutoResizeTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled}
          maxHeight={200}
          className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base resize-none scrollbar-hide"
        />

        {/* Voice Input Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`rounded-full h-10 w-10 flex-shrink-0 hover:bg-muted ${
            isRecording ? "bg-red-500/10 text-red-500" : ""
          }`}
          onClick={handleVoiceInput}
          disabled={disabled}
        >
          <Mic className="h-5 w-5" />
        </Button>

        {/* Send Button */}
        <Button
          onClick={onSend}
          disabled={!value.trim() || disabled || loading}
          size="icon"
          className="rounded-full h-10 w-10 flex-shrink-0 shadow-md"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
