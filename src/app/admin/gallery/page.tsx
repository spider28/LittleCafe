import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/Field";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { deleteGalleryPhotoAction, uploadGalleryPhotoAction } from "@/lib/actions";
import { getAdminGalleryData } from "@/lib/data";

export const metadata = { title: "Gallery admin" };

export default async function AdminGalleryPage() {
  const gallery = await getAdminGalleryData();

  return (
    <div className="grid gap-6">
      <AdminSectionHeader title="Gallery" description="Upload public gallery photos and manage their display order." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <AdminPanel title="Upload photo">
          <ActionForm action={uploadGalleryPhotoAction} buttonLabel="Upload photo">
            <Field name="altText" label="Alt text" required />
            <Field name="displayOrder" label="Display order" type="number" defaultValue="0" required />
            <label className="grid gap-1 text-sm font-medium text-ink">
              Photo
              <input name="photo" type="file" accept="image/*" required className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm" />
            </label>
          </ActionForm>
        </AdminPanel>

        <AdminPanel title="Gallery photos" description={`${gallery.length} uploaded photos.`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {gallery.map((photo) => (
              <article key={photo.id} className="overflow-hidden rounded-md bg-crema">
                <img src={photo.public_url} alt={photo.alt_text} className="h-36 w-full object-cover" />
                <div className="flex items-start justify-between gap-3 p-3 text-sm">
                  <div>
                    <p className="font-semibold text-ink">{photo.alt_text}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-ink/55">Order {photo.display_order}</p>
                  </div>
                  <form action={deleteGalleryPhotoAction}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="storagePath" value={photo.storage_path} />
                    <button className="font-semibold text-berry" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {!gallery.length ? <p className="text-sm text-ink/65">No gallery photos have been uploaded yet.</p> : null}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
