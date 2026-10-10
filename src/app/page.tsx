import { Figure } from "./figure";

// Each figure is a self-contained Hairline page built from illustrations/**/*.js.
const figures = [
  { src: "/illustrations/hairline-device.html", title: "Exploded device", action: { label: "Go to videos page", href: "/output" } },
  { src: "/illustrations/hairline-stack.html", title: "Stack of tiers over racks" },
  { src: "/illustrations/hairline-platform.html", title: "Platform of modules" },
  { src: "/illustrations/hairline-rack.html", title: "Server rack" },
  { src: "/illustrations/hairline-apps.html", title: "Grid of app tiles" },
  { src: "/illustrations/hairline-toggle.html", title: "Toggle switch" },
  { src: "/illustrations/hairline-keys.html", title: "Row of keycaps" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-10 md:px-10">
      <header className="mb-8 flex flex-col gap-1">
        <h1 className="text-lg font-medium tracking-tight text-neutral-900">Hairline</h1>
        <p className="text-sm text-neutral-500">Isometric figures in a single stroke that answer the pointer. Click one to open it.</p>
      </header>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {figures.map((figure) => (
          <Figure key={figure.src} src={`${figure.src}?theme=light`} title={figure.title} action={figure.action} />
        ))}
      </div>
    </main>
  );
}
