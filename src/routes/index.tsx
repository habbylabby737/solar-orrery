import { createFileRoute } from "@tanstack/react-router";
import { SolarApp } from "@/components/solar/SolarApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <SolarApp />;
}
