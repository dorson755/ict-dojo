'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/(auth)/actions';
import styles from './Header.module.css';

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleLogout() {
    startTransition(async () => {
      await logout();
      router.replace('/login');
      router.refresh();
    });
  }

  return (
    <button type="button" className={styles.logoutBtn} onClick={handleLogout} disabled={isPending}>
      {isPending ? 'Logging out…' : 'Log out'}
    </button>
  );
}
