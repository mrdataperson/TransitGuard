import type { UserRole } from '../contract/types';

export function homePathFor(_role: UserRole | null): string {
  return '/trip';
}

export interface NavItem {
  to: string;
  label: string;
}

export function navFor(role: UserRole): NavItem[] {
  const trip = { to: '/trip', label: 'Trip' };
  const analysis = { to: '/analysis', label: 'Analysis' };
  if (role === 'child') return [trip, { to: '/link', label: 'Parents' }, analysis];
  return [trip, { to: '/dashboard', label: 'Children' }, analysis];
}