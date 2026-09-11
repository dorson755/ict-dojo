'use server';

// Auth is now handled client-side via Firebase SDK (login/signup pages).
// Session creation is handled by /api/auth/session route.
// This file is kept for any future server-side auth utilities.

export async function logout() {
  // Logout is handled client-side — see Header component
}
