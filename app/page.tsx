// app/page.tsx
// Root redirect — send users to dashboard or login

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
