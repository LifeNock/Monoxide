import { redirect } from 'next/navigation';

// Redirect to main chat page — channel selection handled client-side
export default function ChannelPage({ params }: { params: { channelId: string } }) {
  redirect('/chat');
}
