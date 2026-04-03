'use client';

import { UniversalAdd } from '@/components/universal-add';
import { HealthMacros } from '@/components/sections/health-macros';
import { ActiveProgramme } from '@/components/sections/active-programme';
import { WorkoutLog } from '@/components/sections/workout-log';

export default function HealthPage() {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Health</h1>
          <p className="text-sm text-text-muted/60 mt-0.5">Nutrition, workouts, and progress</p>
        </div>
        <UniversalAdd page="health" />
      </div>

      {/* Two-column layout: macros+food left, workouts right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left: Macros + Food Diary */}
        <div className="space-y-4 md:space-y-6">
          <HealthMacros />
        </div>

        {/* Right: Programme + Workout Log */}
        <div className="space-y-4 md:space-y-6">
          <ActiveProgramme />
          <WorkoutLog />
        </div>
      </div>
    </div>
  );
}
