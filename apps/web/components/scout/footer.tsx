import Link from "next/link"

export function Footer() {
  return (
    <footer id="contact" className="py-12 md:py-16 px-6 border-t border-border/50">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <Link href="/" className="text-xl font-semibold tracking-tight text-foreground">
              Scout
            </Link>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              A smarter first step when something feels off at home.
            </p>
          </div>
          
          <nav className="flex items-center gap-8">
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              href="#contact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border/50">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Scout. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
