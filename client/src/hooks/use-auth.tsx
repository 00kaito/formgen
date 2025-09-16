import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  username: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();

  // Check authentication status on app load
  const { data: authData, isLoading } = useQuery<{ authenticated: boolean; user: AuthUser | null }>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (authData?.authenticated) {
      setUser(authData.user);
    } else {
      setUser(null);
    }
  }, [authData]);

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user);
        // Invalidate and refetch user data
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
    onError: (error) => {
      console.error("Login failed:", error);
      throw error;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      setUser(null);
      // Clear all queries and redirect will be handled by the component
      queryClient.clear();
    },
  });

  const login = async (username: string, password: string) => {
    try {
      await loginMutation.mutateAsync({ username, password });
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout fails on server, clear local state
      setUser(null);
      queryClient.clear();
    }
  };

  const contextValue: AuthContextType = {
    user,
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}