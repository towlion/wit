import Shell from "@/components/Shell";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
