export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
        {children}
      </div>
    </div>
  );
}
