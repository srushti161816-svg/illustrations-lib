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
    <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 content-center items-start gap-6 px-4 py-12 lg:grid-cols-3">
      {figures.map((figure) => (
        <Figure key={figure.src} src={`${figure.src}?theme=light`} title={figure.title} action={figure.action} />
      ))}
    </main>
  );
}
