import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Activity, MessageCircle, Clock, Star } from "lucide-react";

interface Agent {
  id: string;
}

interface AnalyticsData {
  totalMessages: number;
  avgResponseTime: number;
  avgRating: number;
  conversationCount: number;
}

export function AgentAnalytics({ agent }: { agent: Agent }) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalMessages: 0,
    avgResponseTime: 0,
    avgRating: 0,
    conversationCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [agent.id]);

  const fetchAnalytics = async () => {
    setLoading(true);

    try {
      // Get conversation count
      const { count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id);

      // Get total messages
      const { data: messages, count: msgCount } = await supabase
        .from('messages')
        .select(`
          *,
          conversation:conversations!inner(agent_id)
        `, { count: 'exact' })
        .eq('conversation.agent_id', agent.id);

      // Calculate average response time
      const responseTimes = messages
        ?.filter(m => m.response_time_ms)
        .map(m => m.response_time_ms) || [];
      
      const avgTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      // Get average rating
      const { data: feedbacks } = await supabase
        .from('message_feedback')
        .select(`
          rating,
          message:messages!inner(
            conversation:conversations!inner(agent_id)
          )
        `)
        .eq('message.conversation.agent_id', agent.id);

      const avgRating = feedbacks && feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
        : 0;

      setAnalytics({
        totalMessages: msgCount || 0,
        avgResponseTime: Math.round(avgTime),
        avgRating: parseFloat(avgRating.toFixed(1)),
        conversationCount: convCount || 0,
      });
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground p-4">Loading analytics...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totalMessages}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversations</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.conversationCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.avgResponseTime}ms</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.avgRating}/5</div>
        </CardContent>
      </Card>
    </div>
  );
}
