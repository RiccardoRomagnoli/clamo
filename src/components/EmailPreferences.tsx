'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Switch } from '~/components/ui/switch'
import { Label } from '~/components/ui/label'
import { useToast } from '~/components/ui/use-toast'
import { api } from '~/trpc/react'
import { Mail, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '~/components/ui/alert'

interface EmailPreferencesProps {
  initialEnabled: boolean
}

export function EmailPreferences({ initialEnabled }: EmailPreferencesProps) {
  const { toast } = useToast()
  const [enabled, setEnabled] = useState(initialEnabled)
  const utils = api.useUtils()

  const updatePreferencesMutation = api.user.updateEmailPreferences.useMutation({
    onSuccess: (data) => {
      setEnabled(data.daily_email_enabled)
      toast({
        title: data.daily_email_enabled ? "Email notifications enabled! 📧" : "Email notifications disabled",
        description: data.daily_email_enabled 
          ? "You'll receive daily marketing tasks to help grow your product."
          : "You won't receive daily emails, and new tasks won't be generated.",
      })
      utils.user.getCurrent.invalidate()
    },
    onError: (error) => {
      toast({
        title: "Error updating preferences",
        description: error.message,
        variant: "destructive",
      })
      // Revert the switch state
      setEnabled(initialEnabled)
    },
  })

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    updatePreferencesMutation.mutate({ daily_email_enabled: checked })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">Email Notifications</CardTitle>
        </div>
        <CardDescription>
          Manage your daily marketing task emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="daily-emails" className="text-sm font-medium">
              Daily Task Emails
            </Label>
            <p className="text-sm text-gray-600">
              Receive personalized marketing tasks every morning at 7 AM
            </p>
          </div>
          <Switch
            id="daily-emails"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={updatePreferencesMutation.isPending}
          />
        </div>

        {updatePreferencesMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating preferences...
          </div>
        )}

        {enabled ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Great choice!</strong> You'll receive daily marketing tasks to help grow your product. 
              Each email contains 2 personalized tasks based on your product and progress.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Important:</strong> With notifications disabled, <strong>no new marketing tasks will be generated</strong> for your products. 
              You'll miss out on daily growth opportunities and personalized marketing strategies.
            </AlertDescription>
          </Alert>
        )}

        
      </CardContent>
    </Card>
  )
} 