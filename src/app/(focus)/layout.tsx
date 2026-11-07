/** Full-screen layout without navigation (Cook mode). */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-dvh">{children}</main>;
}
