import { PageHeader } from "@/components/PageHeader";
import { getGalleryPhotos } from "@/lib/data";

export const metadata = { title: "Gallery" };

export default async function GalleryPage() {
  const photos = await getGalleryPhotos();

  return (
    <>
      <PageHeader title="Gallery" description="A look at the cafe, the coffee bar, and the community table." />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-14 sm:px-6 md:grid-cols-3 lg:px-8">
        {photos.map((photo) => (
          <img
            key={photo.id}
            src={photo.public_url}
            alt={photo.alt_text}
            className="aspect-[4/3] w-full rounded-md object-cover shadow-sm"
          />
        ))}
      </section>
    </>
  );
}
