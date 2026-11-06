import { TransitionLink } from "@/components/tree-transition";

export default function Workshop() {
  return (
    <main>
      <h1>The Workshop</h1>
      <p>This page mounted under the black overlay, then the tree lights dissolved to reveal it.</p>
      <TransitionLink className="cta" href="/letters">Read the letters →</TransitionLink>
    </main>
  );
}
