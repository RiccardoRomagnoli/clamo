"use client";

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Calendar, Sparkles, Zap, Crown, ArrowRight, Clock, Check, CheckCircle2, Target, TrendingUp, MessageSquare, Play, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '~/components/ui/use-toast'
import { api } from '~/trpc/react'

interface ContactModalProps {
  show: boolean
  context?: 'general' | 'add-products' | 'generate-tasks' | 'priority-waitlist'
  onOpenChange?: (open: boolean) => void
  isPriorityWaitlist?: boolean
}

export function ContactModal({ show, context = 'general', onOpenChange, isPriorityWaitlist = false }: ContactModalProps) {
  const [isOpen, setIsOpen] = useState(show)
  const { toast } = useToast()

  useEffect(() => {
    setIsOpen(show)
  }, [show])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    onOpenChange?.(open)
  }

  // tRPC mutation for creating checkout session
  const createCheckoutMutation = api.user.createPriorityWaitlistCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      } else {
        toast({
          title: "Error",
          description: "Failed to create checkout session. Please try again.",
          variant: "destructive",
        })
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session. Please try again.",
        variant: "destructive",
      })
    },
  })

  const handleWaitlistSignup = () => {
    createCheckoutMutation.mutate()
  }

  const getModalContent = () => {
    switch (context) {
      case 'priority-waitlist':
        if (isPriorityWaitlist) {
          return {
            title: 'Auto-Execute Tasks',
            description: "You're on the priority waitlist! We'll notify you when auto-execution is available.",
            badge: 'Priority Access',
            features: [
              "You're already on the priority waitlist!",
              "We're working hard to bring you auto-execution capabilities",
              "You'll be among the first to get access",
              "Get notified as soon as it's ready",
              "Discuss your specific needs with our team",
            ],
            benefits: [
              { icon: <CheckCircle2 className="h-5 w-5" />, text: 'Priority Access Confirmed' },
              { icon: <Play className="h-5 w-5" />, text: 'Auto-execution Coming Soon' },
              { icon: <MessageSquare className="h-5 w-5" />, text: 'Book a Strategy Call' },
            ],
            cta: 'Book a Meeting',
            calendlyUrl: '',
            isWaitlist: true,
          }
        } else {
          return {
            title: 'Join Priority Waitlist',
            description: 'Get early access to auto-execute marketing tasks with our virtual browser.',
            badge: 'Early Access - $5',
            features: [
              'Auto-execute marketing tasks with AI',
              'Save hours of manual work every week',
              'Get detailed reports on task completion',
              'Priority support and onboarding',
              'Exclusive beta access to new features',
            ],
            benefits: [
              { icon: <Zap className="h-5 w-5" />, text: 'Automated Execution' },
              { icon: <Target className="h-5 w-5" />, text: 'Save Time' },
              { icon: <TrendingUp className="h-5 w-5" />, text: 'Track Results' },
            ],
            cta: 'Join Waitlist - $5',
            isWaitlist: true,
          }
        }

      case 'add-products':
        return {
          title: 'Unlock Multiple Products',
          description: 'Take your marketing to the next level',
          badge: 'Premium Feature',
          features: [
            'Track multiple products simultaneously',
            'Cross-promote between your products',
            'Advanced analytics dashboard',
            'Priority task generation',
            'Custom marketing strategies per product',
          ],
          benefits: [
            { icon: <Zap className="h-5 w-5" />, text: 'Scale your marketing efforts' },
            { icon: <Crown className="h-5 w-5" />, text: 'Get personalized guidance' },
            { icon: <Check className="h-5 w-5" />, text: 'Unlock advanced features' },
          ],
          cta: 'Book Your Strategy Call',
          calendlyUrl: '',
        }

      case 'generate-tasks':
        return {
          title: 'Generate Unlimited Tasks',
          description: 'Never run out of marketing ideas',
          badge: 'Premium Feature',
          features: [
            'Generate tasks on-demand',
            'AI learns from your preferences',
            'Advanced task prioritization',
            'Custom task categories',
            'Bulk task generation',
          ],
          benefits: [
            { icon: <Sparkles className="h-5 w-5" />, text: 'Endless marketing ideas' },
            { icon: <Clock className="h-5 w-5" />, text: 'Save hours of planning' },
            { icon: <Check className="h-5 w-5" />, text: 'Personalized strategies' },
          ],
          cta: 'Unlock Task Generation',
          calendlyUrl: '',
        }

      default:
        return {
          title: "Let's Grow Your Product Together",
          description: 'Book a free strategy session',
          badge: 'Free Consultation',
          features: [
            'Personalized marketing strategy',
            'Product analysis and recommendations',
            'Growth roadmap planning',
            'Q&A about Clamo features',
            'Custom pricing options',
          ],
          benefits: [
            { icon: <Calendar className="h-5 w-5" />, text: '30-minute strategy call' },
            { icon: <Zap className="h-5 w-5" />, text: 'Actionable insights' },
            { icon: <Check className="h-5 w-5" />, text: 'No commitment required' },
          ],
          cta: 'Book Free Strategy Call',
          calendlyUrl: '',
        }
    }
  }

  const content = getModalContent()

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-w-[95vw] sm:w-full max-h-[90vh] overflow-hidden p-0 flex flex-col">
        {/* Header with gradient background */}
        <div className={`relative ${content.isWaitlist && isPriorityWaitlist ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700' : 'bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600'} p-6 sm:p-8 text-white flex-shrink-0`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative">
            <Badge 
              className="mb-3 sm:mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs sm:text-sm"
              variant="outline"
            >
              {content.badge}
            </Badge>
            <DialogHeader>
              <DialogTitle className="text-2xl sm:text-3xl font-bold text-white">
                {content.title}
              </DialogTitle>
              <DialogDescription className="text-white/90 text-base sm:text-lg mt-2">
                {content.description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 sm:p-8 space-y-6 sm:space-y-7">
            {/* Special waitlist confirmation for existing users */}
            {content.isWaitlist && isPriorityWaitlist && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-purple-50 rounded-lg border border-purple-200"
              >
                <p className="text-sm text-purple-800">
                  <CheckCircle2 className="h-4 w-4 inline mr-2" />
                  You're already on the priority waitlist! We're working hard to bring you auto-execution capabilities.
                </p>
              </motion.div>
            )}

            {/* Features list */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 text-base sm:text-lg">
                {content.isWaitlist && isPriorityWaitlist ? "Your status:" : "What you'll get:"}
              </h3>
              <ul className="space-y-3">
                {content.features.map((feature, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className={`h-5 w-5 rounded-full ${content.isWaitlist && isPriorityWaitlist ? 'bg-purple-100' : 'bg-purple-100'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Check className={`h-3 w-3 ${content.isWaitlist && isPriorityWaitlist ? 'text-purple-600' : 'text-purple-600'}`} />
                    </div>
                    <span className="text-sm sm:text-base text-gray-700 leading-relaxed">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {content.benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="text-center p-4 bg-gray-50 rounded-lg"
                >
                  <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full ${content.isWaitlist && isPriorityWaitlist ? 'bg-gradient-to-br from-purple-100 to-purple-200' : 'bg-gradient-to-br from-orange-100 to-purple-100'} flex items-center justify-center mx-auto mb-2 text-purple-600`}>
                    {benefit.icon}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">{benefit.text}</p>
                </motion.div>
              ))}
            </div>

            {/* Urgency message for premium features */}
            {(context !== 'general' && context !== 'priority-waitlist') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="p-4 bg-orange-50 rounded-lg border border-orange-200"
              >
                <p className="text-sm text-orange-800 text-center leading-relaxed">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Limited availability - Book your call today to secure your spot
                </p>
              </motion.div>
            )}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col gap-3 sm:gap-4 pt-2"
            >
              <Button
                size="lg"
                className={`w-full h-12 sm:h-11 ${content.isWaitlist && !isPriorityWaitlist ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700'} text-white group shadow-lg hover:shadow-xl transition-all`}
                onClick={() => {
                  if (content.isWaitlist && !isPriorityWaitlist) {
                    handleWaitlistSignup()
                  } else {
                    window.open(content.calendlyUrl, '_blank')
                  }
                }}
                                 disabled={createCheckoutMutation.isPending}
               >
                 {createCheckoutMutation.isPending ? (
                   <>
                     <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                     Creating session...
                   </>
                 ) : (
                   <>
                     {content.isWaitlist && !isPriorityWaitlist ? (
                       <>
                         <Sparkles className="mr-2 h-5 w-5" />
                         {content.cta}
                       </>
                     ) : (
                       <>
                         {content.cta}
                         <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                       </>
                     )}
                   </>
                 )}
              </Button>
              <Button
                size="default"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                className="w-full h-10 sm:h-9 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                {content.isWaitlist && isPriorityWaitlist ? "Close" : "Maybe Later"}
              </Button>
            </motion.div>

            {/* Trust indicator */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center text-sm text-gray-500 pt-2 pb-2"
            >
              {content.isWaitlist && !isPriorityWaitlist 
                ? "Secure payment • Cancel anytime • Join 100+ marketers"
                : "No credit card required • Free consultation • Cancel anytime"
              }
            </motion.p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 