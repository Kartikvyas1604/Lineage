import { ReviewExperience } from "@/components/review-experience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review queue",
  description:
    "Accept or reject proposed supersessions and contradictions before they touch the knowledge graph.",
};

export default function ReviewPage() {
  return <ReviewExperience />;
}
