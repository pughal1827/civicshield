'use client';

import React, { useEffect } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-rose-900/50 bg-slate-900/90 text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-100">System Interruption</h2>
            <p className="text-xs text-slate-400">
              {error.message || 'An unexpected runtime anomaly occurred.'}
            </p>
          </div>
          <div className="pt-2">
            <Button onClick={() => reset()} variant="primary" className="bg-rose-600 hover:bg-rose-700">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
