import { RiskExperience } from "@/components/risk-experience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Risk",
  description:
    "Where knowledge is concentrated in one person, and exactly what leaves with them.",
};

export default function RiskPage() {
  return <RiskExperience />;
}
