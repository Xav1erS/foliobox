import { describe, expect, it } from "vitest";
import { createZipArchive } from "./zip-archive";

describe("createZipArchive", () => {
  it("creates a valid stored zip with utf-8 filenames", () => {
    const archive = createZipArchive(
      [
        {
          name: "FolioBox-Figma-Plugin/manifest.json",
          data: '{"name":"FolioBox Figma Import"}',
        },
        {
          name: "FolioBox-Figma-Plugin/README.md",
          data: "# Readme",
        },
      ],
      new Date("2026-04-21T10:30:00Z")
    );

    expect(archive.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(archive.includes(Buffer.from("FolioBox-Figma-Plugin/manifest.json"))).toBe(true);
    expect(archive.includes(Buffer.from("FolioBox-Figma-Plugin/README.md"))).toBe(true);

    const endRecord = archive.subarray(-22);
    expect(endRecord.readUInt32LE(0)).toBe(0x06054b50);
    expect(endRecord.readUInt16LE(8)).toBe(2);
    expect(endRecord.readUInt16LE(10)).toBe(2);
  });
});
