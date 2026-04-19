'use client';

// Old `/calendar` URL is now `/schedules`. Keep this file as a redirect
// so existing bookmarks / links don't 404.

import { redirect } from 'next/navigation';

export default function CalendarRedirect() {
  redirect('/schedules');
}
