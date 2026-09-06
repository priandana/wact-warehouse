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
        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl neu-raised hover:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-500/20 text-rose-700 dark:text-rose-400 font-bold text-xs transition-all active:scale-[0.99] touch-target cursor-pointer"
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
