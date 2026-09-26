"""Public-content extraction regressions; run with unittest discovery."""

import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "webmcp_catalog", Path(__file__).resolve().parents[1] / "scripts/build-webmcp-catalog.py"
)
catalog = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(catalog)


class CatalogExtractionTests(unittest.TestCase):
    def resource(self, html, relative="school/year9-maths/example.html"):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / relative
            source.parent.mkdir(parents=True, exist_ok=True)
            source.write_text(html, encoding="utf-8")
            with patch.object(catalog, "ROOT", root):
                return catalog.resource_for(source)

    def test_main_preserves_lesson_header_and_normalizes_inline_text(self):
        result = self.resource("""
            <html><head><title>Year 9 &amp; Maths</title></head><body>
            <header><h1>Site header</h1><nav>Site navigation</nav></header>
            <main><header><span>Week 2</span><h2>Units &amp; Length</h2>
            <p>Learning Intent: Choose units &amp; convert between them.</p></header>
            <p>A paragraph\n with <strong>inline</strong> text &amp; entities.</p>
            <nav>Lesson navigation</nav><style>.not-content { color: red }</style>
            <script>notPublicContent()</script><footer>Internal footer</footer></main>
            <footer>Site footer</footer></body></html>
        """)
        self.assertEqual(result["title"], "Year 9 & Maths")
        self.assertEqual(result["headings"], ["Units & Length"])
        self.assertEqual(result["description"], "Learning Intent: Choose units & convert between them.")
        self.assertEqual(result["text"], "\n".join([
            "Week 2", "Units & Length",
            "Learning Intent: Choose units & convert between them.",
            "A paragraph with inline text & entities.",
        ]))

    def test_article_fallback_keeps_article_header(self):
        result = self.resource("""
            <body><header>Site header</header>
            <article><header><h1>Article title</h1><p>Article introduction.</p></header>
            <p>Article content.</p></article><footer>Footer</footer></body>
        """, "blog/example.html")
        self.assertEqual(result["title"], "Article title")
        self.assertEqual(result["headings"], ["Article title"])
        self.assertEqual(result["text"], "Article title\nArticle introduction.\nArticle content.")
        self.assertEqual(result["category"], "blog")

    def test_body_fallback_excludes_site_chrome_and_active_content(self):
        result = self.resource("""
            <body><header><h1>Site heading</h1></header><nav>Navigation</nav>
            <section><h1>Learning hub</h1><p>Public information.</p></section>
            <script>secret()</script><style>private-style</style>
            <template>Template contents</template><noscript>Fallback UI</noscript>
            <footer>Footer</footer></body>
        """, "academy.html")
        self.assertEqual(result["headings"], ["Learning hub"])
        self.assertEqual(result["text"], "Learning hub\nPublic information.")
        self.assertEqual(result["category"], "learning")

    def test_metadata_and_resource_identity(self):
        result = self.resource("""
            <head><title>Support &amp; help</title>
            <meta name="description" content="Answers &amp; troubleshooting."></head>
            <body><main><h1>Help</h1><p>Public support.</p></main></body>
        """, "example-support.html")
        self.assertEqual(result["title"], "Support & help")
        self.assertEqual(result["description"], "Answers & troubleshooting.")
        self.assertEqual(result["id"], "example-support")
        self.assertEqual(result["path"], "/example-support.html")
        self.assertEqual(result["category"], "support")

    def test_noindex_and_redirect_stubs_are_excluded(self):
        examples = [
            '<head><meta name="ROBOTS" content="NOINDEX, nofollow"></head><body><main>Private</main></body>',
            '<head><meta http-equiv="Refresh" content="0; url=/"></head><body>Moved</body>',
            '<body>Redirecting…<script>location.replace("/")</script></body>',
            '<head><script>location.replace("/")</script></head><body></body>',
        ]
        for html in examples:
            with self.subTest(html=html):
                self.assertIsNone(self.resource(html))

    def test_home_identity_and_long_content_are_preserved(self):
        text = "Full public content. " * 2500
        result = self.resource(f"<body><main><h1>Home</h1><p>{text}</p></main></body>", "index.html")
        self.assertEqual(result["id"], "home")
        self.assertEqual(result["path"], "/")
        self.assertEqual(result["category"], "about")
        self.assertEqual(result["text"], "Home\n" + text.strip())


if __name__ == "__main__":
    unittest.main()
