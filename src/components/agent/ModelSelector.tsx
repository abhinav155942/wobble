import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableModels: {
    id: string;
    name: string;
    provider: string;
    isFree?: boolean;
  }[];
}

export function ModelSelector({ selectedModel, onModelChange, availableModels }: ModelSelectorProps) {
  const currentModel = availableModels.find(m => m.id === selectedModel) || availableModels[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-xs border-border/50 hover:bg-muted"
        >
          <span className="font-medium">{currentModel?.name || "Select Model"}</span>
          {currentModel?.isFree && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              Free
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Select AI Model
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableModels.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onModelChange(model.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{model.name}</span>
                <span className="text-xs text-muted-foreground">{model.provider}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {model.isFree && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  Free
                </Badge>
              )}
              {selectedModel === model.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
