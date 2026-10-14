'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  matchPrefix?: string;
}

export default function NavLink({ href, children, matchPrefix }: NavLinkProps) {
  const pathname = usePathname();
  const prefix = matchPrefix ?? href;
  const isActive = pathname === href || pathname.startsWith(`${prefix}/`);

  return (
    <Link
      href={href}
      className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
