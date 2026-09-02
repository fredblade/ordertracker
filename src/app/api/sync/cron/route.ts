import { NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

export async function GET() {
  try {
    // Send background sync event to Inngest queue
    await inngest.send({
      name: 'order.sync.all',
      data: {}
    });
    
    return NextResponse.json(
      { 
        status: 'sync_scheduled', 
        message: 'Decoupled edge sync triggered successfully.' 
      }, 
      { status: 202 }
    );
  } catch (err: any) {
    console.error('Failed to trigger background sync:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to trigger sync.' }, 
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
