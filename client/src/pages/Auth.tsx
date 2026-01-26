
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Hourglass, ArrowLeft, Loader2, Mail, Lock, User } from "lucide-react";
import { useLocation } from "wouter";

type AuthMode = "login" | "signup" | "verify-otp" | "forgot-password" | "reset-password";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { toast } = useToast();
  const [, navigate] = useLocation();
  const {
    signup,
    signupPending,
    verifyOtp,
    verifyOtpPending,
    login,
    loginPending,
    forgotPassword,
    forgotPasswordPending,
    resetPassword,
    resetPasswordPending,
    resendOtp,
    resendOtpPending,
  } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    try {
      await signup({ email, profileName, password });
      toast({ title: "Verification code sent to your email" });
      setMode("verify-otp");
    } catch (err: any) {
      toast({ title: err.message || "Signup failed", variant: "destructive" });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyOtp({ email, code: otpCode });
      toast({ title: "Email verified! Welcome to FocusFlow" });
      navigate("/");
    } catch (err: any) {
      toast({ title: err.message || "Verification failed", variant: "destructive" });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ emailOrProfile: email, password });
      toast({ title: "Welcome back!" });
      navigate("/");
    } catch (err: any) {
      toast({ title: err.message || "Login failed", variant: "destructive" });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword({ email });
      toast({ title: "Reset code sent to your email" });
      setMode("reset-password");
    } catch (err: any) {
      toast({ title: err.message || "Request failed", variant: "destructive" });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword({ email, code: otpCode, newPassword });
      toast({ title: "Password updated! Please log in" });
      setMode("login");
      setPassword("");
      setOtpCode("");
      setNewPassword("");
    } catch (err: any) {
      toast({ title: err.message || "Reset failed", variant: "destructive" });
    }
  };

  const handleResendOtp = async () => {
    try {
      const type = mode === "verify-otp" ? "signup" : "forgot_password";
      await resendOtp({ email, type });
      toast({ title: "Verification code resent" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to resend", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <Hourglass className="w-8 h-8 text-primary" />
          <span className="font-display font-bold text-2xl">FocusFlow</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {mode === "login" && "Welcome Back"}
              {mode === "signup" && "Create Account"}
              {mode === "verify-otp" && "Verify Email"}
              {mode === "forgot-password" && "Forgot Password"}
              {mode === "reset-password" && "Reset Password"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "Sign in with your email or profile name"}
              {mode === "signup" && "Start your focus journey today"}
              {mode === "verify-otp" && "Enter the 6-digit code sent to your email"}
              {mode === "forgot-password" && "We'll send you a reset code"}
              {mode === "reset-password" && "Enter the code and your new password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Login Form */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email or Profile Name</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="text"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-password"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loginPending} data-testid="button-login">
                  {loginPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                </Button>
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setMode("forgot-password")}
                    className="text-primary hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline"
                    data-testid="link-signup"
                  >
                    Create account
                  </button>
                </div>
              </form>
            )}

            {/* Signup Form */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-signup-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Profile Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="profile-name"
                      type="text"
                      placeholder="Your display name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-profile-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                      data-testid="input-signup-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={signupPending} data-testid="button-signup">
                  {signupPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                </Button>
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline"
                    data-testid="link-login"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </form>
            )}

            {/* Verify OTP Form */}
            {mode === "verify-otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    required
                    data-testid="input-otp"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={verifyOtpPending} data-testid="button-verify">
                  {verifyOtpPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Email"}
                </Button>
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendOtpPending}
                    className="text-primary hover:underline"
                    data-testid="link-resend-otp"
                  >
                    {resendOtpPending ? "Sending..." : "Resend code"}
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to signup
                  </button>
                </div>
              </form>
            )}

            {/* Forgot Password Form */}
            {mode === "forgot-password" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-forgot-email"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={forgotPasswordPending} data-testid="button-send-reset">
                  {forgotPasswordPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Code"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to login
                  </button>
                </div>
              </form>
            )}

            {/* Reset Password Form */}
            {mode === "reset-password" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-otp">Reset Code</Label>
                  <Input
                    id="reset-otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    required
                    data-testid="input-reset-otp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                      data-testid="input-new-password"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={resetPasswordPending} data-testid="button-reset">
                  {resetPasswordPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
                </Button>
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendOtpPending}
                    className="text-primary hover:underline"
                  >
                    {resendOtpPending ? "Sending..." : "Resend code"}
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to login
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
