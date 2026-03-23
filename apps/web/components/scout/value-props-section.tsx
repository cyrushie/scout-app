"use client"

import { useEffect, useRef, useState } from "react"
import { Search, Gauge, ArrowUpRight } from "lucide-react"

const valueProps = [
  {
    icon: Search,
    title: "Understand the signs",
    description: "Start with what you are seeing, smelling, hearing, or finding around your home."
  },
  {
    icon: Gauge,
    title: "Assess the level of concern",
    description: "Get a clearer read on whether the issue seems minor, active, or worth addressing soon."
  },
  {
    icon: ArrowUpRight,
    title: "Know the next step",
    description: "Decide whether to monitor the issue, try a next step at home, or seek professional help."
  }
]

export function ValuePropsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.15 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <div className={`text-center max-w-2xl mx-auto mb-16 md:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-tight text-balance">
            Scout gives you clarity before you decide what to do.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-6">
          {valueProps.map((prop, index) => (
            <div
              key={prop.title}
              className={`group relative p-8 rounded-2xl bg-card border border-border/50 hover:border-border hover:shadow-lg transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100 + 200}ms` }}
            >
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted group-hover:bg-accent/10 transition-colors">
                  <prop.icon className="h-5 w-5 text-foreground/70 group-hover:text-accent transition-colors" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {prop.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
