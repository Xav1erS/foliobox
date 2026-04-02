#!/usr/bin/env python3

import argparse
import json
from pathlib import Path

import fitz


def parse_page_spec(spec: str, total_pages: int) -> list[int]:
    if not spec or spec.lower() == "all":
        return list(range(1, total_pages + 1))

    pages: list[int] = []
    for chunk in spec.split(","):
        part = chunk.strip()
        if not part:
            continue

        if "-" in part:
            start_str, end_str = part.split("-", 1)
            start = int(start_str)
            end = int(end_str)
            if start > end:
                start, end = end, start
            pages.extend(range(start, end + 1))
        else:
            pages.append(int(part))

    deduped = sorted(set(page for page in pages if 1 <= page <= total_pages))
    return deduped


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--pages", default="1-8")
    parser.add_argument("--dpi", type=int, default=144)
    parser.add_argument("--out-dir", required=True)
    args = parser.parse_args()

    pdf_path = Path(args.file).expanduser().resolve()
    out_dir = Path(args.out_dir).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    total_pages = doc.page_count
    selected_pages = parse_page_spec(args.pages, total_pages)

    if not selected_pages:
        raise SystemExit("No valid pages selected")

    scale = args.dpi / 72.0
    matrix = fitz.Matrix(scale, scale)

    rendered_pages = []
    for page_number in selected_pages:
        page = doc.load_page(page_number - 1)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        output_path = out_dir / f"page-{page_number}.png"
        pix.save(output_path)
        rendered_pages.append(
            {
                "page": page_number,
                "path": str(output_path),
                "width": pix.width,
                "height": pix.height,
                "bytes": output_path.stat().st_size,
            }
        )

    print(
        json.dumps(
            {
                "file": str(pdf_path),
                "totalPages": total_pages,
                "selectedPages": selected_pages,
                "dpi": args.dpi,
                "pages": rendered_pages,
            }
        )
    )


if __name__ == "__main__":
    main()
