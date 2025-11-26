import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import { CreateAgentDialog } from "@/components/dashboard/CreateAgentDialog";
import { AgentCard } from "@/components/dashboard/AgentCard";
import wobbleLogo from "@/assets/wobble-logo.png";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string | null;
  is_active: boolean;
  created_at: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        fetchAgents();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchAgents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching agents",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAgents(data || []);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleAgentCreated = () => {
    fetchAgents();
    setCreateDialogOpen(false);
  };

  const handleAgentDeleted = () => {
    fetchAgents();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src={wobbleLogo} alt="Wobble Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold">Wobble</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </p>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Agents</h2>
            <p className="text-muted-foreground">
              Create and manage your AI support agents
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </div>

        {agents.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>No agents yet</CardTitle>
              <CardDescription>
                Get started by creating your first AI support agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onDeleted={handleAgentDeleted}
              />
            ))}
          </div>
        )}
      </main>

      <CreateAgentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onAgentCreated={handleAgentCreated}
      />
    </div>
  );
}
