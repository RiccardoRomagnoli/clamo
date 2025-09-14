'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { api } from '~/trpc/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle,
  Lightbulb,
  Target,
  TrendingUp,
  Star,
  Quote,
  Sparkles,
  Zap,
  BarChart3,
  Users,
  Rocket,
  Circle,
  Loader2,
  LogIn,
  MessageSquare,
  Brain,
  RefreshCw,
  Check,
  X,
  Trophy,
  Clock,
  Mail,
  Search,
  Edit,
  ChevronRight,
  ArrowDown,
  Play,
  Pause,
  Scale,
  FileText,
  MapPin,
  ClipboardCheck,
  Upload,
  Calendar,
  Gavel,
  Shield,
  BookOpen,
  AlertCircle,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import { LoginModal } from '~/components/auth/LoginModal'
import { supabase } from '~/utils/supabase/client'
import { useToast } from '~/components/ui/use-toast'
import { Toaster } from '~/components/ui/toaster'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { cn } from '~/utils/tailwind'

/* ------------------------------------------------------------------ */
/* ----------------------------- DATA --------------------------------*/
/* ------------------------------------------------------------------ */

// Simulated chat messages for the demo
const demoChat = [
  {
    role: 'assistant', 
    content: "Hello! I'm here to help you with your case at the Giudice di Page court. Let's start: what type of dispute are you dealing with?",
    delay: 0 
  },
  { 
    role: 'user', 
    content: "I received a parking fine that I believe is unfair. My car was parked legally.",
    delay: 1500 
  },
  { 
    role: 'assistant', 
    content: "I understand. This is an opposition to an administrative sanction. When did you receive the ticket? This is important for the appeal deadline.",
    delay: 3000 
  },
  {
    role: 'user', 
    content: "I received it on November 15, 2024. The fine is €42 plus fees.",
    delay: 4500 
  },
  { 
    role: 'assistant', 
    content: "Perfect, we're within the deadline (60 days). Do you have any evidence like photos of the parking spot or witnesses?",
    delay: 6000 
  },
  {
    role: 'user', 
    content: "Yes, I took photos showing confusing signage and I have a witness who was with me.",
    delay: 7500 
  },
]

// Demo tasks that get generated
const generatedTasks = [
  {
    id: '1',
    title: 'Prepare Your Appeal',
    description: 'Write your appeal using the provided template. Include: personal details, ticket number, grounds for opposition, request for annulment.',
    strategy: 'document',
    icon: FileText,
    color: 'blue',
  },
  {
    id: '2',
    title: 'File at Giudice di Page',
    description: 'Go to the Milan Giudice di Page court (Via Francesco Sforza 23). Bring: appeal in 3 copies, original ticket, €43 stamp duty, photos and witness statement.',
    strategy: 'filing',
    icon: MapPin,
    color: 'purple',
  },
  {
    id: '3',
    title: 'Notify the Counterparty',
    description: 'Within 30 days of filing, notify the appeal to the Local Police via certified email (PEC) or registered mail. Keep the receipt.',
    strategy: 'notification',
    icon: Mail,
    color: 'green',
  },
]

// Feedback examples
const taskFeedback = [
  {
    taskId: '1',
    type: 'result',
    content: 'Appeal completed and ready for filing',
    impact: 'positive',
  },
  {
    taskId: '2',
    type: 'completed',
    content: 'Successfully filed, received case number R.G. 2024/1234',
    impact: 'neutral',
  },
  {
    taskId: '3',
    type: 'result',
    content: 'Notification sent via PEC, delivery receipt saved',
    impact: 'positive',
  },
]

const companies = [
  'Milan Bar Association', 
  'Rome Court', 
  'Legal Tech Italy', 
  'Consumer Protection', 
  'Justice Ministry', 
  'Legal Aid Society'
] as const

/* ------------------------------------------------------------------ */
/* --------------------------- COMPONENTS ----------------------------*/
/* ------------------------------------------------------------------ */

/* Animated typing effect for chat messages */
const TypingMessage = ({ content, onComplete }: { content: string; onComplete?: () => void }) => {
  const [displayedContent, setDisplayedContent] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      if (index < content.length) {
        setDisplayedContent(content.slice(0, index + 1))
        index++
      } else {
        clearInterval(interval)
        setIsComplete(true)
        onComplete?.()
      }
    }, 13)

    return () => clearInterval(interval)
  }, [content, onComplete])

  return (
    <span>
      {displayedContent}
      {!isComplete && <span className="animate-pulse">▊</span>}
    </span>
  )
}

/* Progress steps for chat demo */
const discoverySteps = [
  'Case type',
  'Gathering facts',
  'Identifying parties',
  'Documents & evidence',
  'Confirming procedure'
]

/* Phase controls component */
const PhaseControls = ({ 
  onRestart, 
  nextPhaseId, 
  isAnimating,
  animationProgress,
  sectionRef
}: { 
  onRestart: () => void
  nextPhaseId?: string
  isAnimating: boolean
  animationProgress: number
  sectionRef: React.RefObject<HTMLDivElement | null>
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleMoveOn = () => {
    if (nextPhaseId) {
      const element = document.getElementById(nextPhaseId)
      if (element) {
        const navHeight = 80
        const elementTop = element.offsetTop - navHeight - 20 // 20px extra padding
        window.scrollTo({ 
          top: elementTop, 
          behavior: 'smooth' 
        })
      }
    }
  }

  return (
    <>
      {/* Restart button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRestart}
        className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-200 border border-gray-100"
        title="Restart animation"
      >
        <RefreshCw className="h-5 w-5 text-gray-700" />
      </motion.button>

      {/* Move on button with progress */}
      {nextPhaseId && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMoveOn}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className="relative w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-100"
          title="Next phase"
        >
          {/* Progress circle */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="18"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="18"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - animationProgress)}`}
              strokeLinecap="round"
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </svg>
          
          {/* Arrow icon with enhanced animation when complete */}
          <motion.div
            animate={animationProgress === 1 && !isHovered ? {
              y: [0, 2, 0],
              scale: [1, 1.2, 1],
            } : {
              y: 0,
              scale: 1
            }}
            transition={{
              repeat: animationProgress === 1 && !isHovered ? Infinity : 0,
              duration: 0.8,
              ease: "easeInOut"
            }}
          >
            <ArrowDown className={cn(
              "h-5 w-5 transition-colors duration-200",
              animationProgress === 1 ? "text-purple-600" : "text-gray-700"
            )} />
          </motion.div>

          {/* Pulse effect when complete */}
          {animationProgress === 1 && (
            <motion.div
              className="absolute inset-0 rounded-full bg-purple-600"
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeOut"
              }}
            />
          )}
        </motion.button>
      )}
    </>
  )
}

/* Phase header with controls */
const PhaseHeader = ({
  phase,
  icon,
  title,
  description,
  onRestart,
  nextPhaseId,
  isAnimating,
  animationProgress,
  sectionRef
}: {
  phase: string
  icon: React.ReactNode
  title: string
  description: string
  onRestart: () => void
  nextPhaseId?: string
  isAnimating: boolean
  animationProgress: number
  sectionRef: React.RefObject<HTMLDivElement | null>
}) => {
  const [stickyOffset, setStickyOffset] = useState(0)
  const [isSticky, setIsSticky] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const initialTopRef = useRef<number | null>(null)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle sticky positioning with absolute positioning
  useEffect(() => {
    // Disable sticky on mobile
    if (isMobile) {
      setStickyOffset(0)
      setIsSticky(false)
      return
    }

    const handleScroll = () => {
      if (!sectionRef.current || !containerRef.current || !headerRef.current) return

      // Get initial top position (relative to document)
      if (initialTopRef.current === null) {
        const containerRect = containerRef.current.getBoundingClientRect()
        initialTopRef.current = containerRect.top + window.scrollY
      }

      const sectionRect = sectionRef.current.getBoundingClientRect()
      const currentScrollY = window.scrollY
      const navHeight = 80
      
      // Calculate positions
      const stickyStartPoint = initialTopRef.current
      const stickyEndPoint = sectionRect.top + window.scrollY + (sectionRect.height * 0.5) - navHeight
      
      if (currentScrollY + navHeight > stickyStartPoint) {
        if (currentScrollY + navHeight < stickyEndPoint) {
          // In sticky range
          const offset = currentScrollY + navHeight - initialTopRef.current
          setStickyOffset(offset)
          setIsSticky(true)
        } else {
          // Past sticky range
          setStickyOffset(stickyEndPoint - stickyStartPoint)
          setIsSticky(false)
        }
      } else {
        // Before sticky range
        setStickyOffset(0)
        setIsSticky(false)
      }
    }

    // Use requestAnimationFrame for smooth updates
    let rafId: number
    const handleScrollRaf = () => {
      rafId = requestAnimationFrame(handleScroll)
    }

    window.addEventListener('scroll', handleScrollRaf, { passive: true })
    handleScroll() // Initial position

    return () => {
      window.removeEventListener('scroll', handleScrollRaf)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [sectionRef, isMobile])

  return (
    <>
      {/* Container with relative positioning */}
      <div ref={containerRef} className="container mx-auto px-4 relative">
        {/* Header with absolute positioning (or relative on mobile) */}
        <div
          ref={headerRef}
          className="mb-8 z-20"
          style={isMobile ? {} : {
            position: 'absolute',
            top: `${stickyOffset}px`,
            left: 0,
            right: 0,
            transition: 'none', // No transition for smooth scrolling
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3"
          >
            <Badge className={cn(
              "px-4 py-2 text-sm font-semibold bg-gradient-to-r from-orange-500 to-purple-600 text-white border-0 shadow-md transition-shadow duration-200",
              isSticky && !isMobile && "shadow-lg"
            )}>
              {icon}
              {phase}
            </Badge>
            <PhaseControls
              onRestart={onRestart}
              nextPhaseId={nextPhaseId}
              isAnimating={isAnimating}
              animationProgress={animationProgress}
              sectionRef={sectionRef}
            />
          </motion.div>
        </div>
        
        {/* Spacer to maintain layout (not needed on mobile) */}
        {!isMobile && <div className="h-12" />}
      </div>

      {/* Title and description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {title}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {description}
        </p>
      </motion.div>
    </>
  )
}

/* Chat Demo Section */
const ChatDemo = ({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  const [messages, setMessages] = useState<typeof demoChat>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [key, setKey] = useState(0) // For restart functionality
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  // Calculate animation progress
  useEffect(() => {
    const totalSteps = demoChat.length
    const progress = currentIndex / totalSteps
    setAnimationProgress(progress)
  }, [currentIndex])

  const restart = () => {
    setMessages([])
    setCurrentIndex(0)
    setIsTyping(false)
    setCurrentStep(0)
    setAnimationProgress(0)
    setKey(prev => prev + 1) // Force re-render
  }

  useEffect(() => {
    if (!isInView) return

    const timer = setTimeout(() => {
      if (currentIndex < demoChat.length) {
        const message = demoChat[currentIndex]
        if (message) {
          setIsTyping(true)
          setTimeout(() => {
            setMessages(prev => [...prev, message])
            setIsTyping(false)
            setCurrentIndex(prev => prev + 1)
            // Update step based on message index
            if (currentIndex % 2 === 1) {
              setCurrentStep(prev => Math.min(prev + 1, discoverySteps.length - 1))
        }
          }, message.delay)
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [currentIndex, isInView, key])

  return (
    <>
      <PhaseHeader
        phase="PHASE 1"
        icon={<Sparkles className="h-4 w-4 mr-2" />}
        title="We Analyze Your Case"
        description="Through a guided conversation, we gather all the details of your dispute to prepare a personalized legal strategy."
        onRestart={restart}
        nextPhaseId="task-generation"
        isAnimating={currentIndex < demoChat.length}
        animationProgress={animationProgress}
        sectionRef={sectionRef}
      />

      <div className="relative" key={key}>
        {/* Chat window */}
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-200">
            {/* Chat header */}
            <div className="bg-gradient-to-r from-orange-500 to-purple-600 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Clamo Legal Discovery</h3>
                  <p className="text-sm opacity-90">Analyzing your case...</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="h-[400px] overflow-y-auto p-6 space-y-4 bg-gray-50">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-800'
                      )}
                    >
                      {index === messages.length - 1 && !isTyping ? (
                        <TypingMessage content={message.content} />
                      ) : (
                        message.content
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Progress bar */}
            <div className="p-4 bg-white border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Discovery Progress</span>
                <span className="text-sm font-medium text-purple-600">
                  {discoverySteps[currentStep]}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-orange-500 to-purple-600 h-2 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((currentStep + 1) / discoverySteps.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* Task Generation Animation */
const TaskGenerationAnimation = ({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [stage, setStage] = useState<'waiting' | 'collecting' | 'processing' | 'generating' | 'complete'>('waiting')
  const [visibleTasks, setVisibleTasks] = useState<number[]>([])
  const [animationProgress, setAnimationProgress] = useState(0)
  const [key, setKey] = useState(0)

  const dataSources = [
    { label: 'Case Facts', icon: '📋', angle: 0 },
    { label: 'Legal Grounds', icon: '⚖️', angle: 72 },
    { label: 'Evidence', icon: '📸', angle: 144 },
    { label: 'Deadlines', icon: '⏰', angle: 216 },
    { label: 'Court Info', icon: '🏛️', angle: 288 },
  ]

  const restart = () => {
    setStage('waiting')
    setVisibleTasks([])
    setAnimationProgress(0)
    setKey(prev => prev + 1)
  }

  useEffect(() => {
    if (!isInView) return

    const stages: ('collecting' | 'processing' | 'generating' | 'complete')[] = ['collecting', 'processing', 'generating', 'complete']
    let currentStage = 0

    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setStage(stages[currentStage]!)
        setAnimationProgress((currentStage + 1) / stages.length)
        
        if (stages[currentStage] === 'complete') {
          // Show tasks one by one
          generatedTasks.forEach((_, index) => {
            setTimeout(() => {
              setVisibleTasks(prev => [...prev, index])
            }, index * 300)
          })
        }
        
        currentStage++
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isInView, key])

  return (
    <>
      <PhaseHeader
        phase="PHASE 2"
        icon={<Brain className="h-4 w-4 mr-2" />}
        title="We Generate Your Case"
        description="Our system automatically creates all necessary documents and tasks to complete for your Giudice di Page appeal."
        onRestart={restart}
        nextPhaseId="task-execution"
        isAnimating={stage !== 'complete' || visibleTasks.length < generatedTasks.length}
        animationProgress={animationProgress}
        sectionRef={sectionRef}
      />
      
      <div className="relative" key={key}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Animation */}
          <div className="relative h-[500px] flex items-center justify-center">
            {/* Central AI Brain */}
            <motion.div
              animate={{
                scale: stage === 'processing' ? [1, 1.1, 1] : 1,
                rotate: stage === 'processing' ? [0, 360] : 0,
              }}
              transition={{
                scale: { repeat: Infinity, duration: 2 },
                rotate: { repeat: Infinity, duration: 20, ease: "linear" },
              }}
              className="absolute z-10"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 opacity-20 blur-xl" />
              <Brain className="w-16 h-16 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </motion.div>

            {/* Data sources with connections */}
            {(stage === 'collecting' || stage === 'processing' || stage === 'generating' || stage === 'complete') && 
              dataSources.map((source, index) => {
                const radius = 150
                const angleRad = (source.angle * Math.PI) / 180
                const x = Math.cos(angleRad) * radius
                const y = Math.sin(angleRad) * radius

            return (
                  <React.Fragment key={source.label}>
                    {/* Connection line */}
                    {(stage === 'processing' || stage === 'generating' || stage === 'complete') && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <defs>
                          <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff7d45" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#6b5bff" stopOpacity="0.8" />
                          </linearGradient>
                        </defs>
                      </svg>
                    )}

                    {/* Data source */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        x: stage === 'processing' || stage === 'generating' || stage === 'complete' ? x : x * 0.8,
                        y: stage === 'processing' || stage === 'generating' || stage === 'complete' ? y : y * 0.8,
                      }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className="absolute"
              >
                      <motion.div 
                        className={cn(
                          "bg-white shadow-lg rounded-lg p-3 border-2 transition-all",
                          stage === 'processing' || stage === 'generating' || stage === 'complete'
                            ? "border-purple-400 shadow-purple-200"
                            : "border-gray-200"
                        )}
                        animate={stage === 'processing' || stage === 'generating' || stage === 'complete' ? {
                          boxShadow: [
                            "0 0 0 0 rgba(168, 85, 247, 0.4)",
                            "0 0 0 10px rgba(168, 85, 247, 0)",
                          ]
                        } : {}}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          delay: index * 0.2
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{source.icon}</span>
                          <p className="text-xs font-medium text-gray-700">{source.label}</p>
                        </div>
                      </motion.div>
                    </motion.div>
                  </React.Fragment>
                )
              })
            }

            {/* Processing indicators */}
            {stage === 'processing' || stage === 'generating' && (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute w-48 h-48"
                >
                  <svg className="w-full h-full">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="40%"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="2"
                      strokeDasharray="5 5"
                    />
                    <defs>
                      <linearGradient id="gradient">
                        <stop offset="0%" stopColor="#ff7d45" />
                        <stop offset="100%" stopColor="#6b5bff" />
                      </linearGradient>
                    </defs>
                      </svg>
                </motion.div>
              </>
            )}

            {/* Stage label */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <Badge variant="outline" className="text-sm">
                {stage === 'waiting' && 'Ready to analyze'}
                {stage === 'collecting' && 'Gathering information'}
                {stage === 'processing' && 'AI Processing'}
                {stage === 'generating' && 'Generating tasks'}
                {stage === 'complete' && 'Tasks ready!'}
              </Badge>
                    </div>
          </div>

          {/* Right side - Generated tasks */}
          <div className="space-y-4">
            <div className="text-center lg:text-left mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Automatic Task Generation
              </h3>
              <p className="text-gray-600">
                The system analyzes your case and generates personalized legal tasks
              </p>
            </div>

            <AnimatePresence>
              {visibleTasks.map((index) => {
                const task = generatedTasks[index]
                if (!task) return null

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            task.color === 'blue' && "bg-blue-100",
                            task.color === 'purple' && "bg-purple-100",
                            task.color === 'green' && "bg-green-100"
                          )}>
                            <task.icon className={cn(
                              "h-5 w-5",
                              task.color === 'blue' && "text-blue-600",
                              task.color === 'purple' && "text-purple-600",
                              task.color === 'green' && "text-green-600"
                            )} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{task.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {task.strategy}
                              </Badge>
                              <span className="text-xs text-gray-500">Ready to execute</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  )
}

/* Task Execution Demo */
const TaskExecutionDemo = ({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  const [animationProgress, setAnimationProgress] = useState(0)
  const [play, setPlay] = useState(false)
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [taskProgress, setTaskProgress] = useState<Record<string, boolean>>({}) 
  const [key, setKey] = useState(0)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  // Simulate task completion progress
  useEffect(() => {
    if (!isInView) return

    const timer = setInterval(() => {
      if (currentTaskIndex < generatedTasks.length) {
        setTaskProgress(prev => ({
          ...prev,
          [generatedTasks[currentTaskIndex]!.id]: true
        }))
        setCurrentTaskIndex(prev => prev + 1)
        setAnimationProgress((currentTaskIndex + 1) / generatedTasks.length)
      }
    }, 2000)

    return () => clearInterval(timer)
  }, [currentTaskIndex, isInView, key])

  const restart = () => {
    setCurrentTaskIndex(0)
    setTaskProgress({})
    setAnimationProgress(0)
    setKey(prev => prev + 1)
    setPlay(false)
  }

  return (
    <>
      <PhaseHeader
        phase="PHASE 3"
        icon={<ClipboardCheck className="h-4 w-4 mr-2" />}
        title="Complete Tasks with Guidance"
        description="We guide you step-by-step through each task: from document preparation to court filing, with reminders and deadlines."
        onRestart={restart}
        nextPhaseId="feedback-loop"
        isAnimating={animationProgress < 1}
        animationProgress={animationProgress}
        sectionRef={sectionRef}
      />

      <div className="relative" key={key}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Task Progress Tracker */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Your Legal Tasks in Action
            </h3>
            
            {generatedTasks.map((task, index) => {
              const isCompleted = taskProgress[task.id]
              const isActive = index === currentTaskIndex
              
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 }}
                >
                  <Card className={cn(
                    "transition-all",
                    isCompleted && "border-green-200 bg-green-50",
                    isActive && !isCompleted && "border-purple-200 bg-purple-50 shadow-lg"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg transition-all",
                          isCompleted ? "bg-green-100" :
                          isActive ? "bg-purple-100" :
                          task.color === 'blue' ? "bg-blue-100" :
                          task.color === 'purple' ? "bg-purple-100" :
                          "bg-green-100"
                        )}>
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <task.icon className={cn(
                              "h-5 w-5",
                              isActive ? "text-purple-600" :
                              task.color === 'blue' && "text-blue-600",
                              task.color === 'purple' && "text-purple-600",
                              task.color === 'green' && "text-green-600"
                            )} />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          {isActive && !isCompleted && (
                            <motion.div
                              initial={{ width: '0%' }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 2 }}
                              className="mt-2 h-1 bg-purple-300 rounded-full"
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Right side - Feature highlights */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Your Legal Assistant at Work
            </h3>
            
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: play ? 1 : 0.5, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-3"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Guided Activities</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Each task includes detailed instructions, pre-filled templates, and precise directions on where to go and what to do
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: play ? 1 : 0.5, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-3"
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Context Understanding</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    The system understands your case details and adapts every document and task to your specific situation
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: play ? 1 : 0.5, x: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-start gap-3"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Track & Confirm</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Monitor your appeal progress and receive notifications for important deadlines and next steps
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* Feedback Loop Demo */
const FeedbackLoopDemo = ({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [activeFeedback, setActiveFeedback] = useState<number[]>([])
  const [showImprovement, setShowImprovement] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [key, setKey] = useState(0)

  const restart = () => {
    setActiveFeedback([])
    setShowImprovement(false)
    setAnimationProgress(0)
    setKey(prev => prev + 1)
  }

  useEffect(() => {
    if (!isInView) return

    // Show feedback items one by one
    taskFeedback.forEach((_, index) => {
      setTimeout(() => {
        setActiveFeedback(prev => [...prev, index])
        setAnimationProgress((index + 1) / (taskFeedback.length + 1))
      }, index * 1000 + 1000)
    })

    // Show improvement after all feedback
    setTimeout(() => {
      setShowImprovement(true)
      setAnimationProgress(1)
    }, taskFeedback.length * 1000 + 2000)
  }, [isInView, key])

  return (
    <>
      <PhaseHeader
        phase="PHASE 4"
        icon={<RefreshCw className="h-4 w-4 mr-2" />}
        title="Continuous Support"
        description="Share your progress and receive ongoing support. The system continuously improves to offer you the best possible assistance."
        onRestart={restart}
        nextPhaseId={undefined}
        isAnimating={!showImprovement}
        animationProgress={animationProgress}
        sectionRef={sectionRef}
      />
      
      <div className="relative" key={key}>
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left - Tasks with feedback */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Your Progress
            </h3>
            
            {generatedTasks.map((task, taskIndex) => {
              const feedback = taskFeedback.find(f => f.taskId === task.id)
              const feedbackIndex = taskFeedback.findIndex(f => f.taskId === task.id)
              const showFeedback = activeFeedback.includes(feedbackIndex)

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: taskIndex * 0.2 }}
                >
                  <Card className={cn(
                    "transition-all",
                    showFeedback && feedback?.impact === 'positive' && "border-green-200 shadow-green-100 shadow-lg"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg transition-colors",
                          showFeedback && feedback?.impact === 'positive' ? "bg-green-100" : 
                          task.color === 'blue' ? "bg-blue-100" :
                          task.color === 'purple' ? "bg-purple-100" :
                          "bg-green-100"
                        )}>
                          {showFeedback && feedback?.impact === 'positive' ? (
                            <Trophy className="h-5 w-5 text-green-600" />
                          ) : (
                            <task.icon className={cn(
                              "h-5 w-5",
                              task.color === 'blue' && "text-blue-600",
                              task.color === 'purple' && "text-purple-600",
                              task.color === 'green' && "text-green-600"
                            )} />
                  )}
                </div>
                <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{task.title}</h4>
                          
                          <AnimatePresence>
                            {showFeedback && feedback && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-3"
                              >
                                <div className={cn(
                                  "p-3 rounded-lg text-sm",
                                  feedback.impact === 'positive' ? "bg-green-50 text-green-800" : "bg-gray-50 text-gray-700"
                                )}>
                                  <div className="flex items-center gap-2 mb-1">
                                    {feedback.type === 'result' ? (
                                      <TrendingUp className="h-4 w-4" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4" />
                                    )}
                                    <span className="font-medium">
                                      {feedback.type === 'result' ? 'Results' : 'Completed'}
                    </span>
                                  </div>
                                  <p>{feedback.content}</p>
                                </div>
                              </motion.div>
                  )}
                          </AnimatePresence>
                </div>
              </div>
                    </CardContent>
                  </Card>
                </motion.div>
            )
          })}
    </div>

          {/* Right - Learning visualization */}
          <div className="flex items-center">
            <div className="w-full">
              <div className="text-center mb-8">
                <Brain className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  System Continuously Improving
                </h3>
                <p className="text-gray-600">
                  Each resolved case improves support for future users
                </p>
              </div>

              <AnimatePresence>
                {showImprovement && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    {/* Improvement metrics */}
                    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-orange-50">
                      <CardContent className="p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">
                          Next Improved Tasks
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Document Accuracy</span>
            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-green-600">+23%</span>
                              <ArrowRight className="h-4 w-4 text-green-600" />
            </div>
          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Success Rate</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-green-600">+18%</span>
                              <ArrowRight className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Support Quality</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-green-600">+31%</span>
                              <ArrowRight className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Example improved task */}
                    <Card className="border-green-200 shadow-green-100 shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <Sparkles className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <Badge className="bg-green-100 text-green-700 text-xs mb-2">
                              AI Improved
                            </Badge>
                            <h5 className="font-semibold text-gray-900">
                              Optimized notification for your case
                            </h5>
                            <p className="text-sm text-gray-600 mt-1">
                              Based on similar cases, we suggest sending notification via PEC to speed up the process
                            </p>
            </div>
          </div>
                      </CardContent>
                    </Card>
                  </motion.div>
        )}
              </AnimatePresence>
      </div>
    </div>
        </div>
  </div>
    </>
  )
}

/* Floating geometric shapes for section backgrounds */
const FloatingGeometricShapes = ({ variant = 'default' }: { variant?: 'default' | 'light' | 'dark' }) => {
  const colors = {
    default: ['#ff7d45', '#ff4ecd', '#6b5bff'],
    light: ['#ffd4c1', '#ffc1f0', '#d4ccff'],
    dark: ['#cc5a2e', '#cc3ca4', '#5447cc']
  }
  
  const selectedColors = colors[variant]
  
  // Generate random positions and shapes for each instance
  const shapes = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      color: selectedColors[i % selectedColors.length],
      size: Math.random() * 40 + 60, // 60-100
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 20 + Math.random() * 10, // 20-30s
    }))
  }, [selectedColors])
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {shapes.map((shape) => (
      <svg
          key={shape.id}
          className="absolute animate-float-slow"
          style={{ 
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            top: `${shape.y}%`, 
            left: `${shape.x}%`, 
            animationDelay: `${shape.delay}s`,
            animationDuration: `${shape.duration}s`
          }}
        viewBox="0 0 100 100"
      >
          {/* Generate random blob shape */}
        <path
            d={`M ${20 + Math.random() * 20},50 
                Q ${10 + Math.random() * 20},${20 + Math.random() * 20} ${30 + Math.random() * 20},${15 + Math.random() * 20} 
                Q ${50 + Math.random() * 20},${10 + Math.random() * 20} ${65 + Math.random() * 20},${30 + Math.random() * 20} 
                Q ${75 + Math.random() * 20},${50 + Math.random() * 20} ${60 + Math.random() * 20},${65 + Math.random() * 20} 
                Q ${40 + Math.random() * 20},${75 + Math.random() * 20} ${25 + Math.random() * 20},${60 + Math.random() * 20} 
                Q ${10 + Math.random() * 20},${40 + Math.random() * 20} ${20 + Math.random() * 20},50`}
            fill={shape.color}
          opacity="0.15"
        />
      </svg>
      ))}
    </div>
  )
}

/* Hero section with onboarding form */
export const HeroSection = () => {
  /* onboarding state */
  const [stage, setStage] = useState<1 | 2>(1)
  const [caseSummary, setCaseSummary] = useState('')
  const [email, setEmail] = useState('')
  const productInputRef = useRef<HTMLTextAreaElement>(null)

  /* auth modals state */
  const [showLoginModal, setShowLoginModal] = useState(false)

  const { toast } = useToast()

  const handleStartNow = () => {
    setShowLoginModal(false)
    focusInput()
  }

  const createUserMutation = api.user.createUserRecord.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        // Redirect to chat page with chat ID
        const params = new URLSearchParams({
          ...(result.chatId && { chatId: result.chatId }),
        })
        
        window.location.href = `/chat?${params.toString()}`
      }
    },
    onError: (error) => {
      console.error('Create user error:', error)
      toast({
        title: "Error",
        description: "Failed to start your appeal. Please try again.",
        variant: "destructive",
      })
    }
  })

  const [isSigningUp, setIsSigningUp] = useState(false)

  const next = async (e: React.FormEvent) => {
    e.preventDefault()
    if (stage === 1 && caseSummary.trim()) {
      setStage(2)
    } else if (stage === 2 && email.trim()) {
      setIsSigningUp(true)
      
      try {
        // First, signup with Supabase (frontend) to get session cookies
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12), // Random password
          options: {
            data: {
              product_description: caseSummary,
            }
          }
        })

        if (authError) {
          console.error('Supabase signup error:', authError)
          toast({
            title: "Error",
            description: "Failed to set up your appeal. Please try again.",
            variant: "destructive",
          })
          setIsSigningUp(false)
          return
        }

        if (!authData.user) {
          toast({
            title: "Error",
            description: "Failed to get started with your growth journey. Please try again.",
            variant: "destructive",
          })
          setIsSigningUp(false)
          return
        }

        // Then create user record and chat in our database
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        
        createUserMutation.mutate({
          userId: authData.user.id,
          email,
          caseSummary,
          timezone,
        })
      } catch (error) {
        console.error('Signup error:', error)
        toast({
          title: "Error",
          description: "Failed to get you started. Please try again.",
          variant: "destructive",
        })
        setIsSigningUp(false)
      }
    }
  }

  const focusInput = () => {
    productInputRef.current?.focus()
    productInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <>
      {/* ----------------------------- NAV --------------------------- */}
      <nav className="fixed inset-x-0 top-0 z-50 h-16 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            <span>Clamo</span>
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              .legal
            </span>
          </Link>

          {/* centre NAV links */}
          <div className="hidden md:flex gap-8 text-sm font-medium">
            <a href="#chat-demo" className="hover:text-purple-600 transition-colors">1. Discovery</a>
            <a href="#task-generation" className="hover:text-purple-600 transition-colors">2. Case Creation</a>
            <a href="#task-execution" className="hover:text-purple-600 transition-colors">3. Guided Tasks</a>
            <a href="#feedback-loop" className="hover:text-purple-600 transition-colors">4. Support</a>
            <a href="#pricing" className="hover:text-purple-600 transition-colors">Pricing</a>
            <a href="https://clamo.lovable.app/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">Blog</a>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLoginModal(true)}
            className="inline-flex items-center gap-1 font-medium hover:text-purple-600 hover:bg-purple-50"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Login</span>
          </Button>
        </div>
      </nav>

      {/* ----------------------------- HERO -------------------------- */}
      <header
        id="hero"
        className="relative pt-32 pb-20 text-center text-white bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 overflow-hidden"
        style={{ position: 'relative', zIndex: 10 }}
      >
        {/* Additional background texture */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,white_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,white_0%,transparent_50%)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <h1 className="mx-auto mb-6 max-w-4xl text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
            Self-Represent at the&nbsp;
            <span className="underline decoration-white/40">
              Justice&nbsp;of&nbsp;the&nbsp;Peace
            </span>
          </h1>
          <p className="mx-auto mb-14 max-w-2xl text-lg md:text-xl opacity-95">
            Clamo guides you step-by-step through your appeal: from initial consultation
            to document preparation and court filing. <strong>Save on legal fees</strong>
            and get justice with simplified procedures for disputes up to €1,100 and administrative sanctions.
          </p>

          {/* onboarding form (centre) with enhanced focus states */}
          <form
            onSubmit={next}
            className="mx-auto flex flex-col gap-3 max-w-lg"
          >
            {stage === 1 ? (
              <>
                <textarea
                  ref={productInputRef}
                  required
                  rows={3}
                  value={caseSummary}
                  onChange={(e) => setCaseSummary(e.target.value)}
                  placeholder="Briefly describe your dispute: what happened? When? With whom? What amount is involved?"
                  className="flex-1 rounded-lg border-2 border-white/30 bg-white/10 backdrop-blur px-4 py-3 text-white placeholder-white/70 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30 focus:border-white transition-all resize-none"
                />
                <Button className="bg-white text-purple-700 hover:bg-gray-50 shadow-lg font-semibold" disabled={isSigningUp}>
                  Next
                  <ArrowRight className="ml-1 w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="flex-1 rounded-lg border-2 border-white/30 bg-white/10 backdrop-blur px-4 py-3 text-white placeholder-white/70 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30 focus:border-white transition-all"
                    autoFocus
                  />
                  <Button className="bg-white text-purple-700 hover:bg-gray-50 shadow-lg font-semibold" disabled={isSigningUp || createUserMutation.isPending}>
                    {isSigningUp || createUserMutation.isPending ? 'Preparing...' : 'Start Free'}
                    {isSigningUp || createUserMutation.isPending ? (
                      <Loader2 className="ml-1 w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="ml-1 w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-white/70 mt-2">
                  Track progress and continue where you left off
                </p>
              </>
            )}
          </form>

          {/* Iframe below the input box */}
          <div className="mx-auto max-w-4xl mt-12">
            <iframe 
              src="https://bey.chat/2951da05-aa5f-46f1-9c46-dd27685b5688" 
              width="100%" 
              height="600px" 
              frameBorder="0" 
              allowFullScreen
              allow="camera; microphone; fullscreen"
              style={{ border: 'none', maxWidth: '100%' }}
              className="rounded-lg shadow-2xl"
            />
          </div>

        </div>
      </header>

      {/* ----------------------- AUTH MODALS ----------------------- */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onShowSignup={handleStartNow}
      />
      
      {/* Toast notifications */}
      <Toaster />
    </>
  )
}

export default function ClamoLandingClient() {
  const router = useRouter()
  const utils = api.useUtils()
  
  // Create refs for each section
  const chatSectionRef = useRef<HTMLDivElement>(null)
  const taskSectionRef = useRef<HTMLDivElement>(null)
  const taskExecutionRef = useRef<HTMLDivElement>(null)
  const feedbackSectionRef = useRef<HTMLDivElement>(null)

  // Check auth state changes and redirect appropriately
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // User just logged in, check their state and redirect
        try {
          // Get products
          const cases = await utils.case.getAll.fetch()
          
          if (cases.length > 0) {
            // User has products, redirect to dashboard
            router.push('/dashboard')
            return
          }

          // No products, check for incomplete chats
          const chats = await utils.chat.getAll.fetch()

          for (const chat of chats) {
            if (!chat.completed) {
              // Found incomplete chat, redirect to chat page
              router.push(`/chat?chatId=${chat.id}`)
              return
            }
          }

          // No products and no incomplete chats, stay on landing page
          // They can use the form to create a new product
        } catch (error) {
          console.error('Error checking user state:', error)
          // On error, stay on landing page
        }
      }
    })
  }, [router, utils])

  return (
    <TooltipProvider>
      <HeroSection />

      {/* ---------------------- PHASE 1: CHAT DEMO ------------------ */}
      <section id="chat-demo" className="py-12 md:py-24 bg-gray-50 relative overflow-hidden" ref={chatSectionRef}>
        <div className="container mx-auto px-4 relative z-10">
          <ChatDemo sectionRef={chatSectionRef} />
        </div>
      </section>

      {/* -------------------- PHASE 2: TASK GENERATION --------------- */}
      <section id="task-generation" className="py-12 md:py-24 bg-white relative overflow-hidden" ref={taskSectionRef}>
        <div className="container mx-auto px-4 relative z-10">
          <TaskGenerationAnimation sectionRef={taskSectionRef} />
                </div>
      </section>

      {/* -------------------- PHASE 3: TASK EXECUTION ---------------- */}
      <section id="task-execution" className="py-12 md:py-24 bg-gray-50 relative overflow-hidden" ref={taskExecutionRef}>
        <div className="container mx-auto px-4 relative z-10">
          <TaskExecutionDemo sectionRef={taskExecutionRef} />
        </div>
      </section>

      {/* -------------------- PHASE 4: FEEDBACK LOOP ----------------- */}
      <section id="feedback-loop" className="py-12 md:py-24 bg-white relative overflow-hidden" ref={feedbackSectionRef}>
        <div className="container mx-auto px-4 relative z-10">
          <FeedbackLoopDemo sectionRef={feedbackSectionRef} />
        </div>
      </section>

      {/* --------------------------- HOW IT WORKS ------------------------ */}
      <section id="how-it-works" className="py-12 md:py-24 bg-white relative overflow-hidden">
        <FloatingGeometricShapes variant="default" />

        <div className="container mx-auto px-4 relative z-10">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Your Simplified Legal Journey
          </h2>
          <div className="grid gap-8 md:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
              className="rounded-xl bg-white p-6 text-center shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border border-gray-100"
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="mb-2 font-semibold">Tell Us Your Case</h3>
              <p className="text-sm text-gray-600">
                15-minute chat to understand your situation
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-white p-6 text-center shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border border-gray-100"
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-pink-100 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-pink-500" />
          </div>
              <h3 className="mb-2 font-semibold">Receive Tasks</h3>
              <p className="text-sm text-gray-600">
                Personalized list of actions to complete
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-xl bg-white p-6 text-center shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border border-gray-100"
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-purple-500" />
        </div>
              <h3 className="mb-2 font-semibold">Execute & Track</h3>
              <p className="text-sm text-gray-600">
                Complete tasks with our step-by-step guidance
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="rounded-xl bg-white p-6 text-center shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border border-gray-100"
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="mb-2 font-semibold">Monitor Progress</h3>
              <p className="text-sm text-gray-600">
                Track the status of your appeal
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --------------------------- TESTIMONIALS -------------------- */}
      <section id="testimonials" className="py-12 md:py-24 bg-gray-50 relative overflow-hidden">
        <FloatingGeometricShapes variant="light" />
        
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="mb-12 text-center text-3xl font-bold">Real Results from Our Users</h2>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
        </div>
              <blockquote className="text-gray-700 mb-4">
                "Clamo guided me step by step through my appeal. I won the case and recovered €850 in unfair fines."
              </blockquote>
              <cite className="text-sm font-semibold text-gray-900">Marco Rossi</cite>
              <p className="text-xs text-gray-500">Entrepreneur, Milan</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-gray-700 mb-4">
                "Finally a clear and simple system. I saved €1500 in lawyer fees and got justice."
            </blockquote>
              <cite className="text-sm font-semibold text-gray-900">Laura Bianchi</cite>
              <p className="text-xs text-gray-500">Shop Owner, Rome</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-gray-700 mb-4">
                "Perfect documentation and deadlines met. The system was crucial to winning my appeal."
            </blockquote>
              <cite className="text-sm font-semibold text-gray-900">Giuseppe Verdi</cite>
              <p className="text-xs text-gray-500">Freelancer, Naples</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ----------------------------- FAQ --------------------------- */}
      <section id="faq" className="py-12 md:py-24 bg-white relative overflow-hidden">
        <FloatingGeometricShapes variant="default" />
        
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="mb-12 text-center text-3xl font-bold">FAQ</h2>
          <div className="mx-auto max-w-3xl space-y-4">
            <details className="group rounded-lg border bg-white p-6 hover:shadow-md transition-shadow">
              <summary className="flex cursor-pointer justify-between font-semibold">
                <span>How does Clamo work for Giudice di Page appeals?</span>
                <ChevronRight className="transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-4 text-gray-700">
                Clamo is specifically designed for Giudice di Page appeals. We don't provide legal advice, but 
                guide you through <strong>standardized procedures</strong> with pre-filled documents, clear deadlines 
                and step-by-step instructions. The system knows all Italian Giudice di Page courts and tells you exactly 
                where to go and what to do.
              </p>
            </details>
            <details className="group rounded-lg border bg-white p-6 hover:shadow-md transition-shadow">
              <summary className="flex cursor-pointer justify-between font-semibold">
                <span>What types of disputes can I handle?</span>
                <ChevronRight className="transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-4 text-gray-700">
                You can handle disputes over movable property up to €1,100 (art. 316 c.p.c.) and oppositions to administrative 
                sanctions (fines, tickets). Each case receives personalized tasks: appeal preparation, 
                document filing, notifications, fee payments. Each task includes templates, precise addresses 
                and deadlines to meet.
              </p>
            </details>
            <details className="group rounded-lg border bg-white p-6 hover:shadow-md transition-shadow">
              <summary className="flex cursor-pointer justify-between font-semibold">
                <span>How long does it take to complete an appeal?</span>
                <ChevronRight className="transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-4 text-gray-700">
                Initial preparation takes about 30 minutes of chat. Filing the appeal typically happens 
                within 7-10 days. Total times depend on the court: generally 60 days 
                for notification, then 3-6 months for the hearing. We accompany you at every stage with reminders 
                and clear deadlines.
              </p>
            </details>
            <details className="group rounded-lg border bg-white p-6 hover:shadow-md transition-shadow">
              <summary className="flex cursor-pointer justify-between font-semibold">
                <span>Can I use Clamo without legal experience?</span>
                <ChevronRight className="transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-4 text-gray-700">
                Absolutely! Clamo is designed for those without legal experience. Every step is explained 
                in simple language, with practical examples and pre-filled templates. You don't need to know 
                the procedure code: we tell you exactly what to write, where to go, what to bring. 
                It's like having an expert guide always with you.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* ------------------------- PRICING --------------------------- */}
      <section id="pricing" className="py-12 md:py-24 bg-gray-50 relative overflow-hidden">
        <FloatingGeometricShapes variant="light" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Start free and upgrade to the full plan when you want. No hidden costs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-gray-300">
                <CardHeader className="pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="secondary" className="text-sm font-semibold">
                      BASIC
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">€0</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600 mt-2">Perfect to get started</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">1 active case</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Basic documents</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Task tracking</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Email reminders</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="h-5 w-5 text-gray-300 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-400">Advanced templates</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="h-5 w-5 text-gray-300 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-400">Priority support</span>
                    </li>
                  </ul>
                  <div className="pt-6">
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        const heroSection = document.getElementById('hero')
                        heroSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                    >
                      Start Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-orange-50 opacity-50" />
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 border-purple-200 hover:border-purple-300 relative overflow-hidden">
                <CardHeader className="pb-8 relative">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-sm font-semibold">
                      COMPLETE
                    </Badge>
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Premium</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">€29</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600 mt-2">For those who want maximum support</p>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700"><strong>Unlimited cases</strong></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">All document templates</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700"><strong>Unlimited</strong> document uploads</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Personalized AI assistance</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Complete template library</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Priority email support</span>
                    </li>
                  </ul>
                  <div className="pt-6">
                    <Button 
                      className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                      onClick={() => {
                        const heroSection = document.getElementById('hero')
                        heroSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                    >
                      Start Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Ultra Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-gray-300 bg-gray-900 text-white">
                <CardHeader className="pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="secondary" className="bg-gray-700 text-gray-200 border-gray-600 text-sm font-semibold">
                      LAW FIRM
                    </Badge>
                    <Rocket className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Professional</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">Custom</span>
                  </div>
                  <p className="text-gray-400 mt-2">For firms and professionals</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Everything in Premium</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Multi-client management</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Dedicated dashboard</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Brand customization</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">API access</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Dedicated account manager</span>
                    </li>
                  </ul>
                  <div className="pt-6">
                    <Button 
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                      onClick={() => {
                      }}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Contact Sales
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600">
              All plans include a 7-day free trial. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------- FINAL CTA ------------------------- */}
      <section className="py-12 md:py-24 text-white bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,white_0%,transparent_70%)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Left Column - CTA */}
            <div className="text-center lg:text-left">
              <h2 className="mb-6 text-3xl md:text-4xl font-bold">
                Ready to Defend Yourself?
              </h2>
              <p className="mb-10 max-w-xl text-lg md:text-xl opacity-95">
                Join hundreds of citizens who have obtained justice without a lawyer. 
                Start free today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="rounded-full bg-white px-10 py-6 text-purple-700 hover:bg-gray-50 shadow-xl font-semibold transform hover:scale-105 transition-all"
                  onClick={() => {
                    const heroSection = document.getElementById('hero')
                    heroSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  Start Your Appeal
                  <ArrowRight className="ml-2" />
                </Button>
              </div>
              <p className="mt-4 text-sm opacity-80">
                No card required • Free trial
              </p>
            </div>

            {/* Right Column - Contact */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Have Questions?</h3>
                    <p className="text-sm opacity-90">Let's talk about your case</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <p className="text-white/90">
                    If you have questions about how it works, costs, or how Clamo can help with your specific case – we're here to help.
                  </p>
                  
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2 text-white/80">Reach out directly:</p>
                    <a
                      href=""
                      className="inline-flex items-center gap-2 text-white font-medium hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      supporto@clamo.legal
                    </a>
                  </div>

                  <div className="pt-4 border-t border-white/20">
                    <p className="text-sm text-white/70">
                      Typical response time: within 24 hours
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------- FOOTER --------------------------- */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4">
            <span className="text-xl font-extrabold tracking-tight text-white">
              Clamo<span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">.legal</span>
            </span>
          </div>
          <div className="mb-4 space-x-6">
            <Link href="/privacy-policy" className="text-sm hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="text-sm hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <a href="https://clamo.lovable.app/" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white transition-colors">
              Blog
            </a>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Clamo Legal. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ----------------------- GLOBAL STYLES ----------------------- */}
      <style jsx global>{`
        /* smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* floating animation */
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(5deg); }
          66% { transform: translateY(10px) rotate(-5deg); }
        }
        
        /* slow floating animation for geometric shapes */
        @keyframes float-slow {
          0%, 100% { 
            transform: translateY(0) translateX(0) rotate(0deg); 
          }
          25% { 
            transform: translateY(-30px) translateX(10px) rotate(5deg); 
          }
          50% { 
            transform: translateY(15px) translateX(-5px) rotate(-3deg); 
          }
          75% { 
            transform: translateY(-10px) translateX(-10px) rotate(2deg); 
          }
        }
        
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 30s ease-in-out infinite;
        }
      `}</style>
    </TooltipProvider>
  )
} 