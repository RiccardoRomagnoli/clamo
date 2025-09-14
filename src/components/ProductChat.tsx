'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Send, Loader2, User, Paperclip, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { cn } from '~/utils/tailwind'
import { api } from '~/trpc/react'
import { ChatMessage } from '~/server/api/routers/chat'

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  id: string
  metadata?: {
    type?: string
    fileName?: string
    s3Key?: string
    contentType?: string
    sizeBytes?: number
    category?: string
    documentId?: string | null
  }
}

// Define proper type for progress
type Progress = {
  caseTypeSelected: boolean
  factsCollected: boolean
  partiesCollected: boolean
  evidenceCollected: boolean
  procedureConfirmed: boolean
  currentFocus: string
}

interface ProductChatProps {
  chatId: string
  initialChat?: {
    id: string
    initial_message: string | null
    completed: boolean
    case: {
      id: string
      title: string | null
      summary: string | null
    } | null
  }
  initialMessages?: ChatMessage[]
  onComplete?: (completed: boolean) => void
  onProgress?: (progress: Progress) => void
}

export function ProductChat({ 
  chatId,
  initialChat,
  initialMessages = [],
  onComplete,
  onProgress
}: ProductChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages as Message[])
  const [input, setInput] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [optimisticMessageId, setOptimisticMessageId] = useState<string | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { file: File; progress: number; error?: string }>>(new Map())
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  
  // Only fetch chat data if not provided via SSR
  const { data: chat } = api.chat.getById.useQuery(
    { id: chatId },
    { 
      enabled: !initialChat,
      initialData: initialChat ? {
        ...initialChat,
        user_id: '', // These fields aren't needed in the client
        created_at: new Date(),
        updated_at: new Date(),
        chat_history: initialMessages,
        progress: {}
      } : undefined
    }
  )
  
  // Upload mutations
  const getUploadUrlMutation = api.chat.getUploadUrl.useMutation()
  const attachDocumentMutation = api.chat.attachDocument.useMutation()
  const uploadDocumentMutation = api.chat.uploadDocument.useMutation()
  
  // Send message mutation
  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      // Replace optimistic messages with actual response
      setMessages(data.messages as Message[])
      setOptimisticMessageId(null)
      
      // Pass progress and completion status to parent with proper type checking
      if (data.progress && typeof data.progress === 'object') {
        const typedProgress = data.progress as Progress
        // Validate progress structure
        if (
          'caseTypeSelected' in typedProgress &&
          'factsCollected' in typedProgress &&
          'partiesCollected' in typedProgress &&
          'evidenceCollected' in typedProgress &&
          'procedureConfirmed' in typedProgress &&
          'currentFocus' in typedProgress
        ) {
          onProgress?.(typedProgress)
        }
      }
      
      if (typeof data.completed === 'boolean') {
        onComplete?.(data.completed)
      }
    },
    onError: (error) => {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessageId))
      setOptimisticMessageId(null)
    }
  })
  
  // Handle initial message if present
  useEffect(() => {
    const chatData = initialChat || chat
    if (chatData && !isInitialized && messages.length === 0) {
      // If there's an initial message but no AI response yet, get AI response
      if (chatData.initial_message && messages.length === 0) {
        console.log('Found initial user message, getting AI response...')
        const initialUserMessage = chatData.initial_message
        
        // Add optimistic user message
        const optimisticId = `optimistic-${Date.now()}`
        setOptimisticMessageId(optimisticId)
        setMessages([{
          role: 'user',
          content: initialUserMessage,
          id: optimisticId
        }])
        
        sendMessageMutation.mutate({
          chatId,
          message: initialUserMessage,
        })
      }
      
      setIsInitialized(true)
    }
  }, [chat, initialChat, isInitialized, chatId, messages.length, sendMessageMutation])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages])

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto'
      // Set height to scrollHeight, but constrained by min/max
      const scrollHeight = textareaRef.current.scrollHeight
      const minHeight = 56 // ~2 lines
      const maxHeight = 168 // ~7 lines
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`
    }
  }, [input])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || sendMessageMutation.isPending) return
    
    const userMessage = input.trim()
    const optimisticId = `optimistic-${Date.now()}`
    
    // Add optimistic user message immediately
    setOptimisticMessageId(optimisticId)
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: userMessage,
        id: optimisticId
      }
    ])
    
    // Clear input immediately
    setInput('')
    
    // Send message to server
    sendMessageMutation.mutate({
      chatId,
      message: userMessage
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without shift sends the message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    // Shift+Enter adds a new line (default behavior)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Determine document category based on file type and name
  const getDocumentCategory = (file: File): string => {
    const fileName = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()
    
    // Legal documents
    if (fileName.includes('contract') || fileName.includes('contratto')) return 'contract'
    if (fileName.includes('receipt') || fileName.includes('ricevuta')) return 'receipt'
    if (fileName.includes('invoice') || fileName.includes('fattura')) return 'invoice'
    if (fileName.includes('ticket') || fileName.includes('multa') || fileName.includes('verbale')) return 'ticket'
    if (fileName.includes('notification') || fileName.includes('notifica')) return 'notification'
    if (fileName.includes('report') || fileName.includes('perizia')) return 'expert_report'
    
    // By file type
    if (fileType.includes('image')) return 'photo'
    if (fileType.includes('pdf')) return 'document'
    if (fileName.includes('.msg') || fileName.includes('.eml')) return 'email'
    
    return 'other'
  }

  const uploadFile = async (file: File) => {
    const fileId = `${Date.now()}-${file.name}`
    const category = getDocumentCategory(file)
    
    try {
      // Add file to uploading state
      setUploadingFiles(prev => new Map(prev).set(fileId, { file, progress: 0 }))

      let uploadSuccess = false
      let s3Key: string | undefined

      // Try direct S3 upload first
      try {
        // Get presigned upload URL
        const uploadUrlResult = await getUploadUrlMutation.mutateAsync({
          chatId,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          category,
        })
        
        s3Key = uploadUrlResult.s3Key

        // Upload file directly to S3
        setUploadingFiles(prev => new Map(prev).set(fileId, { file, progress: 50 }))
        
        const uploadResponse = await fetch(uploadUrlResult.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          mode: 'cors', // Explicitly set CORS mode
        })

        if (uploadResponse.ok) {
          uploadSuccess = true
          setUploadingFiles(prev => new Map(prev).set(fileId, { file, progress: 90 }))

          // Attach document to chat
          await attachDocumentMutation.mutateAsync({
            chatId,
            s3Key,
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            category,
          })
        }
      } catch (directUploadError) {
        console.warn('Direct S3 upload failed, trying server-side upload:', directUploadError)
      }

      // Fallback to server-side upload if direct upload failed
      if (!uploadSuccess) {
        setUploadingFiles(prev => new Map(prev).set(fileId, { file, progress: 30 }))
        
        // Convert file to base64
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64 = reader.result?.toString().split(',')[1]
            if (base64) resolve(base64)
            else reject(new Error('Failed to convert file to base64'))
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        setUploadingFiles(prev => new Map(prev).set(fileId, { file, progress: 60 }))

        // Upload through server
        const result = await uploadDocumentMutation.mutateAsync({
          chatId,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileBase64,
          category,
        })

        s3Key = result.s3Key
        setUploadingFiles(prev => new Map(prev).set(fileId, { file, progress: 90 }))
      }

      // Add success message to chat
      const documentMessage: Message = {
        role: 'system',
        content: `Document uploaded: ${file.name}`,
        id: `doc-${Date.now()}`,
        metadata: {
          type: 'document_upload',
          fileName: file.name,
          s3Key,
          contentType: file.type,
          sizeBytes: file.size,
          category,
        }
      }
      setMessages(prev => [...prev, documentMessage])

      // Remove from uploading state
      setUploadingFiles(prev => {
        const newMap = new Map(prev)
        newMap.delete(fileId)
        return newMap
      })
    } catch (error) {
      console.error('Upload error:', error)
      setUploadingFiles(prev => {
        const newMap = new Map(prev)
        newMap.set(fileId, { file, progress: 0, error: 'Upload failed' })
        return newMap
      })
      // Remove error after 3 seconds
      setTimeout(() => {
        setUploadingFiles(prev => {
          const newMap = new Map(prev)
          newMap.delete(fileId)
          return newMap
        })
      }, 3000)
    }
  }

  const handleUploadFiles = async () => {
    for (const file of selectedFiles) {
      await uploadFile(file)
    }
    setSelectedFiles([])
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
    }
  }


  
  return (
    <div 
      className="flex flex-col h-full relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag and drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-sm rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-dashed border-blue-500">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Paperclip className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">Drop files here</p>
              <p className="text-sm text-gray-500">Release to upload your documents</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Fixed height container for header and messages */}
      <div className="flex flex-col h-[500px]">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white p-4 rounded-t-lg flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-gray-200">
              <Image 
                src="/logo.png" 
                alt="Clamo Logo" 
                width={32} 
                height={32}
                className="rounded-full"
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Product Discovery Chat</h3>
              <p className="text-sm text-gray-500">
                I'll help you understand your product and target market
              </p>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && !sendMessageMutation.isPending && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                <Image 
                  src="/logo.png" 
                  alt="Clamo Logo" 
                  width={40} 
                  height={40}
                  className="rounded-full"
                />
              </div>
              <p>Ready to discover your product's potential!</p>
              <p className="text-sm mt-2">Tell me about your case</p>
            </div>
          </div>
        )}
        
        {messages.map((message) => {
          // Check if this is a document upload message
          const isDocumentUpload = message.metadata?.type === 'document_upload'
          
          if (isDocumentUpload && message.role === 'system') {
            const getCategoryLabel = (category?: string) => {
              const labels: Record<string, string> = {
                contract: 'Contract',
                receipt: 'Receipt',
                invoice: 'Invoice',
                ticket: 'Fine/Ticket',
                notification: 'Notification',
                expert_report: 'Expert Report',
                photo: 'Photo',
                document: 'Document',
                email: 'Email',
                other: 'Document'
              }
              return labels[category || 'other'] || 'Document'
            }
            
            return (
              <div key={message.id} className="flex justify-center my-3">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3 max-w-md">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {message.metadata?.fileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {getCategoryLabel(message.metadata?.category)}
                      </span>
                      <span>{formatFileSize(message.metadata?.sizeBytes || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
          
          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0",
                message.role === 'user' 
                  ? 'bg-blue-600' 
                  : 'bg-white border-2 border-gray-200'
              )}>
                {message.role === 'user' ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Image 
                    src="/logo.png" 
                    alt="Clamo Logo" 
                    width={24} 
                    height={24}
                    className="rounded-full"
                  />
                )}
              </div>
              <Card className={cn(
                "max-w-[80%] p-3",
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border',
                // Add opacity for optimistic messages
                message.id === optimisticMessageId && 'opacity-70'
              )}>
                <div className="text-sm whitespace-pre-wrap">
                  {typeof message.content === 'string' ? message.content : 'Invalid message content'}
                </div>
              </Card>
            </div>
          )
        })}
        
        {sendMessageMutation.isPending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-200">
              <Image 
                src="/logo.png" 
                alt="Clamo Logo" 
                width={24} 
                height={24}
                className="rounded-full"
              />
            </div>
            <Card className="bg-white border p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </Card>
          </div>
        )}
        
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Upload progress indicators */}
      {uploadingFiles.size > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          {Array.from(uploadingFiles.entries()).map(([id, { file, progress, error }]) => (
            <div key={id} className="flex items-center gap-2 py-1">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 flex-1">{file.name}</span>
              {error ? (
                <span className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </span>
              ) : (
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Ready to upload:</div>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 py-1">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-700 flex-1">{file.name}</span>
              <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={() => removeSelectedFile(index)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            onClick={handleUploadFiles}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1"
            disabled={uploadingFiles.size > 0}
          >
            Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
          </Button>
        </div>
      )}
      
      {/* Input - Outside the fixed height container */}
      <form 
        onSubmit={handleSubmit}
        className="border-t border-gray-200 bg-white p-4 rounded-b-lg"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-12 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none overflow-y-auto"
              disabled={sendMessageMutation.isPending || uploadingFiles.size > 0}
              rows={2}
            />
            {/* Upload button positioned inside the textarea */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              title="Attach files"
            >
              <Paperclip className="h-5 w-5" />
            </button>
          </div>
          <Button 
            type="submit" 
            disabled={sendMessageMutation.isPending || (!input.trim() && selectedFiles.length === 0) || uploadingFiles.size > 0}
            className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 flex-shrink-0"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
} 