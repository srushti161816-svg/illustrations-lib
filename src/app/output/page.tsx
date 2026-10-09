import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Output",
  description: "Recordings of the device illustration: hovering its layers and changing its intensity, in light and dark.",
};

// Recorded frame by frame from public/illustrations/hairline-device.html, once per theme.
const VIDEOS = [
  { theme: "Light", src: "/output/device.mp4" },
  { theme: "Dark", src: "/output/device-dark.mp4" },
];

export default function Output() {
  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 content-center gap-8 px-4 py-12 md:grid-cols-2">
      {VIDEOS.map(({ theme, src }) => (
        <figure key={src} className="flex flex-col items-center gap-3">
          <video
            src={src}
            aria-label={`The device illustration in ${theme.toLowerCase()} mode, hovered layer by layer, then its intensity slider dragged`}
            className="w-full rounded-2xl"
            autoPlay
            loop
            muted
            playsInline
            controls
          />
          <figcaption className="flex gap-3 text-sm text-neutral-500">
            <span>{theme}</span>
            <a href={src} download className="underline-offset-4 hover:underline">
              Download MP4
            </a>
          </figcaption>
        </figure>
      ))}
    </main>
  );
}
