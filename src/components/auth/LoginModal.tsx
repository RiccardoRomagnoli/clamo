import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import { useToast } from "~/components/ui/use-toast";
import { supabase } from "~/utils/supabase/client";
import { env } from "~/env";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowSignup: () => void;
}

export const LoginModal = ({ isOpen, onClose, onShowSignup }: LoginModalProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: env.NEXT_PUBLIC_APP_URL,
        }
      });
      
      if (error) throw error;
      
      setSuccess(true);
      toast({
        title: "Check your email",
        description: "We've sent you a magic link to log in.",
      });
    } catch (error: any) {
      console.log('LoginModal error', error)
      toast({
        title: "Error",
        description: "The email is not registered, please sign up first.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartNowClick = () => {
    onClose();
    onShowSignup();
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-center">
              Check Your Email
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-gray-600 text-center">
              We've sent a magic link to <strong>{email}</strong>. Click the link to log in to your account.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => setSuccess(false)} 
                className="text-blue-600 hover:text-blue-800 transition-colors text-center"
              >
                Try with another email
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            Welcome Back
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full focus:ring-blue-600 focus:border-blue-600"
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors" 
            disabled={loading}
          >
            {loading ? "Sending Magic Link..." : "Log In"}
          </Button>
          <div className="text-center">
            <button
              type="button"
              onClick={handleStartNowClick}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Don't have an account? Start now
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
