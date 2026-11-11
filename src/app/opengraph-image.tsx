import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { DATA } from "@/data/resume";

export const alt = `${DATA.name}: ${DATA.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SUN_GLOW = "#ffb347";
const HOST = new URL(DATA.url).host;

/**
 * Link preview shown when the site is shared. The background is a render of
 * the universe home page; the name and headline come from `resume.tsx`, so
 * the card stays current when the copy changes.
 */
export default async function OpenGraphImage() {
  const background = await readFile(
    join(process.cwd(), "public", "og-background.jpg")
  );
  const backgroundSrc = `data:image/jpeg;base64,${background.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: "#020207",
        color: "#ffffff",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: next/og renders plain elements, not next/image */}
      <img
        alt=""
        height={size.height}
        src={backgroundSrc}
        style={{ position: "absolute", top: 0, left: 0 }}
        width={size.width}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundImage:
            "linear-gradient(90deg, rgba(2,2,7,0.94) 0%, rgba(2,2,7,0.78) 38%, rgba(2,2,7,0) 68%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 640,
          height: "100%",
          padding: "64px 0 64px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 20,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 12,
              marginRight: 16,
              backgroundColor: SUN_GLOW,
              boxShadow: `0 0 18px ${SUN_GLOW}`,
            }}
          />
          An interactive portfolio
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: -4,
              lineHeight: 1,
            }}
          >
            {DATA.name}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 31,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {DATA.description}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {HOST}
        </div>
      </div>
    </div>,
    size
  );
}
