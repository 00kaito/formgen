import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin-dashboard";
import FormBuilder from "@/pages/form-builder";
import PublicForm from "@/pages/public-form";
import ResponsesView from "@/pages/responses-view";
import Analytics from "@/pages/analytics";
import AuthPage from "@/pages/auth-page";
import ResponseView from "@/pages/response-view";
import AIFollowUpForm from "@/pages/ai-followup-form";

function Router() {
  return (
    <Switch>
      {/* Public route for authentication */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Public route for form submission */}
      <Route path="/form/:shareableLink" component={PublicForm} />
      
      {/* Public route for response viewing */}
      <Route path="/response/:shareableResponseLink" component={ResponseView} />
      
      {/* Public route for AI follow-up questions */}
      <Route path="/followup/:shareableResponseLink" component={AIFollowUpForm} />
      
      {/* Protected admin routes */}
      <Route path="/">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/analytics">
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      </Route>
      
      <Route path="/form-builder">
        <ProtectedRoute>
          <FormBuilder />
        </ProtectedRoute>
      </Route>
      
      <Route path="/form-builder/:id">
        <ProtectedRoute>
          <FormBuilder />
        </ProtectedRoute>
      </Route>
      
      <Route path="/responses/:id">
        <ProtectedRoute>
          <ResponsesView />
        </ProtectedRoute>
      </Route>
      
      {/* 404 page */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
