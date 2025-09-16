import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, Users, BarChart3, Clock, Calendar, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface AnalyticsData {
  submissionTrends: { date: string; count: number }[];
  topForms: { formId: string; title: string; responses: number }[];
  completionRates: { formId: string; title: string; rate: number }[];
  recentActivity: { 
    formTitle: string; 
    responseId: string; 
    submittedAt: Date; 
    isComplete: boolean;
  }[];
  timeOfDayDistribution: { hour: number; count: number }[];
}

export default function Analytics() {
  const [, setLocation] = useLocation();

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const totalSubmissions = analytics?.submissionTrends.reduce((sum, item) => sum + item.count, 0) || 0;
  const averageDaily = totalSubmissions > 0 ? Math.round(totalSubmissions / 30) : 0;
  
  const peakHour = analytics?.timeOfDayDistribution.reduce((peak, current) => 
    current.count > peak.count ? current : peak, { hour: 0, count: 0 }
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Analytics Dashboard</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-bold text-foreground">{totalSubmissions}</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
                <TrendingUp className="text-primary text-xl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                  <p className="text-2xl font-bold text-foreground">{averageDaily}</p>
                  <p className="text-xs text-muted-foreground">Submissions per day</p>
                </div>
                <Calendar className="text-green-600 text-xl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Peak Hour</p>
                  <p className="text-2xl font-bold text-foreground">{peakHour?.hour || 0}:00</p>
                  <p className="text-xs text-muted-foreground">{peakHour?.count || 0} submissions</p>
                </div>
                <Clock className="text-blue-600 text-xl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Forms</p>
                  <p className="text-2xl font-bold text-foreground">{analytics?.topForms.length || 0}</p>
                  <p className="text-xs text-muted-foreground">With responses</p>
                </div>
                <Users className="text-purple-600 text-xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Submission Trends</TabsTrigger>
            <TabsTrigger value="forms">Top Forms</TabsTrigger>
            <TabsTrigger value="completion">Completion Rates</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Submission Trends (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end space-x-1">
                  {analytics?.submissionTrends.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col justify-end">
                      <div 
                        className="bg-primary rounded-t-sm min-h-[2px] transition-all duration-300 hover:bg-primary/80"
                        style={{ 
                          height: `${Math.max((item.count / Math.max(...analytics.submissionTrends.map(t => t.count), 1)) * 240, 2)}px` 
                        }}
                        title={`${item.date}: ${item.count} submissions`}
                      />
                      <div className="text-xs text-muted-foreground mt-1 text-center">
                        {new Date(item.date).getDate()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forms" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Forms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.topForms.map((form, index) => (
                    <div key={form.formId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{form.title}</p>
                          <p className="text-sm text-muted-foreground">{form.responses} responses</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">{form.responses}</div>
                      </div>
                    </div>
                  ))}
                  {!analytics?.topForms.length && (
                    <div className="text-center py-8 text-muted-foreground">
                      No form data available yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completion" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Completion Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.completionRates.map((form) => (
                    <div key={form.formId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{form.title}</p>
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${form.rate}%` }}
                          />
                        </div>
                        <span className="text-lg font-bold text-foreground">{form.rate}%</span>
                      </div>
                    </div>
                  ))}
                  {!analytics?.completionRates.length && (
                    <div className="text-center py-8 text-muted-foreground">
                      No completion data available yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.recentActivity.map((activity) => (
                    <div key={activity.responseId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${activity.isComplete ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <div>
                          <p className="font-medium text-foreground">{activity.formTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            Response ID: {activity.responseId.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-foreground">
                          {new Date(activity.submittedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.submittedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!analytics?.recentActivity.length && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No recent activity</p>
                      <p className="text-sm">Responses will appear here once forms are submitted</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}