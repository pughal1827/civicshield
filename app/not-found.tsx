import React from 'react';
import Link from 'next/link';
import { Compass, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Compass className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-100">404 - Page Not Found</h2>
            <p className="text-xs text-slate-400">
              The civic resource or path you are attempting to locate does not exist.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/">
              <Button variant="primary">
                <Home className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
