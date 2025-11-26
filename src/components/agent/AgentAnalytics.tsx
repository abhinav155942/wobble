import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Activity, MessageCircle, Clock, ThumbsUp, ThumbsDown, TrendingUp } from "lucide-react";

interface Agent {
  id: string;
}

interface AnalyticsData {
  totalMessages: number;
  avgResponseTime: number;
  conversationCount: number;
  likesCount: number;
  dislikesCount: number;
  satisfactionRate: number;
}

export function AgentAnalytics({ agent }: { agent: Agent }) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalMessages: 0,
    avgResponseTime: 0,
    conversationCount: 0,
    likesCount: 0,
    dislikesCount: 0,
    satisfactionRate: 0,
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

      // Get feedback data
      const { data: feedbacks } = await supabase
        .from('message_feedback')
        .select(`
          rating,
          message:messages!inner(
            conversation:conversations!inner(agent_id)
          )
        `)
        .eq('message.conversation.agent_id', agent.id);

      const likesCount = feedbacks?.filter(f => f.rating === 1).length || 0;
      const dislikesCount = feedbacks?.filter(f => f.rating === 0).length || 0;
      const totalFeedback = likesCount + dislikesCount;
      const satisfactionRate = totalFeedback > 0 
        ? Math.round((likesCount / totalFeedback) * 100)
        : 0;

      setAnalytics({
        totalMessages: msgCount || 0,
        avgResponseTime: Math.round(avgTime),
        conversationCount: convCount || 0,
        likesCount,
        dislikesCount,
        satisfactionRate,
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {analytics.conversationCount} conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversationCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.totalMessages > 0 
                ? `${(analytics.totalMessages / Math.max(analytics.conversationCount, 1)).toFixed(1)} messages avg`
                : 'No messages yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.avgResponseTime < 1000 ? 'Lightning fast' : 'Average speed'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.satisfactionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {analytics.likesCount + analytics.dislikesCount} ratings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Feedback</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{analytics.likesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Users liked these responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative Feedback</CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{analytics.dislikesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Responses to improve
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
