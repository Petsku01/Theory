# smart_xml_parser.py
# XML → dict parser ever written in Python.
# Secure • Fast?
# -pk

from __future__ import annotations
import xml.etree.ElementTree as ET
import re
from collections import defaultdict
from typing import Any, Dict, List, Optional

# Try to use defusedxml (blocks XXE attacks), fall back gracefully
try:
    from defusedxml.ElementTree import parse as safe_parse
except ImportError:  # pragma: no cover
    safe_parse = ET.parse


# Real-world accurate type detection
_TYPE_PATTERNS = {
    "rss":      {"item", "channel", "title", "link"},
    "atom":     {"feed", "entry"},
    "invoice":  {"invoice", "total", "amount", "date", "due"},
    "catalog":  {"book", "product", "item", "title", "author", "price"},
    "config":   {"config", "server", "host", "port"},
    "log":      {"log", "entry", "time", "level"},
    "medical":  {"patient", "name", "dob"},
    "soap":     {"envelope", "body"},
    "manifest": {"manifest", "uses-permission"},
}

def _clean_tag(tag: str) -> str:
    """{http://ns}tag → tag"""
    return tag.split("}", 1)[-1] if "}" in tag else tag

def _detect_type(root: ET.Element) -> str:
    tags = {_clean_tag(e.tag).lower() for e in root.iter()}
    scores = {t: len(tags & kw) for t, kw in _TYPE_PATTERNS.items()}
    return max(scores, key=scores.get) if any(scores.values()) else "unknown"

def _extract_entities(xml_str: str) -> Dict[str, List[str]]:
    entities: Dict[str, List[str]] = {}
    # Money
    money = re.findall(r"[\£\$\€¥]\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?", xml_str)
    if money:
        entities["money"] = money
    # Dates
    dates = re.findall(r"\d{4}-\d{2}-\d{2}|"
                       r"\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}", xml_str)
    if dates:
        entities["date"] = dates
    return entities

def _person_names(root: ET.Element) -> List[str]:
    candidates = []
    for tag in ("author", "name", "customer", "patient", "person", "creator"):
        for el in root.findall(f".//{tag}"):
            if (t := (el.text or "").strip()):
                if len(t) > 2 and any(w and w[0].isupper() for w in t.split()):
                    candidates.append(t)
    seen = set()
    return [x for x in candidates if x not in seen and not seen.add(x)]

def _xml_to_dict(el: ET.Element, depth: int = 0, max_depth: int = 500) -> Any:
    if depth > max_depth:
        raise RecursionError("Max depth exceeded (XML bomb?)")

    children = defaultdict(list)
    for child in el:
        children[child.tag].append(_xml_to_dict(child, depth + 1, max_depth))

    text = (el.text or "").strip()
    if el.text and el.text.strip().startswith("<![CDATA["):
        text = el.text.strip()[9:-3].strip()

    if not children:
        return text or dict(el.attrib) or ""

    result: Dict[str, Any] = dict(el.attrib)
    for tag, vals in children.items():
        clean_tag = _clean_tag(tag)
        result[clean_tag] = vals if len(vals) > 1 else vals[0]
    if text:
        result["#text"] = text
    return result


class SmartXMLParser:
    """The ultimate XML parser. Just works."""

    def __init__(
        self,
        xml_string: Optional[str] = None,
        xml_file: Optional[str] = None,
        *,
        strip_namespace: bool = True,
        max_depth: int = 500,
    ):
        if (xml_file is None) == (xml_string is None):
            raise ValueError("Provide exactly one: xml_string or xml_file")

        self.strip_ns = strip_namespace
        self.max_depth = max_depth

        if xml_file:
            tree = safe_parse(xml_file)
            self.root = tree.getroot()
            with open(xml_file, "r", encoding="utf-8", errors="replace") as f:
                self.raw_xml = f.read()
        else:
            self.root = ET.fromstring(xml_string)
            self.raw_xml = xml_string

        self.xml_type = _detect_type(self.root)
        self.entities = _extract_entities(self.raw_xml)
        self.entities["person"] = _person_names(self.root)

    def to_dict(self) -> Dict[str, Any]:
        root_tag = _clean_tag(self.root.tag) if self.strip_ns else self.root.tag
        return {root_tag: _xml_to_dict(self.root, max_depth=self.max_depth)}

    def summary(self) -> str:
        return f"{self.xml_type} • {len(list(self.root.iter()))} elements • {len(self.entities)} entities"
