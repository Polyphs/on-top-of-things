
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import type { UserResponse } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<UserResponse | null>({
    queryKey: [api.auth.me.path],
    retry: false,
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; profileName: string; password: string }) => {
      const res = await apiRequest(api.auth.signup.method, api.auth.signup.path, data);
      return res.json();
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const res = await apiRequest(api.auth.verifyOtp.method, api.auth.verifyOtp.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { emailOrProfile: string; password: string }) => {
      const res = await apiRequest(api.auth.login.method, api.auth.login.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(api.auth.logout.method, api.auth.logout.path);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest(api.auth.forgotPassword.method, api.auth.forgotPassword.path, data);
      return res.json();
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { email: string; code: string; newPassword: string }) => {
      const res = await apiRequest(api.auth.resetPassword.method, api.auth.resetPassword.path, data);
      return res.json();
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async (data: { email: string; type: 'signup' | 'forgot_password' }) => {
      const res = await apiRequest(api.auth.resendOtp.method, api.auth.resendOtp.path, data);
      return res.json();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signup: signupMutation.mutateAsync,
    signupPending: signupMutation.isPending,
    verifyOtp: verifyOtpMutation.mutateAsync,
    verifyOtpPending: verifyOtpMutation.isPending,
    login: loginMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    logout: logoutMutation.mutateAsync,
    logoutPending: logoutMutation.isPending,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    forgotPasswordPending: forgotPasswordMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    resetPasswordPending: resetPasswordMutation.isPending,
    resendOtp: resendOtpMutation.mutateAsync,
    resendOtpPending: resendOtpMutation.isPending,
  };
}
