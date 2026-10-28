import Link from "next/link";

export default function Footer() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "unknown";

  return (
    <footer className="w-full border-t border-border/40 mt-16 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight">Pomelo</h3>
            <p className="text-sm text-muted-foreground">
              A lightweight, modern coding contest platform.
            </p>
            <div className="flex space-x-4">
              <Link href="https://github.com/so-sc/pomelo" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                GitHub
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="https://pomelo.sosc.org.in/" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link href="https://github.com/so-sc/pomelo/issues" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Support</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Pomelo Team / SOSC</p>
          <div className="flex items-center gap-4">
            <span>Made with <span className="text-red-500">❤️</span> by SOSC</span>
            <span>Version {version}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
