import type { Metadata } from "next";
import { DoorDemo } from "./DoorDemo";
import "./door.css";

export const metadata: Metadata = { title: "Wreath Door Preview" };

// Separate demo of the wreath door preview. It does not use the tree page transition.
export default function DoorPage() {
  return <DoorDemo />;
}
