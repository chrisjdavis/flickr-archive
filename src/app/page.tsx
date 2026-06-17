export const runtime = "nodejs";

import { PhotostreamShell } from "@/components/PhotostreamShell";
import { withArchivePage } from "@/lib/archive-layout";
import { getPhotosPage, getTotalPhotoCount } from "@/lib/queries";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  return withArchivePage(async () => {
    const { photos, total } = getPhotosPage(page);
    const totalCount = getTotalPhotoCount();
    const totalLabel = `${totalCount.toLocaleString()} photos & videos`;

    return (
      <PhotostreamShell photos={photos} total={total} page={page} totalLabel={totalLabel} />
    );
  }, { fullWidth: true });
}
