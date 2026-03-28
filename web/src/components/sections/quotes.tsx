'use client';

import { useTodayDate } from '@/lib/today-date-context';

const QUOTES = [
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
  { text: 'What gets measured gets managed.', author: 'Peter Drucker' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Focus is a matter of deciding what things you are not going to do.', author: 'John Carmack' },
  { text: 'Discipline equals freedom.', author: 'Jocko Willink' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.', author: 'Mark Zuckerberg' },
  { text: 'Your work is going to fill a large part of your life. Do not settle.', author: 'Steve Jobs' },
  { text: 'The most dangerous kind of waste is the waste we do not recognize.', author: 'Shigeo Shingo' },
  { text: 'If you want to go fast, go alone. If you want to go far, go together.', author: 'African Proverb' },
  { text: 'It is not that we have a short time to live, but that we waste a great deal of it.', author: 'Seneca' },
  { text: 'An entrepreneur is someone who jumps off a cliff and builds a plane on the way down.', author: 'Reid Hoffman' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Plans are nothing; planning is everything.', author: 'Dwight D. Eisenhower' },
  { text: 'Perfection is not attainable, but if we chase it we can catch excellence.', author: 'Vince Lombardi' },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
  { text: 'Hard choices, easy life. Easy choices, hard life.', author: 'Jerzy Gregorek' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.', author: 'Marcus Aurelius' },
  { text: 'The most effective way to do it, is to do it.', author: 'Amelia Earhart' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'What one programmer can do in one month, two programmers can do in two months.', author: 'Fred Brooks' },
  { text: 'Make each day your masterpiece.', author: 'John Wooden' },
  { text: 'The only limit to our realization of tomorrow is our doubts of today.', author: 'Franklin D. Roosevelt' },
  { text: 'Stay hungry, stay foolish.', author: 'Stewart Brand' },
  { text: 'The cost of being wrong is less than the cost of doing nothing.', author: 'Seth Godin' },
  { text: 'If you are not embarrassed by the first version of your product, you have launched too late.', author: 'Reid Hoffman' },
  { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { text: 'Courage is not the absence of fear, but the triumph over it.', author: 'Nelson Mandela' },
];

function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function Quotes() {
  const { date } = useTodayDate();

  const index = hashDate(date) % QUOTES.length;
  const quote = QUOTES[index];

  return (
    <div className="mt-2 border border-border rounded-xl">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Daily Quote
        </h2>
      </div>
      <div className="px-6 py-10 flex flex-col items-center text-center">
        <p className="text-sm italic text-text leading-relaxed max-w-md">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="mt-4 text-xs font-mono text-text-muted uppercase tracking-wide">
          &mdash; {quote.author}
        </p>
      </div>
    </div>
  );
}
