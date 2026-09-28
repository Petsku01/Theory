# extract_all.py
# Run this → all XMLs becomes, clean JSON
# -pk

import os
import json
from smart_xml_parser import SmartXMLParser

XML_FOLDER = "xml_files"
OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("SmartXMLParser — Final Edition")
print("Processing all XML files...\n")

results = []

for fname in sorted(f for f in os.listdir(XML_FOLDER) if f.lower().endswith(".xml")):
    path = os.path.join(XML_FOLDER, fname)
    print(f"{fname:50} → ", end="")

    try:
        parser = SmartXMLParser(xml_file=path)
        data = parser.to_dict()

        # Individual file
        out_path = os.path.join(OUTPUT_DIR, os.path.splitext(fname)[0] + ".json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        results.append({"file": fname, "type": parser.xml_type, "data": data})
        print(f"OK → {parser.xml_type}")

    except Exception as e:
        print(f"ERROR → {e}")

# Master file
master = os.path.join(OUTPUT_DIR, "ALL_EXTRACTED.json")
with open(master, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"\nDone! {len(results)} files → {OUTPUT_DIR}/")
print(f"Master file: {master}")
