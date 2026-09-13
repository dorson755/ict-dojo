'use client';

import { useTransition } from 'react';
import { logout } from '@/app/(auth)/actions';
import styles from './Header.module.css';

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logout();
      window.location.assign('/login');
    });
  }

  return (
    <button type="button" className={styles.logoutBtn} onClick={handleLogout} disabled={isPending}>
      {isPending ? 'Logging out…' : 'Log out'}
    </button>
  );
}
