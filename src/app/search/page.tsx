export const runtime = "nodejs";

import { SearchExperience } from "@/components/SearchExperience";
import { withArchivePage } from "@/lib/archive-layout";
import { getPopularTags, searchPhotos, type SearchFilter } from "@/lib/queries";

function parseFilter(value: string | undefined): SearchFilter {
  if (value === "photos" || value === "videos" || value === "tags") return value;
  return "all";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const filter = parseFilter(params.filter);

  return withArchivePage(async () => {
    const results = query ? searchPhotos(query, filter) : [];
    const popularTags = getPopularTags(12);

    return (
      <SearchExperience
        initialQuery={query}
        initialFilter={filter}
        initialResults={results}
        popularTags={popularTags}
      />
    );
  }, { fullWidth: true });
}
