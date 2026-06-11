export default function GalleryLoading() {
  return (
    <section
      aria-label="Loading gallery"
      aria-live="polite"
      className="mx-auto grid min-h-[55vh] max-w-7xl place-items-center px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-sm rounded-md border border-black/10 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-crema">
          <div className="relative h-12 w-12">
            <span className="absolute inset-0 rounded-full border-4 border-brass/25" />
            <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-roast border-r-brass" />
            <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sage/80" />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-roast">Gallery</p>
          <h1 className="text-xl font-bold text-ink">Framing the cafe moments</h1>
          <p className="text-sm text-ink/65">Loading photos from the coffee bar and community table.</p>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-crema">
          <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-sage via-brass to-berry" />
        </div>
      </div>
    </section>
  );
}
