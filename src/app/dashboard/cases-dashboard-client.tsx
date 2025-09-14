'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { useToast } from '~/components/ui/use-toast'
import { api } from '~/trpc/react'
import {
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
  Menu,
  FileText,
  Gavel,
  Calendar,
  Scale,
  RefreshCw,
  Download,
} from 'lucide-react'
import { cn } from '~/utils/tailwind'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { useIsMobile } from '~/hooks/use-mobile'
import { Skeleton } from '~/components/ui/skeleton'

interface CaseTask {
  id: string
  case_id: string
  title: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'not_relevant' | 'generating' | 'error'
  order_index?: number
  notes: string | null
  got_results: boolean
  due_date: string | Date | null
  metadata: Record<string, unknown> | null
  created_at: string | Date
  updated_at: string | Date
}

interface CaseDocument {
  id: string
  case_id: string
  file_name: string
  content_type: string
  size_bytes: number
  url: string | null
  category: string | null
  created_at: string | Date
}

interface CaseItem {
  id: string
  user_id: string
  type: 'BENI_MOBILI' | 'SANZIONI_AMMINISTRATIVE'
  title: string | null
  summary: string | null
  data: Record<string, unknown> | null
  stage: string
  completed: boolean
  created_at: string | Date
  updated_at: string | Date
  tasks: CaseTask[]
  documents: CaseDocument[]
}

interface DashboardClientProps {
  cases: CaseItem[]
  userData: Record<string, unknown>
}

export function CasesDashboardClient({ cases: initialCases }: DashboardClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const utils = api.useUtils()
  const isMobile = useIsMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(() => {
    const first = initialCases[0]
    if (!first) return null
    return {
      ...first,
      created_at: typeof first.created_at === 'string' ? first.created_at : first.created_at.toISOString(),
      updated_at: typeof first.updated_at === 'string' ? first.updated_at : first.updated_at.toISOString(),
      tasks: first.tasks.map(t => ({
        ...t,
        created_at: typeof t.created_at === 'string' ? t.created_at : t.created_at.toISOString(),
        updated_at: typeof t.updated_at === 'string' ? t.updated_at : t.updated_at.toISOString(),
        due_date: t.due_date ? (typeof t.due_date === 'string' ? t.due_date : t.due_date.toISOString()) : null,
      })),
    }
  })
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<CaseTask | null>(null)
  const [resultNotes, setResultNotes] = useState('')
  const [showTestButton, setShowTestButton] = useState(false)
  const [testClickCount, setTestClickCount] = useState(0)

  const { data: refreshedCases } = api.case.getAll.useQuery(undefined, { refetchInterval: 5000 })
  const { data: caseDocuments } = api.document.getCaseDocuments.useQuery(
    { caseId: selectedCase?.id || '' },
    { enabled: !!selectedCase?.id }
  )
  
  useEffect(() => {
    if (refreshedCases && selectedCase) {
      const updated = refreshedCases.find(c => c.id === selectedCase.id)
      if (updated) {
        setSelectedCase({
          ...updated,
          created_at: typeof updated.created_at === 'string' ? updated.created_at : updated.created_at.toISOString(),
          updated_at: typeof updated.updated_at === 'string' ? updated.updated_at : updated.updated_at.toISOString(),
          tasks: updated.tasks.map(t => ({
            ...t,
            created_at: typeof t.created_at === 'string' ? t.created_at : t.created_at.toISOString(),
            updated_at: typeof t.updated_at === 'string' ? t.updated_at : t.updated_at.toISOString(),
            due_date: t.due_date ? (typeof t.due_date === 'string' ? t.due_date : t.due_date.toISOString()) : null,
          })),
        })
      }
    }
  }, [refreshedCases, selectedCase?.id])

  const updateTaskMutation = api.task.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Task updated', description: 'Task status has been updated.' })
      utils.case.getAll.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const regenerateTasksMutation = api.case.regenerateTasks.useMutation({
    onSuccess: () => {
      toast({ title: 'Tasks regenerated', description: 'New tasks have been generated for this case.' })
      utils.case.getAll.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const generateRicorsoMutation = api.document.generateRicorso316.useMutation({
    onSuccess: () => {
      toast({ title: 'Document generated', description: 'Your ricorso has been generated successfully.' })
      utils.case.getAll.invalidate()
      utils.document.getCaseDocuments.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Generation failed', description: error.message, variant: 'destructive' })
    },
  })

  const getDownloadUrlMutation = api.document.getDownloadUrl.useMutation()

  const taskStats = useMemo(() => {
    if (!selectedCase) return { active: 0, pending: 0, completed: 0, currentTaskIndex: 0, sortedTasks: [] }
    const tasks = selectedCase.tasks
    
    // Sort tasks by order_index to determine current task
    const sortedTasks = [...tasks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    
    // Find current task: first non-completed and non-error task
    let currentTaskIndex = sortedTasks.findIndex(t => 
      t.status !== 'completed' && 
      t.status !== 'not_relevant' && 
      t.status !== 'error'
    )
    
    // If all tasks are completed, set to -1 to show completion message
    if (currentTaskIndex === -1 && sortedTasks.every(t => 
      t.status === 'completed' || 
      t.status === 'not_relevant' || 
      t.status === 'error'
    )) {
      currentTaskIndex = -1 // All tasks done
    }
    
    return {
      active: tasks.filter(t => t.status === 'active').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      currentTaskIndex,
      sortedTasks,
    }
  }, [selectedCase])


  const handleCompleteTask = async (task: CaseTask) => {
    await updateTaskMutation.mutateAsync({ taskId: task.id, status: 'completed' })
  }

  const handleAddResults = async () => {
    if (!selectedTask) return
    await updateTaskMutation.mutateAsync({ taskId: selectedTask.id, got_results: true, notes: resultNotes })
    setShowResultsModal(false)
    setResultNotes('')
    setSelectedTask(null)
  }

  const onDownload = async (documentId: string) => {
    const newTab = window.open('', '_blank', 'noopener,noreferrer')
    try {
      const data = await getDownloadUrlMutation.mutateAsync({ 
        documentId: documentId
      })
      if (data?.downloadUrl) {
        console.log('downloadUrl', data.downloadUrl)
        if (newTab) {
          newTab.location.href = data.downloadUrl
        } else {
          window.location.href = data.downloadUrl
        }
        toast({ 
          title: 'Download started', 
          description: `Downloading ${data.fileName}`,
          duration: 1000
        })
      } else {
        throw new Error('Missing download URL')
      }
    } catch (error) {
      if (newTab) newTab.close()
      toast({ 
        title: 'Download failed', 
        description: 'Could not download the document', 
        variant: 'destructive' 
      })
    }
  }

  if (initialCases.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-12 text-center">
          <Scale className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Start your first legal case</h1>
          <p className="text-gray-600 mb-6">Tell us about your situation to create a case and guided tasks.</p>
          <Button onClick={() => router.push('/chat')} className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700">
            <Plus className="h-4 w-4 mr-2" /> New Case
          </Button>
        </div>
      </div>
    )
  }

  const MobileCaseSelector = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle>Your Cases</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="space-y-2 pb-4">
            {(refreshedCases || initialCases).map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const c = refreshedCases?.find(p => p.id === item.id) || item
                  setSelectedCase({
                    ...c,
                    created_at: typeof c.created_at === 'string' ? c.created_at : new Date(c.created_at).toISOString(),
                    updated_at: typeof c.updated_at === 'string' ? c.updated_at : new Date(c.updated_at).toISOString(),
                    tasks: c.tasks.map(t => ({
                      ...t,
                      created_at: typeof t.created_at === 'string' ? t.created_at : new Date(t.created_at).toISOString(),
                      updated_at: typeof t.updated_at === 'string' ? t.updated_at : new Date(t.updated_at).toISOString(),
                      due_date: t.due_date ? (typeof t.due_date === 'string' ? t.due_date : new Date(t.due_date).toISOString()) : null,
                    })),
                  })
                  setMobileMenuOpen(false)
                }}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-all',
                  selectedCase?.id === item.id
                    ? 'bg-gradient-to-r from-orange-50 to-purple-50 border border-purple-200 shadow-sm'
                    : 'hover:bg-gray-50 border border-transparent'
                )}
              >
                <div className="font-medium text-gray-900">
                  {item.title || 'Untitled case'}
                </div>
                <div className="text-sm text-gray-500 mt-1 flex items-center justify-between">
                  <span>
                    {item.tasks.filter(t => t.status === 'active').length} active
                    {item.tasks.filter(t => t.status === 'pending').length > 0 && (
                      <span className="ml-1 text-orange-600">
                        • {item.tasks.filter(t => t.status === 'pending').length} pending
                      </span>
                    )}
                  </span>
                  {item.tasks.some(t => t.status === 'generating') && (
                    <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                  )}
                </div>
              </motion.button>
            ))}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                router.push('/chat')
                setMobileMenuOpen(false)
              }}
              className="w-full p-3 mt-4 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50/30 transition-all flex items-center justify-center gap-2 text-gray-500 hover:text-gray-600"
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">New Case</span>
            </motion.button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <MobileCaseSelector />
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                <span className="hidden sm:inline">Legal Dashboard</span>
                <span className="sm:hidden">Cases</span>
              </h1>
            </div>
            {/* Hidden area that reveals test button after 5 clicks */}
            <div 
              className="absolute top-4 right-16 sm:right-24 w-8 h-8 cursor-pointer"
              onClick={() => {
                setTestClickCount(prev => prev + 1)
                if (testClickCount >= 4) {
                  setShowTestButton(true)
                  toast({ title: 'Developer mode activated', description: 'Test button is now visible' })
                }
              }}
            />
            <div className="flex items-center gap-2 sm:gap-3">
              {showTestButton && selectedCase && (
                <Button
                  size={isMobile ? 'sm' : 'default'}
                  variant="outline"
                  onClick={() => regenerateTasksMutation.mutate({ caseId: selectedCase.id })}
                  disabled={regenerateTasksMutation.isPending}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  title="Regenerate tasks for testing"
                >
                  {regenerateTasksMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {!isMobile && <span className="ml-2">Test: Regenerate Tasks</span>}
                </Button>
              )}
              <Button
                size={isMobile ? 'sm' : 'default'}
                onClick={() => router.push('/chat')}
                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 hidden sm:inline-flex"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
              <Button
                size="icon"
                onClick={() => router.push('/chat')}
                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 sm:hidden"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
          <div className="hidden lg:block lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Cases</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="p-4 space-y-2">
                    {(refreshedCases || initialCases).map((item) => (
                      <motion.button
                        key={item.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const c = refreshedCases?.find(p => p.id === item.id) || item
                          setSelectedCase({
                            ...c,
                            created_at: typeof c.created_at === 'string' ? c.created_at : new Date(c.created_at).toISOString(),
                            updated_at: typeof c.updated_at === 'string' ? c.updated_at : new Date(c.updated_at).toISOString(),
                            tasks: c.tasks.map(t => ({
                              ...t,
                              created_at: typeof t.created_at === 'string' ? t.created_at : new Date(t.created_at).toISOString(),
                              updated_at: typeof t.updated_at === 'string' ? t.updated_at : new Date(t.updated_at).toISOString(),
                              due_date: t.due_date ? (typeof t.due_date === 'string' ? t.due_date : new Date(t.due_date).toISOString()) : null,
                            })),
                          })
                        }}
                        className={cn(
                          'w-full text-left p-3 rounded-lg transition-all',
                          selectedCase?.id === item.id
                            ? 'bg-gradient-to-r from-orange-50 to-purple-50 border border-purple-200 shadow-sm'
                            : 'hover:bg-gray-50 border border-transparent'
                        )}
                      >
                        <div className="font-medium text-gray-900">
                          {item.title || 'Untitled case'}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 flex items-center justify-between">
                          <span>
                            {item.tasks.filter(t => t.status === 'active').length} active
                            {item.tasks.filter(t => t.status === 'pending').length > 0 && (
                              <span className="ml-1 text-orange-600">
                                • {item.tasks.filter(t => t.status === 'pending').length} pending
                              </span>
                            )}
                          </span>
                          {item.tasks.some(t => t.status === 'generating') && (
                            <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                          )}
                        </div>
                      </motion.button>
                    ))}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push('/chat')}
                      className="w-full p-3 mt-4 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50/30 transition-all flex items-center justify-center gap-2 text-gray-500 hover:text-gray-600"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="font-medium">New Case</span>
                    </motion.button>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {selectedCase && (
              <>
                {isMobile && (
                  <Card className="lg:hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {selectedCase.title || 'Untitled case'}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {selectedCase.tasks.filter(t => t.status === 'active').length} active tasks
                            {selectedCase.tasks.filter(t => t.status === 'pending').length > 0 && (
                              <span className="ml-1 text-orange-600">
                                • {selectedCase.tasks.filter(t => t.status === 'pending').length} pending
                              </span>
                            )}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setMobileMenuOpen(true)}>
                          Switch Case
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <Card className="overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-orange-500 to-purple-600" />
                    <CardHeader className="pb-3 sm:pb-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg sm:text-xl pr-2 flex items-center gap-2">
                            <Gavel className="h-5 w-5 text-purple-600" />
                            {selectedCase.title || 'Untitled case'}
                          </CardTitle>
                          <CardDescription className="mt-1 sm:mt-2 text-sm">
                            {selectedCase.summary || 'No summary provided yet.'}
                          </CardDescription>
                          
                          {/* Case Information Chips */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" /> 
                              {selectedCase.type === 'BENI_MOBILI' ? 'Beni Mobili' : 'Sanzioni Amministrative'}
                            </Badge>
                            
                            {selectedCase.data && (
                              <>
                                {(selectedCase.data as any)?.disputeValue && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Scale className="h-3.5 w-3.5" />
                                    €{(selectedCase.data as any).disputeValue}
                                  </Badge>
                                )}
                                
                                {(selectedCase.data as any)?.parties?.defendant?.fullName && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    vs. {String((selectedCase.data as any).parties.defendant.fullName).length > 20 
                                      ? String((selectedCase.data as any).parties.defendant.fullName).substring(0, 20) + '...'
                                      : (selectedCase.data as any).parties.defendant.fullName}
                                  </Badge>
                                )}
                                
                                {(selectedCase.data as any)?.parties?.claimant?.city && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    📍 {(selectedCase.data as any).parties.claimant.city}
                                  </Badge>
                                )}
                                
                                {(selectedCase.data as any)?.notificationDate && (
                                  <Badge variant="outline" className="flex items-center gap-1 text-orange-700 border-orange-200">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Notified {format(new Date((selectedCase.data as any).notificationDate), 'MMM d, yyyy')}
                                  </Badge>
                                )}
                                
                                {(selectedCase.data as any)?.violationLocation?.city && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    📍 Violation: {(selectedCase.data as any).violationLocation.city}
                                  </Badge>
                                )}
                              </>
                            )}
                            
                            <Badge variant="outline" className="flex items-center gap-1 text-purple-700 border-purple-200">
                              Stage: {selectedCase.stage === 'preparation' ? 'Preparing' : selectedCase.stage}
                            </Badge>
                            
                            {selectedCase.completed && (
                              <Badge className="flex items-center gap-1 bg-green-100 text-green-700 border-green-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Generate/Download Document Button */}
                        <div className="flex flex-col gap-2">
                          {(() => {
                            // Check if there's a ricorso document for this case
                            const ricorsoDocument = caseDocuments?.find(doc => 
                              doc.category === 'ricorso_316' || 
                              doc.file_name.toLowerCase().includes('ricorso')
                            )
                            
                            if (ricorsoDocument) {
                              return (
                                <Button
                                  size="sm"
                                  onClick={() => onDownload(ricorsoDocument.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download Document
                                </Button>
                              )
                            }
                            
                            return (
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (selectedCase?.id) {
                                    generateRicorsoMutation.mutate({
                                      caseId: selectedCase.id,
                                      // taskId is optional, so we don't pass it
                                    })
                                  }
                                }}
                                disabled={generateRicorsoMutation.isPending}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                {generateRicorsoMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4 mr-1" />
                                )}
                                Generate Document
                              </Button>
                            )
                          })()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                        <SummaryStat icon={<Clock className="h-6 w-6 text-blue-600 mx-auto mb-1 sm:mb-2" />} label="Active" value={taskStats.active} bg="bg-blue-50" text="text-blue-900" />
                        <SummaryStat icon={<Clock className="h-6 w-6 text-orange-600 mx-auto mb-1 sm:mb-2" />} label="Pending" value={taskStats.pending} bg="bg-orange-50" text="text-orange-900" />
                        <SummaryStat icon={<CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1 sm:mb-2" />} label="Completed" value={taskStats.completed} bg="bg-green-50" text="text-green-900" />
                        <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg flex flex-col justify-center">
                          <Calendar className="h-6 w-6 text-purple-600 mx-auto mb-1 sm:mb-2" />
                          <div className="text-lg sm:text-2xl font-bold text-purple-900">
                            {format(new Date(selectedCase.created_at), 'MMM d')}
                          </div>
                          <div className="text-xs sm:text-sm opacity-80">
                            Created
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <div className="flex flex-col gap-3">
                      <div>
                        <CardTitle className="text-lg sm:text-xl">Legal Process</CardTitle>
                        <CardDescription className="text-sm mt-1">Follow these sequential steps to complete your case</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Progress Overview */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-700">Progress Overview</h3>
                        <span className="text-xs text-gray-500">
                          {taskStats.completed} of {selectedCase.tasks.length} steps completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <motion.div 
                          className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(taskStats.completed / selectedCase.tasks.length) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                      {/* Debug info */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-gray-500 mt-2">
                          Current task index: {taskStats.currentTaskIndex} | 
                          Active: {taskStats.active} | 
                          Pending: {taskStats.pending} | 
                          Completed: {taskStats.completed}
                        </div>
                      )}
                    </div>

                    {/* Task Progress Line */}
                    <div className="space-y-6">
                      {taskStats.sortedTasks?.map((task, index) => {
                        const isCompleted = task.status === 'completed'
                        const isCurrent = index === taskStats.currentTaskIndex && !isCompleted && !task.status.includes('error')
                        const isUpcoming = index > taskStats.currentTaskIndex && !isCompleted
                        const isGenerating = task.status === 'generating'
                        
                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative"
                          >
                            {/* Progress Line Connector */}
                            {index < taskStats.sortedTasks.length - 1 && (
                              <div className="absolute left-6 top-16 w-0.5 h-16 bg-gray-200">
                                {isCompleted && (
                                  <motion.div
                                    className="w-full bg-green-500"
                                    initial={{ height: 0 }}
                                    animate={{ height: '100%' }}
                                    transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                                  />
                                )}
                              </div>
                            )}
                            
                            {/* Task Card */}
                            <div className="flex items-start gap-4">
                              {/* Step Indicator */}
                              <motion.div 
                                className={cn(
                                  "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                                  isCompleted && "bg-green-500 border-green-500 text-white",
                                  isCurrent && "bg-blue-500 border-blue-500 text-white animate-pulse",
                                  isGenerating && "bg-purple-500 border-purple-500 text-white",
                                  isUpcoming && "bg-gray-100 border-gray-300 text-gray-500"
                                )}
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-6 h-6" />
                                ) : isGenerating ? (
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                  index + 1
                                )}
                              </motion.div>
                              
                              {/* Task Content */}
                              <div className="flex-1 min-w-0">
                                <TaskCard
                                  task={task}
                                  onComplete={isCurrent && !isGenerating ? () => handleCompleteTask(task) : undefined}
                                  onAddResults={isCompleted && !task.got_results ? () => { setSelectedTask(task); setResultNotes(task.notes || ''); setShowResultsModal(true) } : undefined}
                                  onGenerateRicorso={() => {
                                    if (selectedCase?.id) {
                                      generateRicorsoMutation.mutate({
                                        caseId: selectedCase.id,
                                        taskId: task.id,
                                      })
                                    }
                                  }}
                                  isGeneratingRicorso={generateRicorsoMutation.isPending}
                                  isCurrentTask={isCurrent}
                                  isUpcomingTask={isUpcoming}
                                  isCompleted={isCompleted}
                                  stepNumber={index + 1}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                      
                      {/* Completion Message */}
                      {taskStats.currentTaskIndex === -1 && taskStats.sortedTasks.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }} 
                          animate={{ opacity: 1, scale: 1 }} 
                          className="text-center py-8 bg-green-50 rounded-lg border border-green-200"
                        >
                          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                          <h3 className="text-2xl font-bold text-green-900 mb-2">Case Complete! 🎉</h3>
                          <p className="text-green-700">Congratulations! You've completed all the steps for your legal case.</p>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Documents Section */}
                {caseDocuments && caseDocuments.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3 sm:pb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg sm:text-xl">Documents</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            All files uploaded during chat and generated legal documents
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-sm">
                          {caseDocuments.length} {caseDocuments.length === 1 ? 'file' : 'files'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {caseDocuments.map((doc) => {
                          // Determine document type and icon
                          const getDocumentTypeInfo = (category: string | null, fileName: string) => {
                            if (category === 'ricorso_316' || fileName.toLowerCase().includes('ricorso')) {
                              return { 
                                icon: <Gavel className="h-5 w-5 text-purple-600" />, 
                                label: 'Legal Document',
                                bgColor: 'bg-purple-50',
                                borderColor: 'border-purple-200'
                              }
                            }
                            if (category === 'chat_upload') {
                              return { 
                                icon: <FileText className="h-5 w-5 text-blue-600" />, 
                                label: 'Uploaded File',
                                bgColor: 'bg-blue-50',
                                borderColor: 'border-blue-200'
                              }
                            }
                            // Default for other documents
                            return { 
                              icon: <FileText className="h-5 w-5 text-gray-500" />, 
                              label: category || 'Document',
                              bgColor: 'bg-gray-50',
                              borderColor: 'border-gray-200'
                            }
                          }

                          const typeInfo = getDocumentTypeInfo(doc.category, doc.file_name)

                          return (
                            <motion.div
                              key={doc.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors border ${typeInfo.bgColor} ${typeInfo.borderColor}`}
                            >
                              <div className="flex items-center gap-3">
                                {typeInfo.icon}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                                    <Badge variant="outline" className="text-xs">
                                      {typeInfo.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {(doc.size_bytes / 1024).toFixed(1)} KB • 
                                    {format(new Date(doc.created_at), 'MMM d, yyyy')}
                                    {(doc.metadata as any)?.source && (
                                      <span className="ml-1">• {(doc.metadata as any).source === 'chat_upload' ? 'Chat Upload' : 'Auto Generated'}</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDownload(doc.id)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results Modal */}
      <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
        <DialogContent className="w-[95vw] max-w-lg sm:w-full">
          <DialogHeader>
            <DialogTitle>Add Task Results</DialogTitle>
            <DialogDescription>Great job! Share your results or notes for future reference.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="results">What results did you get?</Label>
              <Textarea id="results" placeholder="Add outcomes, costs, or anything important..." value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} className="min-h-[100px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultsModal(false)}>Skip</Button>
            <Button onClick={handleAddResults} disabled={!resultNotes.trim() || updateTaskMutation.isPending} className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700">
              {updateTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-4 text-left">
        <div className="text-xs text-gray-400 space-x-4">
          <Link href="/privacy-policy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
          <Link href="/terms-and-conditions" className="hover:text-gray-600 transition-colors">Terms & Conditions</Link>
        </div>
      </div>
    </div>
  )
}

function SummaryStat({ icon, label, value, bg, text }: { icon: React.ReactNode; label: string; value: number | string; bg: string; text: string }) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} className={cn('text-center p-3 sm:p-4 rounded-lg cursor-pointer transition-all hover:shadow-md', bg)}>
      {icon}
      <div className={cn('text-lg sm:text-2xl font-bold', text)}>{value}</div>
      <div className="text-xs sm:text-sm opacity-80">{label}</div>
    </motion.div>
  )
}

function TaskCard({
  task,
  onComplete,
  onAddResults,
  onGenerateRicorso,
  isGeneratingRicorso,
  isCurrentTask,
  isUpcomingTask,
  isCompleted,
  stepNumber,
}: {
  task: CaseTask
  onComplete?: () => void
  onAddResults?: () => void
  onGenerateRicorso?: () => void
  isGeneratingRicorso?: boolean
  isCurrentTask?: boolean
  isUpcomingTask?: boolean
  isCompleted?: boolean
  stepNumber?: number
}) {

  const { toast } = useToast()
  const getDownloadUrlMutation = api.document.getDownloadUrl.useMutation()

  const onDownload = async (documentId: string) => {
    const newTab = window.open('', '_blank', 'noopener,noreferrer')
    try {
      const data = await getDownloadUrlMutation.mutateAsync({ 
        documentId: documentId
      })
      if (data?.downloadUrl) {
        console.log('downloadUrl', data.downloadUrl)
        if (newTab) {
          newTab.location.href = data.downloadUrl
        } else {
          window.location.href = data.downloadUrl
        }
        toast({ 
          title: 'Download started', 
          description: `Downloading ${data.fileName}`,
          duration: 1000
        })
      } else {
        throw new Error('Missing download URL')
      }
    } catch (error) {
      if (newTab) newTab.close()
      toast({ 
        title: 'Download failed', 
        description: 'Could not download the document', 
        variant: 'destructive' 
      })
    }
  }

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
      case 'active':
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
      case 'pending':
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
      case 'not_relevant':
        return <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-gray-400" />
      case 'error':
        return <AlertIcon />
      case 'generating':
        return <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
    }
  }

  // Show skeleton loader for generating tasks
  if (task.status === 'generating') {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5 }}
      >
        <Card className="transition-all border-purple-200 bg-purple-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-1 space-y-2 sm:space-y-3">
                <div>
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6 mt-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs sm:text-sm">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const getCardClassName = () => {
    let baseClass = 'transition-all'
    
    if (isCurrentTask) {
      baseClass += ' border-blue-300 bg-blue-50/50 shadow-lg ring-2 ring-blue-200'
    } else if (isUpcomingTask) {
      baseClass += ' border-gray-200 bg-gray-50/50 opacity-70'
    } else if (isCompleted) {
      baseClass += ' border-green-200 bg-green-50/30'
    } else if (task.status === 'not_relevant') {
      baseClass += ' opacity-60'
    } else if (task.status === 'error') {
      baseClass += ' border-red-200 bg-red-50/30'
    } else if (task.status === 'generating') {
      baseClass += ' border-purple-200 bg-purple-50/30'
    }
    
    return baseClass
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: isUpcomingTask ? 1.01 : 1.02 }} 
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      layout
    >
      <Card className={cn(getCardClassName())}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <motion.div className="mt-0.5 sm:mt-1" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
              {getStatusIcon()}
            </motion.div>
            <div className="flex-1 space-y-2 sm:space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <h4 className={cn("font-semibold text-sm sm:text-base leading-tight", 
                      isCurrentTask ? "text-blue-900" : 
                      isUpcomingTask ? "text-gray-600" : 
                      isCompleted ? "text-green-800" : "text-gray-900"
                    )}>
                      {task.title}
                    </h4>
                    <p className={cn("text-xs sm:text-sm mt-1 leading-relaxed", 
                      isCurrentTask ? "text-blue-700" :
                      isUpcomingTask ? "text-gray-500" : 
                      isCompleted ? "text-green-700" : "text-gray-600"
                    )}>
                      {task.description}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {isCurrentTask && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, delay: 0.2 }}
                      >
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs animate-pulse whitespace-nowrap">
                          ▶ Current Step
                        </Badge>
                      </motion.div>
                    )}
                    {isUpcomingTask && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
                      >
                        <Badge variant="outline" className="text-gray-500 border-gray-300 text-xs whitespace-nowrap">
                          Upcoming
                        </Badge>
                      </motion.div>
                    )}
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
                      >
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs whitespace-nowrap">
                          ✓ Complete
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Debug: Show actual status */}
                {process.env.NODE_ENV === 'development' && (
                  <Badge variant="outline" className="text-xs opacity-50">
                    Status: {task.status}
                  </Badge>
                )}
                {task.got_results && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs sm:text-sm">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Results noted
                  </Badge>
                )}
                {task.status === 'error' && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-xs sm:text-sm">Failed</Badge>
                )}
                {task.due_date && (
                  <Badge variant="outline" className="text-xs sm:text-sm"><Calendar className="h-3 w-3 mr-1" /> Due {format(new Date(task.due_date), 'MMM d')}</Badge>
                )}
              </div>

              {task.got_results && task.notes && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs sm:text-sm text-green-800"><strong>Results:</strong> {task.notes}</p>
                </motion.div>
              )}

              {task.notes && task.status === 'not_relevant' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-2 sm:p-3 bg-gray-100 rounded-lg border border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-700"><strong>Reason:</strong> {task.notes}</p>
                </motion.div>
              )}

              {/* Enhanced Information Display - Only show for current task */}
              {isCurrentTask && Array.isArray((task.metadata as any)?.detailed_instructions) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="pt-3"
                >
                  <div className="text-xs font-medium text-blue-800 mb-2 flex items-center gap-1">
                    📋 Step-by-step Instructions
                  </div>
                  <ol className="list-decimal pl-5 space-y-1.5 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    {((task.metadata as any).detailed_instructions as string[]).map((instruction, idx) => (
                      <li key={idx} className="text-xs text-blue-700 leading-relaxed">{instruction}</li>
                    ))}
                  </ol>
                </motion.div>
              )}

              {/* Payment Information - Only show for current task */}
              {isCurrentTask && (task.metadata as any)?.payment_info && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="pt-2 p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="text-xs font-medium text-green-800 mb-2 flex items-center gap-1">
                    💳 Payment Information
                  </div>
                  <div className="space-y-1 text-xs text-green-700">
                    {(task.metadata as any).payment_info.online_url && (
                      <div>
                        <strong>Online:</strong>{' '}
                        <a 
                          href={(task.metadata as any).payment_info.online_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-green-900 font-medium"
                        >
                          Click here to pay online
                        </a>
                      </div>
                    )}
                    {(task.metadata as any).payment_info.iban && (
                      <div><strong>IBAN:</strong> <code className="bg-white px-1 rounded text-xs">{(task.metadata as any).payment_info.iban}</code></div>
                    )}
                    {(task.metadata as any).payment_info.beneficiary && (
                      <div><strong>Beneficiary:</strong> {(task.metadata as any).payment_info.beneficiary}</div>
                    )}
                    {(task.metadata as any).payment_info.causale && (
                      <div><strong>Payment reason:</strong> {(task.metadata as any).payment_info.causale}</div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Court Information - Only show for current task */}
              {isCurrentTask && (task.metadata as any)?.court_info && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="pt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg"
                >
                  <div className="text-xs font-medium text-purple-800 mb-2 flex items-center gap-1">
                    🏛️ Court Information
                  </div>
                  <div className="space-y-1 text-xs text-purple-700">
                    {(task.metadata as any).court_info.name && (
                      <div><strong>Name:</strong> {(task.metadata as any).court_info.name}</div>
                    )}
                    {(task.metadata as any).court_info.address && (
                      <div><strong>Address:</strong> {(task.metadata as any).court_info.address}</div>
                    )}
                    {(task.metadata as any).court_info.phone && (
                      <div><strong>Phone:</strong> {(task.metadata as any).court_info.phone}</div>
                    )}
                    {(task.metadata as any).court_info.email && (
                      <div><strong>Email:</strong> {(task.metadata as any).court_info.email}</div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Notification Information - Only show for current task */}
              {isCurrentTask && (task.metadata as any)?.notification_info && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="pt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"
                >
                  <div className="text-xs font-medium text-indigo-800 mb-2 flex items-center gap-1">
                    📨 Notification Services
                  </div>
                  <div className="space-y-1 text-xs text-indigo-700">
                    {(task.metadata as any).notification_info.unep_url && (
                      <div>
                        <strong>UNEP Online:</strong>{' '}
                        <a 
                          href={(task.metadata as any).notification_info.unep_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-indigo-900 font-medium"
                        >
                          Click here for online notification
                        </a>
                      </div>
                    )}
                    {(task.metadata as any).notification_info.alternative && (
                      <div><strong>Alternative:</strong> {(task.metadata as any).notification_info.alternative}</div>
                    )}
                  </div>
                </motion.div>
              )}

              {Array.isArray((task.metadata as any)?.checklist) && (
                <div className="pt-2">
                  <div className="text-xs font-medium text-gray-700 mb-2">Quick Checklist</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {((task.metadata as any).checklist as string[]).map((item, idx) => (
                      <li key={idx} className="text-xs text-gray-600">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Show download button for other linked documents */}
              {(task.metadata as any)?.linkedDocumentId && !(task.title.includes('ricorso') || task.title.includes('Ricorso')) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="pt-2"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(task.metadata?.linkedDocumentId)}
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Document
                  </Button>
                </motion.div>
              )}

              {isCurrentTask && onComplete && (
                <motion.div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Button size="sm" onClick={onComplete} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 w-full sm:w-auto">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Mark as Complete
                  </Button>
                </motion.div>
              )}

              {isUpcomingTask && (
                <motion.div className="pt-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 text-center">
                    ⏳ Complete the previous steps to unlock this task
                  </div>
                </motion.div>
              )}

              {task.status === 'completed' && !task.got_results && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Button size="sm" variant="outline" onClick={onAddResults} className="border-green-200 text-green-700 hover:bg-green-50 w-full sm:w-auto">
                    Add Results
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function AlertIcon() {
  return <svg className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M21 20H3L12 4z"/></svg>
}


