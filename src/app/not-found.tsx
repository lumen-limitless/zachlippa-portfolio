import { Button } from '@/components/ui/button';
import BlurFade from '@/components/magicui/blur-fade';
import BlurFadeText from '@/components/magicui/blur-fade-text';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-col min-h-[100dvh] items-center space-y-8">
      <div className="text-center space-y-6 flex flex-col items-center">
        <BlurFadeText
          delay={0.04}
          className="text-6xl font-bold tracking-tighter text-muted-foreground text-center"
          yOffset={8}
          text="404"
        />
        <BlurFadeText
          delay={0.08}
          className="text-2xl font-bold tracking-tighter text-center"
          text="Page not found"
        />
        <BlurFade delay={0.12}>
          <p className="text-muted-foreground max-w-md mx-auto text-center">
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
