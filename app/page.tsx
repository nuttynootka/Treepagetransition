import { TransitionLink } from "@/components/tree-transition";

export default function Home() {
  return (
    <main>
      <h1>Home</h1>
      <p>Tap or click any link at the top to play the wand tree transition.</p>
      <TransitionLink className="cta" href="/workshop">Visit the workshop →</TransitionLink>
    </main>
  );
}
