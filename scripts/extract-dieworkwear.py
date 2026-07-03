#!/usr/bin/env python3
"""
Extracts only dieworkwear rows from fashion-bot-articles.sql dump
and writes them as a valid PostgreSQL COPY import file.

Usage: python3 scripts/extract-dieworkwear.py > dieworkwear-export.sql
"""

import sys
import os

DUMP_FILE = os.path.join(os.path.dirname(__file__), "..", "fashion-bot-articles.sql")
SOURCE_FILTER = "dieworkwear"

COPY_HEADER = "COPY public.articles (id, title, url, chunk_index, content, embedding, source) FROM stdin;\n"

def main():
    rows_written = 0
    in_copy_block = False

    sys.stdout.write(COPY_HEADER)

    with open(DUMP_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("COPY public.articles"):
                in_copy_block = True
                continue

            if in_copy_block:
                if line.startswith("\\."):
                    break

                # Tab-separated: id, title, url, chunk_index, content, embedding, source
                # Source is 7th field (index 6). Tab is the delimiter; embedded tabs are \t.
                fields = line.split("\t")
                if len(fields) >= 7 and fields[6].strip() == SOURCE_FILTER:
                    sys.stdout.write(line)
                    rows_written += 1

    sys.stdout.write("\\.\n")
    print(f"-- Exported {rows_written} rows with source='{SOURCE_FILTER}'", file=sys.stderr)

if __name__ == "__main__":
    main()
