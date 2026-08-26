'use client';
// components/profile/ProfileSignOutButton.tsx
// Profile page sign-out trigger button with confirmation modal

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { LogoutConfirmationModal } from '@/components/shared/LogoutConfirmationModal';

export function ProfileSignOutButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 font-bold text-xs transition-colors shadow-2xs active:scale-[0.99] touch-target"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar dari Akun</span>
      </button>

      <LogoutConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
