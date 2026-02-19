#!/usr/bin/env python3
import html
import os
import sys


def main():
    if len(sys.argv) < 3:
        print("usage: mock_dwg_to_svg.py <input.dwg> <output.svg>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    name = os.path.basename(input_path)
    safe_name = html.escape(name)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1200" viewBox="0 0 2000 1200">
  <rect x="0" y="0" width="2000" height="1200" fill="#ffffff"/>
  <rect x="20" y="20" width="1960" height="1160" fill="none" stroke="#334155" stroke-width="4"/>
  <g fill="#334155" font-family="Arial, sans-serif">
    <text x="60" y="90" font-size="48" font-weight="700">TMCS Mock DWG Conversion</text>
    <text x="60" y="150" font-size="28">Input file: {safe_name}</text>
    <text x="60" y="210" font-size="24">Real CAD geometry is not rendered in mock mode.</text>
    <text x="60" y="250" font-size="24">Configure DWG_TO_SVG_CMD with a real converter for production.</text>
  </g>
</svg>
"""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg)


if __name__ == "__main__":
    main()
