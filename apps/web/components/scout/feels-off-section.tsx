"use client"

import { useEffect, useRef, useState } from "react"

export function FeelsOffSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section 
      ref={sectionRef}
      id="about"
      className="py-24 md:py-32 px-6 bg-muted/30"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-tight text-balance">
              When something feels off, Scout helps you figure out what it means.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Maybe you found droppings in the kitchen, heard scratching in the walls, noticed bites overnight, or keep seeing signs that should not be there. Scout helps turn those clues into a clearer assessment so you can understand the problem before it gets worse.
            </p>
          </div>
          
          {/* Visual Panel */}
          <div className={`transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative aspect-square rounded-2xl bg-gradient-to-br from-card to-muted/50 border border-border/50 p-8 flex items-center justify-center">
              {/* Abstract clarity visualization */}
              <div className="relative w-full h-full">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                    {[...Array(9)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`aspect-square rounded-lg transition-all duration-500 ${
                          i === 4 
                            ? 'bg-accent/30 border-2 border-accent/50' 
                            : 'bg-muted/80 border border-border/50'
                        }`}
                        style={{ 
                          transitionDelay: `${i * 50}ms`,
                          opacity: isVisible ? 1 : 0,
                          transform: isVisible ? 'scale(1)' : 'scale(0.8)'
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* Connecting lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
                  <path 
                    d="M50 20 L50 80" 
                    stroke="currentColor" 
                    strokeWidth="0.5" 
                    className="text-accent/30"
                    strokeDasharray="2 2"
                  />
                  <path 
                    d="M20 50 L80 50" 
                    stroke="currentColor" 
                    strokeWidth="0.5" 
                    className="text-accent/30"
                    strokeDasharray="2 2"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
