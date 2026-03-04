'use client';

interface TypingIndicatorProps {
  users: string[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const text =
    users.length === 1
      ? `${users[0]} is typing...`
      : users.length === 2
        ? `${users[0]} and ${users[1]} are typing...`
        : `${users[0]} and ${users.length - 1} others are typing...`;

  return (
    <div style={{
      padding: '0.25rem 1rem',
      fontSize: '0.75rem',
      color: 'var(--text-muted)',
      fontStyle: 'italic',
    }}>
      {text}
    </div>
  );
}
