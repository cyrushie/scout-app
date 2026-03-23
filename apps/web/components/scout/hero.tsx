import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function Hero() {
  return (
    <section className="pt-32 pb-24 md:pt-44 md:pb-32 px-6">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] text-balance opacity-0 animate-fade-up">
          Noticing signs of pests?
          <br />
          <span className="text-muted-foreground">Start with Scout.</span>
        </h1>
        
        <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance opacity-0 animate-fade-up animation-delay-100">
          Scout is an AI guide that helps you understand what signs of pests might mean, how serious the issue could be, and what to do next.
        </p>
        
        <p className="mt-4 text-sm md:text-base text-muted-foreground/80 max-w-xl mx-auto opacity-0 animate-fade-up animation-delay-200">
          Use Scout when something feels off at home, from sightings and droppings to damage, odors, bites, or repeated activity.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-up animation-delay-300">
          <Button size="lg" className="rounded-full px-8 h-12 text-base" asChild>
            <Link href="/chat">
              Describe your pest issue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="lg" 
            className="rounded-full px-8 h-12 text-base text-muted-foreground hover:text-foreground"
            asChild
          >
            <a href="#how-it-works">Learn how Scout works</a>
          </Button>
        </div>
      </div>

      {/* Abstract Product Visual */}
      <div className="mt-20 md:mt-28 mx-auto max-w-3xl opacity-0 animate-fade-up animation-delay-400">
        <div className="relative aspect-[16/9] rounded-2xl bg-gradient-to-b from-muted/50 to-muted overflow-hidden border border-border/50">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full max-w-md p-8">
              {/* Minimal UI Preview */}
              <div className="bg-card rounded-xl shadow-lg border border-border/50 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-3 w-3 rounded-full bg-accent/60"></div>
                  <div className="h-2 w-32 bg-muted rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 w-full bg-muted rounded-full"></div>
                  <div className="h-2 w-4/5 bg-muted rounded-full"></div>
                  <div className="h-2 w-3/5 bg-muted rounded-full"></div>
                </div>
                <div className="mt-6 flex gap-2">
                  <div className="h-8 w-24 bg-primary rounded-full"></div>
                  <div className="h-8 w-20 bg-muted rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
        </div>
      </div>
    </section>
  )
}
