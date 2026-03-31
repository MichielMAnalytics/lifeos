'use client';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Greeting() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const dateLabel = new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-text">
        {getGreeting()}
      </h1>
      <p className="mt-2 text-sm text-text-muted">{dateLabel}</p>
    </div>
  );
}
