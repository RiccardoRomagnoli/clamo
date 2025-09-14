'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProductChat } from '~/components/ProductChat'
import { Card } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { CheckCircle, ArrowRight, Circle, X, Sparkles } from 'lucide-react'
import type { ChatMessage } from '~/server/api/routers/chat'

type Progress = {
  caseTypeSelected: boolean
  factsCollected: boolean
  partiesCollected: boolean
  evidenceCollected: boolean
  procedureConfirmed: boolean
  currentFocus: string
}

interface ChatPageClientProps {
  chatId: string
  initialChat: {
    id: string
    initial_message: string | null
    completed: boolean
    case: {
      id: string
      title: string | null
      summary: string | null
    } | null
  }
  initialMessages: ChatMessage[]
  initialProgress: Progress
}

export function ChatPageClient({ 
  chatId, 
  initialChat,
  initialMessages,
  initialProgress 
}: ChatPageClientProps) {
  const router = useRouter()
  const [chatCompleted, setChatCompleted] = useState(initialChat.completed)
  const [progress, setProgress] = useState<Progress>(initialProgress)
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false)

  const handleChatComplete = (completed: boolean) => {
    setChatCompleted(completed)
    if (completed && !chatCompleted) {
      // Show overlay when chat just completed
      setShowCompletionOverlay(true)
    }
  }

  const handleProgress = (newProgress: Progress) => {
    setProgress(newProgress)
  }

  const startCase = () => {
    router.push('/dashboard')
  }

  const progressItems = useMemo(() => [
    {
      key: 'caseTypeSelected',
      label: 'Case Type Selection',
      description: 'Identify the type of legal dispute',
      completed: progress.caseTypeSelected,
    },
    {
      key: 'factsCollected',
      label: 'Facts & Circumstances',
      description: 'Gather details about what happened',
      completed: progress.factsCollected,
    },
    {
      key: 'partiesCollected',
      label: 'Parties Involved',
      description: 'Identify all parties in the dispute',
      completed: progress.partiesCollected,
    },
    {
      key: 'evidenceCollected',
      label: 'Evidence & Documents',
      description: 'Collect supporting evidence and documents',
      completed: progress.evidenceCollected,
    },
    {
      key: 'procedureConfirmed',
      label: 'Legal Procedure',
      description: 'Confirm the legal process and next steps',
      completed: progress.procedureConfirmed,
    },
  ], [progress])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                Clamo Legal Discovery
              </h1>
              <p className="text-gray-600 mt-1">
                {chatCompleted 
                  ? 'Case analysis complete!' 
                  : `Currently focusing on: ${progress.currentFocus}`
                }
              </p>
            </div>
            {chatCompleted && (
              <Button 
                onClick={startCase}
                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
              >
                View Case Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Section */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden shadow-lg">
              <ProductChat
                chatId={chatId}
                initialChat={initialChat}
                initialMessages={initialMessages}
                onComplete={handleChatComplete}
                onProgress={handleProgress}
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Legal Case Discovery Progress
              </h3>
              <div className="space-y-4">
                {progressItems.map((item, index) => {
                  const isCompleted = item.completed
                  const isCurrentStep = !isCompleted && progressItems.slice(0, index).every(prevItem => prevItem.completed)
                  
                  return (
                    <div key={item.key} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : isCurrentStep ? (
                          <div className="w-5 h-5 rounded-full border-2 border-orange-500 bg-orange-100 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                          </div>
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      <div className={`flex-1 ${
                        isCompleted 
                          ? 'text-green-600' 
                          : isCurrentStep 
                            ? 'text-orange-600' 
                            : 'text-gray-400'
                      }`}>
                        <div className={`text-sm font-medium ${
                          isCurrentStep ? 'font-semibold' : ''
                        }`}>
                          {item.label}
                          {isCurrentStep && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {chatCompleted && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Analysis Complete!</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ready to create your legal case
                  </p>
                </div>
              )}
            </Card>

            {/* What happens next */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• Gather comprehensive case details</p>
                <p>• Identify the correct legal procedure</p>
                <p>• Find the competent court</p>
                <p>• Generate personalized legal tasks</p>
                <p>• Track deadlines and case progress</p>
              </div>
            </Card>

            {/* Current Focus */}
            {!chatCompleted && (
              <Card className="p-6 bg-gradient-to-br from-orange-50 to-purple-50 border-orange-200">
                <h3 className="font-semibold text-gray-900 mb-2">Current Focus</h3>
                <p className="text-sm text-gray-700 capitalize">
                  {progress.currentFocus}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Answer the questions to help us understand this area better
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Completion Overlay */}
      {showCompletionOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl mx-4">
            {/* Close button */}
            <button
              onClick={() => setShowCompletionOverlay(false)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
              aria-label="Close overlay"
            >
              <X className="h-8 w-8" />
            </button>

            {/* Content card */}
            <Card className="p-8 md:p-12 text-center shadow-2xl bg-gradient-to-br from-white to-gray-50 border-0">
              {/* Success icon */}
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center mb-6 shadow-lg">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>

              {/* Title */}
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-4">
                Case Analysis Complete!
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-700 mb-2 max-w-lg mx-auto">
                Now that we understand your case, we can start creating your legal documents and personalized tasks.
              </p>

              {/* What we'll do */}
              <div className="mt-8 mb-8 p-6 bg-gradient-to-r from-orange-50 to-purple-50 rounded-lg max-w-lg mx-auto">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                  What we'll help you with:
                </h3>
                <ul className="text-sm text-gray-700 space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>Generate legal documents tailored to your case</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>Create step-by-step tasks with clear instructions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>Identify the correct court and legal procedures</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>Track deadlines and manage your case progress</span>
                  </li>
                </ul>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={startCase}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white px-8 shadow-lg"
                >
                  Start Your Legal Case
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  onClick={() => setShowCompletionOverlay(false)}
                  size="lg"
                  variant="outline"
                  className="border-gray-300"
                >
                  Continue Chatting
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Simple footer links */}
      <div className="container mx-auto px-4 py-4 text-right">
        <div className="text-xs text-gray-400 space-x-4">
          <Link href="/privacy-policy" className="hover:text-gray-600 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms-and-conditions" className="hover:text-gray-600 transition-colors">
            Terms & Conditions
          </Link>
        </div>
      </div>
    </div>
  )
} 