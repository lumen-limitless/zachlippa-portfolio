import Link from "next/link";
import BlurFade from "@/components/magicui/blur-fade";
import BlurFadeText from "@/components/magicui/blur-fade-text";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center space-y-8">
      <div className="flex flex-col items-center space-y-6 text-center">
        <BlurFadeText
          className="text-center font-bold text-6xl text-muted-foreground tracking-tighter"
          delay={0.04}
          text="404"
          yOffset={8}
        />
        <BlurFadeText
          className="text-center font-bold text-2xl tracking-tighter"
          delay={0.08}
          text="Page not found"
        />
        <BlurFade delay={0.12}>
          <p className="mx-auto max-w-md text-center text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </BlurFade>
        <BlurFade delay={0.16}>
          <Button asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </BlurFade>
      </div>
    </main>
  );
}
