import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { syncAllAccounts } from '@/lib/inngest/functions';

// Create API routes to serve Inngest background operations
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncAllAccounts,
  ],
});
