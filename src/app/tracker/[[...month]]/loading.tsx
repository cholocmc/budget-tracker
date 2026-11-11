import { TrackerSkeleton } from "@/components/tracker/TrackerSkeleton";

// Streamed right away while the page loads the household's data on the server.
export default function Loading() {
  return <TrackerSkeleton />;
}
