import type { GetServerSideProps } from "next";
import { agentInstructions } from "@/content/agent-onboarding";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.write(agentInstructions());
  res.end();
  return { props: {} };
};

export default function AgentInstructions() {
  return null;
}
