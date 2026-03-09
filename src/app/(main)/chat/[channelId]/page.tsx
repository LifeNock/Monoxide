import { redirect } from 'next/navigation';

// Redirect to main chat page — channel selection handled client-side
export default async function ChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  await params;
  redirect('/chat');
}
