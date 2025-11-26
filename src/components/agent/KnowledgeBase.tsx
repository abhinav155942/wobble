import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FileText, Link as LinkIcon, MessageSquare } from "lucide-react";
import { AIEnhanceButton } from "@/components/ui/AIEnhanceButton";

interface Agent {
  id: string;
}

interface KnowledgeItem {
  id: string;
  type: 'document' | 'url' | 'faq';
  title: string;
  content: string;
  url?: string;
  created_at: string;
}

export function KnowledgeBase({ agent }: { agent: Agent }) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    type: 'faq' as 'document' | 'url' | 'faq',
    title: '',
    content: '',
    url: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (agent?.id) {
      fetchKnowledgeBase();
    }
  }, [agent?.id]);

  const fetchKnowledgeBase = async () => {
    if (!agent?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching knowledge base",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setItems((data as KnowledgeItem[]) || []);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!agent?.id) return;
    
    if (!newItem.title || !newItem.content) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    const { error } = await supabase
      .from('knowledge_base')
      .insert({
        agent_id: agent.id,
        type: newItem.type,
        title: newItem.title,
        content: newItem.content,
        url: newItem.type === 'url' ? newItem.url : null,
      });

    if (error) {
      toast({
        title: "Error adding item",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Item added",
        description: "Knowledge base item has been added successfully",
      });
      setNewItem({ type: 'faq', title: '', content: '', url: '' });
      fetchKnowledgeBase();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting item",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Item deleted",
        description: "Knowledge base item has been deleted",
      });
      fetchKnowledgeBase();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4" />;
      case 'url': return <LinkIcon className="h-4 w-4" />;
      case 'faq': return <MessageSquare className="h-4 w-4" />;
      default: return null;
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground p-4">Loading knowledge base...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Base</CardTitle>
        <CardDescription>
          Add documents, URLs, and FAQs to enhance your agent's knowledge
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="items">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
            <TabsTrigger value="add">Add New</TabsTrigger>
          </TabsList>
          
          <TabsContent value="items" className="space-y-4">
            {items.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No knowledge base items yet. Add some to get started!
              </p>
            ) : (
              items.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getIcon(item.type)}
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {item.content}
                    </p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-2 block"
                      >
                        {item.url}
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="add" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={newItem.type}
                onValueChange={(value: 'document' | 'url' | 'faq') =>
                  setNewItem({ ...newItem, type: value })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faq">FAQ</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Enter title"
              />
            </div>

            {newItem.type === 'url' && (
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={newItem.url}
                  onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Content</Label>
                <AIEnhanceButton
                  value={newItem.content}
                  onEnhanced={(enhanced) => setNewItem({ ...newItem, content: enhanced })}
                  type={newItem.type === "faq" ? "faq" : "general"}
                />
              </div>
              <Textarea
                id="content"
                value={newItem.content}
                onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                placeholder="Enter content"
                rows={6}
              />
            </div>

            <Button onClick={handleAdd} disabled={adding} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {adding ? "Adding..." : "Add to Knowledge Base"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
