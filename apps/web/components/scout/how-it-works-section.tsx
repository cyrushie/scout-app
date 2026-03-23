"use client"

import { useEffect, useRef, useState } from "react"

const steps = [
  {
    number: "01",
    title: "Describe what is happening",
    description: "Tell Scout what you are seeing, hearing, smelling, or finding around your home."
  },
  {
    number: "02",
    title: "Answer a few follow-up questions",
    description: "Scout uses the details you share to better understand the likely issue and level of concern."
  },
  {
    number: "03",
    title: "Get guidance on what to do next",
    description: "Find out whether to keep monitoring, take action soon, or connect with a professional."
  }
]

export function HowItWorksSection() {
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
    <section 
      ref={sectionRef} 
      id="how-it-works" 
      className="py-24 md:py-32 px-6 bg-muted/30"
    >
      <div className="mx-auto max-w-6xl">
        <div className={`text-center max-w-2xl mx-auto mb-16 md:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-tight">
            How Scout works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            A simple conversation helps you move from a vague concern to a clearer next step.
          </p>
        </div>

        <div className="relative">
          {/* Connection line - desktop */}
          <div className="hidden md:block absolute top-12 left-0 right-0 h-px bg-border" />
          
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`relative transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 150 + 200}ms` }}
              >
                {/* Step number */}
                <div className="relative z-10 mb-6">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-card border-2 border-border shadow-sm">
                    <span className="text-2xl font-semibold text-foreground">{step.number}</span>
                  </div>
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
