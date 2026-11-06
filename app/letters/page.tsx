import { TransitionLink } from "@/components/tree-transition";

export default function Letters() {
  return (
    <main>
      <h1>Letters</h1>
      <p>A third page, so you can hop between them and watch the tree a few times.</p>
      <TransitionLink className="cta" href="/">Back home →</TransitionLink>
    </main>
  );
}
