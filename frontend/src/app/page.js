import { Suspense } from "react";
import SearchView from "@/components/SearchView";
import { RepoListSkeleton } from "@/components/Skeletons";

export default function HomePage() {
  return (
    <Suspense fallback={<RepoListSkeleton />}>
      <SearchView />
    </Suspense>
  );
}
