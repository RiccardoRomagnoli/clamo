"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Oops! Something went wrong</h1>
          <p className="text-lg mb-6">We've encountered an unexpected error and our team has been notified.</p>
          <div className="mb-8">
            <button 
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Error reference: {error.digest || 'Unknown error'}
          </p>
        </div>
      </body>
    </html>
  );
}