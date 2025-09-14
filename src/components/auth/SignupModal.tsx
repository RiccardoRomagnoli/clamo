import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState, useEffect } from "react";
import { useToast } from "~/components/ui/use-toast";
import { supabase } from "~/utils/supabase/client";
import { LanguageSelect } from "~/components/ui/language-select";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { env } from "~/env";
import { Checkbox } from "~/components/ui/checkbox";
import Link from "next/link";
import { PhoneNumberInput } from "~/components/ui/phone-number-input";
import { language } from "@prisma/client";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutorId?: string; // Optional tutorId for direct tutor assignment
  initialEmail?: string; // Optional initial email to prefill
}

export const SignupModal = ({ isOpen, onClose, tutorId, initialEmail }: SignupModalProps) => {
  const [activeTab, setActiveTab] = useState<"student" | "tutor">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [learningLanguage, setLearningLanguage] = useState<string>("");
  const [nativeLanguage, setNativeLanguage] = useState<string>("");
  const [learningLangError, setLearningLangError] = useState(false);
  const [nativeLangError, setNativeLangError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState<string>("");
  const [telegramPhone, setTelegramPhone] = useState<string>("");
  const { toast } = useToast();

  // Prefill email when modal opens or initialEmail changes
  useEffect(() => {
    if (isOpen && initialEmail && initialEmail !== email) {
      setEmail(initialEmail);
    }
  }, [isOpen, initialEmail]);

  /**
   * Validates email format using a regular expression
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    if (!isValid && email) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError(null);
    }
    
    return isValid;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // If an error already exists, validate while typing to provide immediate feedback
    if (emailError) {
      validateEmail(newEmail);
    }
  };
  
  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate email format
    if (!validateEmail(email)) {
      setLoading(false);
      return;
    }

    // Validate required fields
    if (!email || !learningLanguage || !nativeLanguage) {
      setLearningLangError(!learningLanguage);
      setNativeLangError(!nativeLanguage);
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      toast({
        title: "Terms and Conditions",
        description: "You must accept the Terms and Conditions to create an account",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Build formatted phone numbers (prepend country code)
      const formattedWhatsapp = whatsappPhone || undefined;
      const formattedTelegram = telegramPhone || undefined;

      // Define user metadata interface
      interface UserMetadata {
        name: string;
        learningLanguage: string;
        nativeLanguage: string;
        tutorId?: string;
        acceptedTerms: boolean;
        whatsappNumber?: string;
        telegramNumber?: string;
      }

      // Set up user metadata for Supabase
      const userData: UserMetadata = {
        name: name || email.split('@')[0] || 'User',
        learningLanguage,
        nativeLanguage,
        tutorId: tutorId || undefined,
        acceptedTerms: true,
        whatsappNumber: formattedWhatsapp,
        telegramNumber: formattedTelegram,
      };

      console.log('Signup with user data:', userData);

      // Sign up with Supabase Auth (passwordless)
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: userData,
          emailRedirectTo: env.NEXT_PUBLIC_APP_URL,
        }
      });

      if (error) throw error;
      
      setSuccess(true);
      toast({
        title: "Check your email",
        description: "We've sent you a magic link to complete your signup.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
    }
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
              We've sent a magic link to <strong>{email}</strong>. Click the link to complete your signup and access your dashboard.
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
            Sign Up
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative z-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "student" | "tutor")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="tutor">Tutor</TabsTrigger>
            </TabsList>
            
            <TabsContent value="student">
              <form onSubmit={handleStudentSignup} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    className={`w-full ${emailError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    required
                  />
                  {emailError && (
                    <p className="text-sm text-red-500 mt-1">{emailError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="learningLanguage">Language you want to learn</Label>
                  <LanguageSelect
                    key={`learning-${isOpen}`}
                    value={learningLanguage}
                    onChange={(value) => {
                      setLearningLanguage(value);
                      setLearningLangError(false);
                    }}
                    placeholder="Select language"
                    options={[
                      { value: 'Spanish', label: 'Spanish' },
                      { value: 'Italian', label: 'Italian' },
                      { value: 'English', label: 'English' },
                      { value: 'German', label: 'German' },
                      { value: 'French', label: 'French' },
                      { value: 'Polish', label: 'Polish' },
                    ]}
                  />
                  {learningLangError && (
                    <p className="text-sm text-red-500 mt-1">Please select a language to learn.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nativeLanguage">Language you speak best</Label>
                  <LanguageSelect
                    key={`native-${isOpen}`}
                    value={nativeLanguage}
                    onChange={(value)=> {
                      setNativeLanguage(value);
                      setNativeLangError(false);
                    }}
                    placeholder="Select language"
                    options={Object.values(language).map((lang)=>({ value: lang, label: lang }))}
                  />
                  {nativeLangError && (
                    <p className="text-sm text-red-500 mt-1">Please select your native language.</p>
                  )}
                </div>
                <PhoneNumberInput
                  label="WhatsApp Number (optional)"
                  value={whatsappPhone}
                  onChange={setWhatsappPhone}
                  helperText="Tutors may use WhatsApp for urgent scheduling or coordination."
                />
                <PhoneNumberInput
                  label="Telegram Number (optional)"
                  value={telegramPhone}
                  onChange={setTelegramPhone}
                  helperText="Telegram can be used for sharing materials or quick questions between lessons."
                />
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    required
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I accept the{" "}
                    <Link href="/terms-and-conditions" target="_blank" className="text-blue-600 hover:underline">
                      Terms and Conditions
                    </Link>
                  </label>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors" 
                  disabled={loading || !!emailError}
                >
                  {loading ? "Creating Account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="tutor">
              <div className="space-y-4 mt-2">
                <p className="text-gray-600">
                  If you're interested in becoming a tutor on our platform, please <a href="https://docs.google.com/forms/d/e/1FAIpQLSc3juqAUKG7HJ0S5-xDDr89YGR8wJmJA99zPRKWNWE6CjsK2w/viewform?usp=header" className="text-blue-600 underline">sign up here</a>.
                </p>
                <p className="text-gray-600 text-sm">
                  You will hear from us soon!
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 