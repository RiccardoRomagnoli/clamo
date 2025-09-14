'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Loader2, Check, Star, RefreshCw, Info, CreditCard } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useToast } from "~/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useAuth } from "~/contexts/AuthContext";
import { Tier, stringToTier } from "~/utils/subscription";
import { format } from "date-fns";
import { getSubscriptionPreviewText } from "~/utils/subscription-preview";
import { IconLoadingSpinner } from "~/components/ui/loading-spinner";
import { applyDiscount, isDiscountActive } from "~/utils/discount";
import { DiscountBadge } from "~/components/ui/discount-badge";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onOpenTutorDiscovery?: () => void;
}

interface TierCardProps {
  features: string[];
  isSelected: boolean;
  onClick: () => void;
  showPopular?: boolean;
  disabled?: boolean;
  timeWithLexi?: string;
  price?: string;
  originalPrice?: string;
  isFree?: boolean;
  hourlyRate?: number;
  originalHourlyRate?: number;
  totalPrice?: string;
  originalTotalPrice?: string;
  isCurrentTier?: boolean;
  isPendingChange?: boolean;
  isLoading?: boolean;
  discountPercent?: number;
}

interface TutoringCardProps {
  isSelected: boolean;
  onClick: () => void;
  showPopular?: boolean;
  disabled?: boolean;
  lessonsPerWeek: number;
  lessonsPerMonth: number;
  totalPrice?: string;
  originalTotalPrice?: string;
  hourlyRate?: number;
  originalHourlyRate?: number;
  isFree?: boolean;
  isCurrentTier?: boolean;
  isPendingChange?: boolean;
  isLoading?: boolean;
  discountPercent?: number;
}

const TutoringCard = ({
  isSelected,
  onClick,
  showPopular = false,
  disabled = false,
  lessonsPerWeek,
  lessonsPerMonth,
  totalPrice,
  originalTotalPrice,
  isFree = false,
  isCurrentTier = false,
  isPendingChange = false,
  isLoading = false,
  discountPercent
}: TutoringCardProps) => (
  <div
    onClick={(!disabled && !isLoading) ? onClick : undefined}
    className={`relative rounded-lg border p-4 flex flex-col transition-all duration-200 
      ${isSelected && !isCurrentTier ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : ''}
      ${isSelected && isCurrentTier ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : ''}
      ${!isSelected ? 'border-border hover:border-blue-300' : ''}
      ${(disabled || isLoading) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
  >
    {showPopular && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">
          Popular
        </div>
      </div>
    )}
    
    {isCurrentTier && !isPendingChange && (
      <div className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center">
        <Check className="h-3 w-3 mr-1" /> Current Plan
      </div>
    )}
    {isPendingChange && (
      <div className="absolute top-2 right-2 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center">
         <RefreshCw className="h-3 w-3 mr-1" /> Change to This
      </div>
    )}
    
    <div className="flex-grow flex flex-col items-center justify-center my-4 pt-4">
      <div className="text-3xl font-bold">{lessonsPerWeek} lessons</div>
      <div className="text-sm font-bold">per week</div>
    </div>
    
    <div className="mt-auto text-center">
      {isFree ? (
        <>
          <div className="text-lg font-semibold">2 trials</div>
          <div className="text-gray-500 text-sm">per month</div>
        </>
      ) : (
        <>
          {originalTotalPrice && originalTotalPrice !== totalPrice ? (
            <div className="text-sm line-through text-muted-foreground">{originalTotalPrice}</div>
          ) : null}
          <div className="text-lg font-semibold">{totalPrice}</div>
          <div className="text-gray-500 text-sm">{lessonsPerMonth} lessons</div>
          <div className="text-gray-500 text-xs mt-1">billed monthly</div>
          {discountPercent && (
            <div className="mt-2 flex justify-center">
              <DiscountBadge percentage={discountPercent} durationText="for the first 2 months" />
            </div>
          )}
        </>
      )}
    </div>
  </div>
);

const TierCard = ({
  features,
  isSelected,
  onClick,
  showPopular = false,
  disabled = false,
  timeWithLexi,
  price,
  originalPrice,
  isFree = false,
  hourlyRate,
  originalHourlyRate,
  totalPrice,
  originalTotalPrice,
  isCurrentTier = false,
  isPendingChange = false,
  isLoading = false,
  discountPercent
}: TierCardProps) => (
  <div
    onClick={(!disabled && !isLoading) ? onClick : undefined}
    className={`relative rounded-lg border p-4 flex flex-col transition-all duration-200 
      ${isSelected && !isCurrentTier ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : ''}
      ${isSelected && isCurrentTier ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : ''}
      ${!isSelected ? 'border-border hover:border-blue-300' : ''}
      ${(disabled || isLoading) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
  >
    {showPopular && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">
          Popular
        </div>
      </div>
    )}

    {isCurrentTier && !isPendingChange && (
      <div className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center">
        <Check className="h-3 w-3 mr-1" /> Current Plan
      </div>
    )}
    {isPendingChange && (
      <div className="absolute top-2 right-2 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center">
         <RefreshCw className="h-3 w-3 mr-1" /> Change to This
      </div>
    )}
    
    {timeWithLexi ? (
      <div className="mb-3 text-center pt-4">
        <div className="text-3xl font-bold">{timeWithLexi}</div>
        <div className="text-sm text-gray-500">with Lexi</div>
      </div>
    ) : <div className="mb-3 text-center pt-4 h-[60px]"></div>}
    
    <ul className="space-y-2 flex-grow">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start">
          <div className="mr-2 mt-0.5 h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Check className="h-3 w-3 text-blue-500" />
          </div>
          <span className="text-sm">{feature}</span>
        </li>
      ))}
    </ul>
    
    <div className="mt-4 text-center">
      {isFree ? (
         <div className="text-xl font-bold">Free</div>
      ) : hourlyRate ? (
        <>
          {originalHourlyRate && originalHourlyRate !== hourlyRate ? (
            <div className="text-sm line-through text-muted-foreground">${originalHourlyRate/100}</div>
          ) : null}
          <div className="text-2xl font-bold">${hourlyRate/100}</div>
          <div className="text-gray-500 text-sm">per lesson</div>
          <div className="text-gray-500 text-xs mt-1">{originalTotalPrice && originalTotalPrice!==totalPrice ? (
            <span className="line-through mr-1">{originalTotalPrice}</span>
          ) : null}{totalPrice} per month</div>
          {discountPercent && (
            <div className="mt-2 flex justify-center">
              <DiscountBadge percentage={discountPercent} durationText="for the first 2 months" />
            </div>
          )}
        </>
      ) : (
        <>
          {originalPrice && originalPrice !== price ? (
            <div className="text-sm line-through text-muted-foreground">{originalPrice}</div>
          ) : null}
          <div className="text-xl font-bold">{price}</div>
          <div className="text-gray-500 text-sm">per month</div>
          {discountPercent && (
            <div className="mt-2 flex justify-center">
              <DiscountBadge percentage={discountPercent} durationText="for the first 2 months" />
            </div>
          )}
        </>
      )}
    </div>
  </div>
);

export const PaywallModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  onOpenTutorDiscovery,
}: PaywallModalProps) => {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAiTier, setSelectedAiTier] = useState<Tier>("free");
  const [selectedTutorTier, setSelectedTutorTier] = useState<Tier>("free");
  
  const [initialAiTier, setInitialAiTier] = useState<Tier>("free");
  const [initialTutorTier, setInitialTutorTier] = useState<Tier>("free");

  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  const isSubscribedQuery = api.user.isSubscribed.useQuery();
  const hasSubscription = isSubscribedQuery.data?.hasSubscription ?? false;
  const currentSubscriptionId = isSubscribedQuery.data?.subscriptionId;
  const billingDate = isSubscribedQuery.data?.billingDate;

  // tRPC mutations
  const createCheckoutMutation = api.subscription.create.useMutation();
  const updateSubscriptionMutation = api.subscription.update.useMutation();
  const createBillingPortalMutation = api.subscription.createBillingPortal.useMutation();

  const [isBillingLoading, setIsBillingLoading] = useState(false);

  const discountPercent = profile?.introductory_discount_percentage as number | undefined;
  const discountExpiry = profile?.introductory_discount_expires_at as Date | string | undefined;
  const discountActive = isDiscountActive(discountPercent, discountExpiry ?? null);
  const discountExpiryExists = !!profile?.introductory_discount_expires_at;

  // For users with existing subscriptions, only apply discount to their current tier
  // For new users, apply discount to all tiers if active
  const shouldApplyDiscount = (tier: Tier, type: "ai" | "tutor") => {
    if (!discountActive || !discountPercent) return false;
    if (!hasSubscription) return true; // For new users, apply to all tiers
    if (type === "ai") {
      return tier === initialAiTier;
    } else {
      return tier === initialTutorTier;
    }
  };

  // Only show discount badges when the introductory discount is still active
  const badgePercent = discountActive && discountPercent && discountPercent > 0 && !discountExpiryExists && !hasSubscription
    ? discountPercent 
    : undefined;



  // Check for payment_success parameter and refresh subscription data
  useEffect(() => {
    if (searchParams.get('payment_success') === 'true') {
      // Refresh subscription data
      console.log("Payment success detected");
      utils.user.isSubscribed.invalidate();
      router.replace("/dashboard/student");
    }
  }, [searchParams, utils.user.isSubscribed]);


  useEffect(() => {
    if(isOpen)
      utils.user.isSubscribed.invalidate();
  }, [isOpen, utils.user.isSubscribed]);

  useEffect(() => {
    if (isSubscribedQuery.isSuccess && isSubscribedQuery.data) {
      const data = isSubscribedQuery.data;
      let currentAi: Tier = "free";
      let currentTutor: Tier = "free";

      if (data.hasSubscription) {
        currentAi = data.ai?.tier ?? "free";
        currentTutor = (data.tutors && data.tutors.length > 0 && data.tutors[0]?.tier) ? data.tutors[0].tier : "free";
      }
      
      setInitialAiTier(currentAi);
      setSelectedAiTier(currentAi);
      setInitialTutorTier(currentTutor);
      setSelectedTutorTier(currentTutor);
      
    } else if (!isSubscribedQuery.isLoading) {
        setInitialAiTier("free");
        setSelectedAiTier("free");
        setInitialTutorTier("free");
        setSelectedTutorTier("free");
    }
  }, [isSubscribedQuery.data, isSubscribedQuery.isSuccess, isSubscribedQuery.isLoading]);
  
  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      
      // Convert free to undefined or make proper Tier type
      const aiTierToSend = selectedAiTier !== "free" ? selectedAiTier : undefined;
      const tutorTierToSend = selectedTutorTier !== "free" ? selectedTutorTier : undefined;
      const tutorIdToSend = tutorTierToSend ? profile?.tutor?.id : undefined;

      if (!aiTierToSend && !tutorTierToSend) {
         toast({
           title: "No Plan Selected",
           description: "Please select an AI or Tutor plan to subscribe.",
           variant: "destructive",
         });
         setIsLoading(false);
         return;
      }

       if (tutorTierToSend && !tutorIdToSend) {
         toast({
           title: "Tutor Required",
           description: "Please select a tutor before subscribing to a tutoring plan.",
           variant: "destructive",
         });
          setIsLoading(false);
         return;
       }
      
      const result = await createCheckoutMutation.mutateAsync({
        aiTier: aiTierToSend,
        tutorId: tutorIdToSend,
        tutorTier: tutorTierToSend,
      });
      
      if (!result.url) {
        throw new Error('Could not create checkout session. Please try again.');
      }
      
      router.push(result.url);
      if (onSuccess) onSuccess();
      
    } catch (error: unknown) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Subscription Error",
        description: "Could not process subscription. Please try again or contact support",
        variant: "destructive",
      });
      setIsLoading(false);
    } 
  };

  const handleUpdateSubscriptions = async () => {
     if (!currentSubscriptionId) {
        toast({
          title: "Error",
          description: "Cannot update subscription. Subscription ID missing.",
          variant: "destructive",
        });
        return;
      }
      
      setIsLoading(true);

      const aiChanged = selectedAiTier !== initialAiTier;
      const tutorChanged = selectedTutorTier !== initialTutorTier;

      try {
        // First check if we need to update any subscriptions
        if (!aiChanged && !tutorChanged) {
          toast({
            title: "No Changes",
            description: "No subscription changes were made.",
          });
          setIsLoading(false);
          return;
        }

        // Prepare update data
        const updateData: {
          subscriptionId: string;
          newAiTier?: Tier;
          newTutorTier?: Tier;
          newTutorId?: string;
        } = {
          subscriptionId: currentSubscriptionId,
        };
        
        if (aiChanged) {
          // Map the selected tier to Tier type
          updateData.newAiTier = selectedAiTier;
        }
        
        if (tutorChanged) {
          if (selectedTutorTier !== "free" && !profile?.tutor?.id) {
            toast({
              title: "Tutor Required",
              description: "Cannot update to a paid tutor plan without selecting a tutor.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          
          // Map the selected tier to Tier type
          updateData.newTutorTier = selectedTutorTier;
          
          // Add tutor ID if selecting a paid tier
          if (selectedTutorTier !== "free" && profile?.tutor?.id) {
            updateData.newTutorId = profile.tutor.id;
          }
        }
        
        // Call the updateSubscription mutation
        const result = await updateSubscriptionMutation.mutateAsync(updateData);
        
        // Handle the result
        if (result.success) {
          // If there's a URL, it means there's an upgrade that requires payment
          if (result.url) {
            router.push(result.url);
            if (onSuccess) onSuccess();
            return;
          }
    
          
          toast({
            title: "Subscription Updated",
            description: "Your subscription details have been processed.",
          });
          
          await utils.user.isSubscribed.invalidate();
          
          if (onSuccess) onSuccess();
          if (aiChanged) setInitialAiTier(selectedAiTier);
          if (tutorChanged) setInitialTutorTier(selectedTutorTier);
        } else {
          toast({
            title: "Update Failed",
            description: "Could not update subscription(s). Please try again or contact support.",
            variant: "destructive",
          });
        }
      } catch (error: unknown) {
        console.error('Subscription update error:', error);
        toast({
          title: "Update Error",
          description: "Could not update subscription(s). Please try again or contact support.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
  };
  
  const handleAiTierSelect = (tier: Tier) => {
    setSelectedAiTier(tier);
  };
  
  const handleTutorTierToggle = (tier: Tier) => {
    setSelectedTutorTier(tier);
  };

   const isChangePending = useMemo(() => {
     if (!hasSubscription) return false;
     return (selectedAiTier !== initialAiTier) || (selectedTutorTier !== initialTutorTier);
   }, [selectedAiTier, initialAiTier, selectedTutorTier, initialTutorTier, hasSubscription]);
   
   const isActionDisabled = useMemo(() => {
     if (isLoading || isSubscribedQuery.isFetching) return true;
     if (hasSubscription) {
       return !isChangePending;
     } else {
       const noTierSelected = (selectedAiTier === "free") && (selectedTutorTier === "free");
       const tutorRequiredNotSet = (selectedTutorTier !== "free") && !profile?.tutor;
       return noTierSelected || tutorRequiredNotSet;
     }
   }, [isLoading, hasSubscription, isChangePending, selectedAiTier, selectedTutorTier, profile?.tutor, isSubscribedQuery.isFetching]);

  // Generate subscription preview text
  const subscriptionPreviewText = useMemo(() => {
    return getSubscriptionPreviewText({
      hasSubscription,
      initialAiTier,
      selectedAiTier,
      initialTutorTier,
      selectedTutorTier,
      billingDate: billingDate ? new Date(billingDate * 1000) : undefined,
      tutorHourlyRate: profile?.tutor?.hourly_rate,
      tutorName: profile?.tutor?.name,
      hasAiAccess: isSubscribedQuery.data?.ai?.hasAccess,
      discountPercent: discountActive ? (discountPercent ?? 0) : 0
    });
  }, [
    hasSubscription, 
    initialAiTier, 
    selectedAiTier, 
    initialTutorTier, 
    selectedTutorTier, 
    billingDate,
    profile?.tutor?.hourly_rate,
    profile?.tutor?.name,
    isSubscribedQuery.data?.ai?.hasAccess,
    discountActive,
    discountPercent
  ]);

  const handleOpenBillingPortal = async () => {
    try {
      setIsBillingLoading(true);
      const result = await createBillingPortalMutation.mutateAsync();
      
      if (result.url) {
        router.push(result.url);
      } else {
        throw new Error('Failed to generate billing portal URL.');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: "Billing Portal Error",
        description: error instanceof Error ? error.message : "Could not open the billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBillingLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-grow overflow-y-auto pr-6 pb-4" style={{ maxHeight: 'calc(90vh - 150px)' }}>
          <DialogHeader className="sticky top-0 bg-white z-10 pb-2">
            <div className="flex justify-between items-center">
              <div>
                {hasSubscription && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={handleOpenBillingPortal}
                    disabled={isBillingLoading}
                  >
                    {isBillingLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CreditCard className="h-3 w-3" />
                    )}
                    <span>Manage Billing</span>
                  </Button>
                )}
              </div>
              <div className="flex-grow">
                <DialogTitle className="text-2xl font-semibold text-center">
                  {hasSubscription ? "Manage Subscriptions" : "Choose Your Subscription"}
                </DialogTitle>
              </div>
              <div className="w-[118px]">{/* Empty div for balance */}</div>
            </div>
            <DialogDescription className="text-center px-6">
              {hasSubscription 
                ? "Select new tiers to update your plan. Changes may apply immediately or at the next billing cycle." 
                : "Select the AI and tutor subscription plans that suit your needs. Choose a tutor first for tutoring plans."}
            </DialogDescription>
          </DialogHeader>

          {isSubscribedQuery.isLoading ? (
             <div className="flex justify-center items-center py-10">
               <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
               <span className="ml-3 text-gray-600">Loading subscription details...</span>
             </div>
           ) : (
            <div className="space-y-8 py-4 px-2">
              <div>
                <h3 className="text-lg font-semibold mb-4 ml-1">Learning Boost with AI</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <TierCard
                    timeWithLexi="10min"
                    features={[
                      "Basic interaction",
                      "Limited exercises"
                    ]}
                    isSelected={selectedAiTier === "free"}
                    onClick={() => handleAiTierSelect("free")}
                    isFree={true}
                    isCurrentTier={initialAiTier === "free" && hasSubscription}
                    isPendingChange={selectedAiTier === "free" && initialAiTier !== "free" && hasSubscription}
                    isLoading={isLoading}
                    discountPercent={badgePercent}
                  />
                  
                  <TierCard
                    timeWithLexi="1h"
                    features={[
                      "60 minutes",
                      "Smart notes",
                      "Lesson insights",
                      "Unlimited practice"
                    ]}
                    isSelected={selectedAiTier === "tier1"}
                    onClick={() => handleAiTierSelect("tier1")}
                    originalPrice="$10"
                    price={`$${shouldApplyDiscount("tier1", "ai") ? applyDiscount(1000, discountPercent || 0) / 100 : 10}`}
                    isCurrentTier={initialAiTier === "tier1" && hasSubscription}
                    isPendingChange={selectedAiTier === "tier1" && initialAiTier !== "tier1" && hasSubscription}
                    showPopular={!hasSubscription}
                    isLoading={isLoading}
                    discountPercent={badgePercent}
                  />
                  
                  <TierCard
                    timeWithLexi="2h"
                    features={[
                      "120 minutes",
                      "Smart notes",
                      "Lesson insights",
                      "Unlimited practice"
                    ]}
                    isSelected={selectedAiTier === "tier2"}
                    onClick={() => handleAiTierSelect("tier2")}
                    originalPrice="$20"
                    price={`$${shouldApplyDiscount("tier2", "ai") ? applyDiscount(2000, discountPercent || 0) / 100 : 20}`}
                    isCurrentTier={initialAiTier === "tier2" && hasSubscription}
                    isPendingChange={selectedAiTier === "tier2" && initialAiTier !== "tier2" && hasSubscription}
                    isLoading={isLoading}
                    discountPercent={badgePercent}
                  />
                  
                  <TierCard
                    timeWithLexi="3h"
                    features={[
                      "180 minutes",
                      "Smart notes",
                      "Lesson insights",
                      "Unlimited practice"
                    ]}
                    isSelected={selectedAiTier === "tier3"}
                    onClick={() => handleAiTierSelect("tier3")}
                    originalPrice="$30"
                    price={`$${shouldApplyDiscount("tier3", "ai") ? applyDiscount(3000, discountPercent || 0) / 100 : 30}`}
                    isCurrentTier={initialAiTier === "tier3" && hasSubscription}
                    isPendingChange={selectedAiTier === "tier3" && initialAiTier !== "tier3" && hasSubscription}
                    isLoading={isLoading}
                    discountPercent={badgePercent}
                  />
                </div>
                
                {selectedAiTier === "free" && initialAiTier !== "free" && isSubscribedQuery.data?.ai?.hasAccess && billingDate && (
                  <div className="mt-3 text-sm flex items-center gap-1 text-blue-600 bg-blue-50 p-3 rounded-md border border-blue-100">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>
                      You&apos;ll have access to AI features until {format(new Date(billingDate * 1000), "MMMM d, yyyy")} even after downgrading to the free plan.
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-4 ml-1">
                  <h3 className="text-lg font-semibold">
                    Tutoring {profile?.tutor && profile.tutor.hourly_rate && profile.tutor.name ? `with ${profile.tutor.name} ($${profile.tutor.hourly_rate/100}/h)` : ''}
                  </h3>
                </div>
                
                {profile?.tutor ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <TutoringCard
                      lessonsPerWeek={0}
                      lessonsPerMonth={0}
                      isSelected={selectedTutorTier === "free"}
                      onClick={() => handleTutorTierToggle("free")}
                      isFree={true}
                      isCurrentTier={initialTutorTier === "free" && hasSubscription}
                      isPendingChange={selectedTutorTier === "free" && initialTutorTier !== "free" && hasSubscription}
                      disabled={!profile?.tutor && selectedTutorTier !== "free"}
                      isLoading={isLoading}
                      discountPercent={badgePercent}
                    />
                    
                    {profile.tutor.hourly_rate && (
                      <>
                        <TutoringCard
                          lessonsPerWeek={1}
                          lessonsPerMonth={4}
                          isSelected={selectedTutorTier === "tier1"}
                          onClick={() => handleTutorTierToggle("tier1")}
                          originalHourlyRate={profile.tutor.hourly_rate}
                          hourlyRate={shouldApplyDiscount("tier1", "tutor") ? applyDiscount(profile.tutor.hourly_rate, discountPercent || 0) : profile.tutor.hourly_rate}
                          originalTotalPrice={`$${profile.tutor.hourly_rate * 4 / 100}`}
                          totalPrice={`$${(shouldApplyDiscount("tier1", "tutor") ? applyDiscount(profile.tutor.hourly_rate, discountPercent || 0) : profile.tutor.hourly_rate) * 4 / 100}`}
                          isCurrentTier={initialTutorTier === "tier1" && hasSubscription}
                          isPendingChange={selectedTutorTier === "tier1" && initialTutorTier !== "tier1" && hasSubscription}
                          showPopular={!hasSubscription}
                          isLoading={isLoading}
                          discountPercent={badgePercent}
                        />
                        
                        <TutoringCard
                          lessonsPerWeek={2}
                          lessonsPerMonth={8}
                          isSelected={selectedTutorTier === "tier2"}
                          onClick={() => handleTutorTierToggle("tier2")}
                          originalHourlyRate={profile.tutor.hourly_rate}
                          hourlyRate={shouldApplyDiscount("tier2", "tutor") ? applyDiscount(profile.tutor.hourly_rate, discountPercent || 0) : profile.tutor.hourly_rate}
                          originalTotalPrice={`$${profile.tutor.hourly_rate * 8 / 100}`}
                          totalPrice={`$${(shouldApplyDiscount("tier2", "tutor") ? applyDiscount(profile.tutor.hourly_rate, discountPercent || 0) : profile.tutor.hourly_rate) * 8 / 100}`}
                          isCurrentTier={initialTutorTier === "tier2" && hasSubscription}
                          isPendingChange={selectedTutorTier === "tier2" && initialTutorTier !== "tier2" && hasSubscription}
                          isLoading={isLoading}
                          discountPercent={badgePercent}
                        />
                        
                        <TutoringCard
                          lessonsPerWeek={3}
                          lessonsPerMonth={12}
                          isSelected={selectedTutorTier === "tier3"}
                          onClick={() => handleTutorTierToggle("tier3")}
                          originalHourlyRate={profile.tutor.hourly_rate}
                          hourlyRate={shouldApplyDiscount("tier3", "tutor") ? applyDiscount(profile.tutor.hourly_rate, discountPercent || 0) : profile.tutor.hourly_rate}
                          originalTotalPrice={`$${profile.tutor.hourly_rate * 12 / 100}`}
                          totalPrice={`$${(shouldApplyDiscount("tier3", "tutor") ? applyDiscount(profile.tutor.hourly_rate, discountPercent || 0) : profile.tutor.hourly_rate) * 12 / 100}`}
                          isCurrentTier={initialTutorTier === "tier3" && hasSubscription}
                          isPendingChange={selectedTutorTier === "tier3" && initialTutorTier !== "tier3" && hasSubscription}
                          isLoading={isLoading}
                          discountPercent={badgePercent}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 border rounded-lg border-dashed bg-gray-50">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-medium mb-2">No Tutor Selected</h4>
                      <p className="text-gray-600 mb-4">Select a tutor to see available tutoring subscription plans</p>
                    </div>
                    <Button 
                      size="lg"
                      onClick={() => {
                        onClose();
                        if (onOpenTutorDiscovery) {
                          onOpenTutorDiscovery();
                        }
                      }}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Choose Your Tutor
                    </Button>
                     {discountActive && discountPercent && <DiscountBadge percentage={discountPercent} variant="cloud" className="mt-4" />}
                  </div>
                )}
              </div>
              
              {profile?.tutor && !profile.tutor.hourly_rate && (
                <div className="text-center text-sm text-orange-600 mt-4 bg-orange-50 p-3 rounded-md border border-orange-200">
                  Your tutor doesn&apos;t have an hourly rate set. Please contact support.
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer with subscription details and buttons */}
        {!isSubscribedQuery.isLoading && (
          <div className="border-t p-4 bg-white sticky bottom-0 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {subscriptionPreviewText && (
                <div className="text-sm bg-blue-50 p-3 rounded-md border border-blue-100 w-full sm:flex-grow sm:max-w-3xl">
                  {subscriptionPreviewText}
                </div>
              )}
              
              <div className="flex flex-row gap-3 items-center shrink-0 mt-3 sm:mt-0 self-end sm:self-auto">
                <Button variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                
                {hasSubscription ? (
                  <Button 
                    onClick={handleUpdateSubscriptions}
                    disabled={isActionDisabled}
                    className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                  >
                    {isLoading || isSubscribedQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {isSubscribedQuery.isFetching ? "Loading..." : "Update Subscriptions"}
                  </Button>
                ) : (
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSubscribe}
                    disabled={isActionDisabled}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Subscribe Now
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
