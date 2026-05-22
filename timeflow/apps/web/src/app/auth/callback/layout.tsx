/** OAuth redirect lands with ?token=… — must not be statically prerendered without query params. */
export const dynamic = 'force-dynamic';

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
