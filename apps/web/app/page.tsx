import { Header } from "@/components/scout/header"
import { Hero } from "@/components/scout/hero"
import { FeelsOffSection } from "@/components/scout/feels-off-section"
import { ValuePropsSection } from "@/components/scout/value-props-section"
import { HowItWorksSection } from "@/components/scout/how-it-works-section"
import { ClosingCtaSection } from "@/components/scout/closing-cta-section"
import { Footer } from "@/components/scout/footer"
import { ScoutWidgetLoader } from "@/components/scout/widget-loader"

export default function ScoutLandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <FeelsOffSection />
        <ValuePropsSection />
        <HowItWorksSection />
        <ClosingCtaSection />
      </main>
      <Footer />
      <ScoutWidgetLoader />
    </>
  )
}
