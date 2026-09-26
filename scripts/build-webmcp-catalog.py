#!/usr/bin/env python3
"""Build the public WebMCP resource catalog using only Python's standard library.

Run from any directory. Use --check in CI to reject a stale generated catalog.
Only public HTML in the root, blog/, school/, and papers/ is eligible. The
catalog never reads operational JSON, admin data, game state, or credentials.
"""

import argparse
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "webmcp-resources.json"
EXCLUDED_ROOT_PAGES = {"admin.html", "handball-watch.html"}
CONTENT_DIRECTORIES = ("blog", "school", "papers")
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}
OMITTED_TAGS = {"script", "style", "noscript", "template", "nav", "header", "footer", "svg"}
BLOCK_TAGS = {
    "address", "article", "aside", "blockquote", "br", "caption", "dd", "div",
    "dl", "dt", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6",
    "header", "hr", "li", "main", "ol", "p", "pre", "section", "table", "tbody", "td",
    "th", "thead", "tr", "ul",
}
HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}


class Element:
    def __init__(self, tag, attrs=()):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = []


class DocumentParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.document = Element("document")
        self.stack = [self.document]

    def handle_starttag(self, tag, attrs):
        element = Element(tag, attrs)
        self.stack[-1].children.append(element)
        if tag not in VOID_TAGS:
            self.stack.append(element)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Element(tag, attrs))

    def handle_endtag(self, tag):
        # Tolerate unmatched closing tags in the site's hand-authored pages.
        for position in range(len(self.stack) - 1, 0, -1):
            if self.stack[position].tag == tag:
                del self.stack[position:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def elements(node, tags, omit=frozenset()):
    """Yield matching descendants once, skipping excluded subtrees."""
    if node.tag in omit:
        return
    if node.tag in tags:
        yield node
    for child in node.children:
        if isinstance(child, Element):
            yield from elements(child, tags, omit)


def normalize(value):
    return re.sub(r"\s+", " ", value).strip()


def text_content(node, omit=OMITTED_TAGS):
    if node.tag in omit:
        return ""
    parts = []
    for child in node.children:
        parts.append(
            text_content(child, omit)
            if isinstance(child, Element)
            else re.sub(r"\s+", " ", child)
        )
    text = "".join(parts)
    return "\n" + text + "\n" if node.tag in BLOCK_TAGS else text


def plain_text(nodes):
    # Keep paragraph boundaries while normalizing all source indentation.
    raw = "\n".join(text_content(node, content_omissions(node)) for node in nodes)
    return "\n".join(line for part in raw.splitlines() if (line := normalize(part)))


def content_omissions(root):
    # A header within main/article can hold lesson titles and learning intents.
    # The site header is chrome only when extracting the body fallback.
    return OMITTED_TAGS - {"header"} if root.tag in {"main", "article"} else OMITTED_TAGS


def content_roots(document):
    # A main may contain many cards/articles; selecting it keeps the entire page.
    mains = list(elements(document, {"main"}, OMITTED_TAGS))
    if mains:
        return mains
    articles = list(elements(document, {"article"}, OMITTED_TAGS))
    if articles:
        return articles
    return list(elements(document, {"body"})) or [document]


def category_for(relative):
    name = relative.name
    if name.endswith("-privacy.html"):
        return "privacy"
    if name.endswith("-support.html"):
        return "support"
    if name.startswith("cortex-") or relative.parts[0] == "papers" or name == "aum-acoustic-modulation-extra-dimensions.html":
        return "research"
    if relative.parts[0] == "blog":
        return "blog"
    if relative.parts[0] == "school" or name in {"academy.html", "neuro-hub.html", "dr-k-curriculum.html", "cloud-roadmap.html"}:
        return "learning"
    if name in {"gene-tree-mmo.html", "starfall-interceptor.html"}:
        return "apps"
    if name in {"index.html", "webmcp.html"}:
        return "about"
    return "projects"


def resource_for(source):
    relative = source.relative_to(ROOT)
    parser = DocumentParser()
    parser.feed(source.read_text(encoding="utf-8-sig"))
    parser.close()
    document = parser.document
    metadata = list(elements(document, {"meta"}))
    if any((meta.attrs.get("http-equiv") or "").lower() == "refresh" for meta in metadata):
        return None
    if any(
        (meta.attrs.get("name") or "").lower() == "robots"
        and "noindex" in (meta.attrs.get("content") or "").lower()
        for meta in metadata
    ):
        return None
    roots = content_roots(document)
    text = plain_text(roots)
    if not text or re.fullmatch(r"redirecting[.\s…]*", text, re.IGNORECASE):
        return None
    titles = list(elements(document, {"title"}))
    headings = [
        value
        for root in roots
        for heading in elements(root, HEADING_TAGS, content_omissions(root))
        if (value := normalize(text_content(heading)))
    ]
    title = normalize(text_content(titles[0])) if titles else ""
    title = title or next(iter(headings), relative.stem.replace("-", " ").title())
    description = next((
        normalize(meta.attrs.get("content") or "")
        for meta in metadata
        if (meta.attrs.get("name") or "").lower() == "description"
    ), "")
    if not description:
        paragraphs = (
            normalize(text_content(paragraph))
            for root in roots
            for paragraph in elements(root, {"p"}, content_omissions(root))
        )
        description = next((paragraph for paragraph in paragraphs if len(paragraph) >= 40), title)
        if len(description) > 300:
            description = description[:297].rsplit(" ", 1)[0] + "…"
    home = relative.as_posix() == "index.html"
    return {
        "id": "home" if home else relative.with_suffix("").as_posix(),
        "path": "/" if home else "/" + relative.as_posix(),
        "title": title,
        "description": description,
        "category": category_for(relative),
        "headings": headings,
        "text": text,
    }


def build_catalog():
    sources = list(ROOT.glob("*.html"))
    for directory in CONTENT_DIRECTORIES:
        sources.extend((ROOT / directory).rglob("*.html"))
    resources = []
    for source in sorted(sources, key=lambda item: item.relative_to(ROOT).as_posix()):
        relative = source.relative_to(ROOT)
        if relative.as_posix() in EXCLUDED_ROOT_PAGES or source.is_symlink():
            continue
        resource = resource_for(source)
        if resource:
            resources.append(resource)
    resources.sort(key=lambda resource: resource["path"])
    return json.dumps({"version": 1, "resources": resources}, ensure_ascii=False, indent=2) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if the committed catalog is stale")
    args = parser.parse_args()
    catalog = build_catalog()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != catalog:
            print("WebMCP catalog is stale. Run python3 scripts/build-webmcp-catalog.py", file=sys.stderr)
            return 1
        print("WebMCP catalog is current.")
        return 0
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(catalog, encoding="utf-8")
    count = len(json.loads(catalog)["resources"])
    print(f"Wrote {count} public resources to {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
