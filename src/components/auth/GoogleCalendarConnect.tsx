'use client'

import { useState, useEffect } from 'react';
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { api } from "~/trpc/react";
import { useToast } from "~/components/ui/use-toast";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "~/server/api/root";

interface GoogleCalendarConnectProps {
  onConnected?: () => void;
}

export function GoogleCalendarConnect({ onConnected }: GoogleCalendarConnectProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // TRPC hooks - using the same API routes but with optimized options
  const { data: connectionStatus, isLoading: isLoadingConnectionStatus, refetch: refetchStatus } = 
    api.tutor.checkCalendarConnection.useQuery(undefined, {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
    
  const disconnectCalendarMutation = api.tutor.disconnectCalendar.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Calendar disconnected successfully",
      });
      setSuccess(null);
      // Manually reload the page - simplest way to reset all state
      window.location.reload();
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      console.error('Error disconnecting calendar:', error);
    }
  });
    
  const getAuthUrlQuery = api.tutor.getGoogleAuthUrl.useQuery(undefined, {
    enabled: false, // Only run when manually triggered
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (getAuthUrlQuery.data?.authUrl) {
      window.location.href = getAuthUrlQuery.data.authUrl;
    }
  }, [getAuthUrlQuery.data]);

  useEffect(() => {
    if (getAuthUrlQuery.error) {
      setError(getAuthUrlQuery.error.message || 'Failed to generate authorization URL');
      setIsLoading(false);
    }
  }, [getAuthUrlQuery.error]);

  const connectCalendar = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Trigger the query to get the auth URL
      await getAuthUrlQuery.refetch();
    } catch (err) {
      console.error('Error starting OAuth flow:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };
  
  const disconnectCalendar = async () => {
    disconnectCalendarMutation.mutate();
  };

  // Check for success/error params in URL on component mount only
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get('error');
    const successParam = searchParams.get('success');
    
    if (errorParam) {
      setError(
        errorParam === 'google_auth_failed' ? 'Google authentication failed' :
        errorParam === 'missing_params' ? 'Missing required parameters' :
        errorParam === 'database_error' ? 'Failed to store connection information' :
        errorParam === 'auth_process_failed' ? 'Authentication process failed' :
        errorParam === 'insufficient_scopes' ? 'You must grant all required permissions to use the calendar integration' :
        'An error occurred during the connection process'
      );
    } else if (successParam === 'calendar_connected') {
      setSuccess('Your Google Calendar has been connected successfully!');
      
      // Call the onConnected callback if provided
      if (onConnected) {
        onConnected();
      }
      
      // Remove the params from the URL to prevent multiple connections
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onConnected]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm bg-red-100 border border-red-300 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 text-sm bg-green-100 border border-green-300 text-green-800 rounded-md">
          {success}
        </div>
      )}
      
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          {connectionStatus?.isConnected 
            ? "Your Google Calendar is connected. Students will be able to book lessons based on your availability."
            : "Connect your Google Calendar to allow students to book lessons based on your availability."}
        </p>
        
        {connectionStatus?.isConnected ? (
          <Button 
            onClick={disconnectCalendar} 
            variant="destructive"
            disabled={disconnectCalendarMutation.isPending}
            className="w-full"
          >
            {disconnectCalendarMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Disconnecting...
              </>
            ) : (
              "Disconnect Calendar"
            )}
          </Button>
        ) : (
          <Button 
            onClick={connectCalendar} 
            disabled={isLoading || getAuthUrlQuery.isLoading || isLoadingConnectionStatus}
            className="w-full"
          >
            {isLoading || getAuthUrlQuery.isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Connecting...
              </>
            ) : (
              "Connect to Google Calendar"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default GoogleCalendarConnect; 