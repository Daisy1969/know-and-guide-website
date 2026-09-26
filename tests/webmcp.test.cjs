"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const adapter = fs.readFileSync(path.join(root, "js/webmcp.js"), "utf8");
const publicCatalog = JSON.parse(fs.readFileSync(path.join(root, "data/webmcp-resources.json"), "utf8"));
const names = {
    search: "search_knowandguide_resources",
    read: "get_knowandguide_resource",
    open: "open_knowandguide_resource"
};

function resource(overrides = {}) {
    return {
        id: "school/example", path: "/school/example.html", title: "Example lesson",
        description: "An example learning resource.", category: "learning",
        headings: ["Example"], text: "A useful lesson.", ...overrides
    };
}

function fixture(...resources) { return { version: 1, resources }; }

function harness({ api = "modern", secure = true, pathname = "/", data = publicCatalog,
    fetchImpl, registerImpl } = {}) {
    const registered = new Map();
    const registrationCalls = [];
    const fetchCalls = [];
    const navigations = [];
    const warnings = [];
    const context = {
        registerTool(tool) {
            registrationCalls.push(tool.name);
            if (registerImpl) return registerImpl(tool);
            registered.set(tool.name, tool);
            return api === "legacy" ? undefined : Promise.resolve();
        }
    };
    const sandbox = vm.createContext({
        document: api === "modern" || api === "both" ? { modelContext: context } : {},
        navigator: api === "legacy" ? { modelContext: context } : api === "both" ? {
            modelContext: { registerTool() { throw new Error("Legacy API must not be preferred"); } }
        } : {},
        window: { isSecureContext: secure },
        location: { pathname, origin: "https://knowandguide.com", assign: url => navigations.push(url) },
        fetch: async (...args) => {
            fetchCalls.push(args);
            return fetchImpl ? fetchImpl(...args) : { ok: true, json: async () => data };
        },
        console: { warn: message => warnings.push(message) },
        URL, AbortController
    });
    const run = () => vm.runInContext(adapter, sandbox, { filename: "js/webmcp.js" });
    run();
    const raw = async (tool, input, options) => {
        assert.ok(registered.has(names[tool]), `${tool} tool must be registered`);
        return registered.get(names[tool]).execute(input, options);
    };
    const call = async (...args) => {
        const value = await raw(...args);
        return JSON.parse(typeof value === "string" ? value : value.content[0].text);
    };
    return { registered, registrationCalls, fetchCalls, navigations, warnings, run, raw, call };
}

function errorCode(result, code) {
    assert.equal(result.ok, false);
    assert.equal(result.error.code, code);
    assert.equal(typeof result.error.message, "string");
    assert.ok(result.error.message.length > 0);
}

test("current Document API registers useful tool contracts without fetching on page load", async () => {
    const h = harness();
    assert.deepEqual(h.registrationCalls, Object.values(names));
    assert.equal(h.fetchCalls.length, 0);
    for (const tool of h.registered.values()) {
        assert.equal(tool.inputSchema.type, "object");
        assert.equal(tool.inputSchema.additionalProperties, false);
        assert.equal(typeof tool.execute, "function");
    }
    assert.equal(h.registered.get(names.search).annotations.readOnlyHint, true);
    assert.equal(h.registered.get(names.read).annotations.readOnlyHint, true);
    assert.equal(h.registered.get(names.open).annotations.readOnlyHint, false);
    const result = await h.raw("search", { query: "exponents" });
    assert.equal(typeof result, "string");
    assert.equal(JSON.parse(result).ok, true);
});

test("older Navigator API uses MCP text content and marks errors", async () => {
    const h = harness({ api: "legacy" });
    const success = await h.raw("search", { query: "exponents" });
    assert.equal(success.content.length, 1);
    assert.equal(success.content[0].type, "text");
    assert.equal(JSON.parse(success.content[0].text).ok, true);
    assert.equal(success.isError, undefined);
    const failure = await h.raw("search", { query: "" });
    assert.equal(failure.isError, true);
    errorCode(JSON.parse(failure.content[0].text), "INVALID_INPUT");
});

test("Document API wins when both current and legacy APIs exist", async () => {
    const h = harness({ api: "both" });
    assert.equal(h.registered.size, 3);
    assert.equal(typeof await h.raw("search", { query: "exponents" }), "string");
    assert.deepEqual(h.warnings, []);
});

test("unsupported, insecure, admin and embedded game pages remain inactive", () => {
    for (const options of [
        { api: "unsupported" }, { secure: false }, { pathname: "/admin.html" },
        { pathname: "/handball-watch.html" },
        { pathname: "/admin/settings.html" }, { pathname: "/admin-tools.html" },
        { pathname: "/games/handball/index.html" }, { pathname: "/data/private.html" }
    ]) {
        const h = harness(options);
        assert.equal(h.registered.size, 0, JSON.stringify(options));
        assert.equal(h.fetchCalls.length, 0);
    }
});

test("repeated script inclusion does not register duplicate tools", () => {
    const h = harness({ pathname: "/school/year9-maths/week1.html" });
    h.run();
    h.run();
    assert.deepEqual(h.registrationCalls, Object.values(names));
    assert.equal(h.fetchCalls.length, 0);
});

test("registration throws and promise rejections do not break ordinary page scripts", async () => {
    for (const registerImpl of [
        () => { throw new Error("API disabled by policy"); },
        () => Promise.reject(new Error("API disabled by policy"))
    ]) {
        const h = harness({ registerImpl });
        await new Promise(setImmediate);
        assert.equal(h.registrationCalls.length, 3);
        assert.equal(h.warnings.length, 3);
        assert.equal(h.fetchCalls.length, 0);
    }
});

test("public catalog searches find actual lessons, articles, and app privacy information", async () => {
    const h = harness();
    const examples = [
        [{ query: "year 9 exponents", category: "learning" }, "school/year9-maths/week1"],
        [{ query: "Smithers crafting", category: "blog" }, "blog/smithers"],
        [{ query: "Starfall privacy", category: "privacy" }, "starfall-interceptor-privacy"]
    ];
    for (const [input, expected] of examples) {
        const result = await h.call("search", input);
        assert.equal(result.ok, true);
        assert.equal(result.results[0].resource_id, expected);
        assert.ok(result.results.every(item => item.category === input.category));
        assert.ok(result.results.every(item => item.url.startsWith("https://knowandguide.com/")));
    }
    assert.equal(h.fetchCalls.length, 1, "validated catalog should be reused");
    assert.equal(h.fetchCalls[0][0], "/data/webmcp-resources.json");
    assert.equal(h.fetchCalls[0][1].credentials, "omit");
    assert.deepEqual(h.navigations, []);
});

test("search normalizes Unicode and case, requires every term, ranks titles and caps results", async () => {
    const h = harness({ data: fixture(
        resource({ id: "a", title: "ALPHA BETA", text: "A title match" }),
        resource({ id: "b", title: "Another lesson", text: "alpha beta" }),
        resource({ id: "c", title: "Alpha only", text: "alpha" }),
        resource({ id: "d", title: "Alpha beta article", category: "blog" })
    ) });
    const result = await h.call("search", { query: " ＡＬＰＨＡ   beta alpha ", category: "learning", limit: 1 });
    assert.equal(result.ok, true);
    assert.equal(result.total, 2);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].resource_id, "a");
    const missing = await h.call("search", { query: "definitelymissing" });
    assert.equal(missing.total, 0);
    assert.deepEqual(missing.results, []);
});

test("invalid search inputs return actionable errors without network access", async () => {
    const h = harness();
    for (const input of [
        undefined, null, [], "exponents", {}, { query: "" }, { query: "  " },
        { query: "!!!" }, { query: 9 }, { query: "a".repeat(201) },
        { query: "maths", category: "private" }, { query: "maths", category: null },
        { query: "maths", limit: 0 }, { query: "maths", limit: 21 },
        { query: "maths", limit: 1.5 }, { query: "maths", limit: "5" },
        { query: "maths", limit: NaN }, { query: "maths", limit: Infinity },
        { query: "maths", arbitrary: true }
    ]) errorCode(await h.call("search", input), "INVALID_INPUT");
    assert.equal(h.fetchCalls.length, 0);
});

test("reading public resource returns bounded text and usable source metadata", async () => {
    const h = harness();
    const result = await h.call("read", { resource_id: "school/year9-maths/week1", max_chars: 500 });
    assert.equal(result.ok, true);
    assert.equal(result.url, "https://knowandguide.com/school/year9-maths/week1.html");
    assert.ok(result.headings.includes("Exponent Laws"));
    assert.ok(result.text.length <= 500);
    assert.ok(result.total_chars >= result.text.length);
    assert.equal(result.offset, 0);
    assert.deepEqual(h.navigations, []);
});

test("pagination reconstructs a resource without gaps and terminates at its end", async () => {
    const text = Array.from({ length: 1700 }, (_, index) => String.fromCharCode(65 + index % 26)).join("");
    const h = harness({ data: fixture(resource({ text })) });
    let offset = 0;
    let combined = "";
    do {
        const result = await h.call("read", { resource_id: "school/example", offset, max_chars: 500 });
        assert.equal(result.ok, true);
        assert.equal(result.offset, offset);
        assert.equal(result.total_chars, text.length);
        assert.ok(result.text.length <= 500);
        combined += result.text;
        offset = result.next_offset;
    } while (offset !== null);
    assert.equal(combined, text);
    const end = await h.call("read", { resource_id: "school/example", offset: text.length });
    assert.equal(end.text, "");
    assert.equal(end.next_offset, null);
    errorCode(await h.call("read", { resource_id: "school/example", offset: text.length + 1 }), "INVALID_INPUT");
});

test("invalid read parameters are rejected before fetching", async () => {
    const h = harness();
    for (const input of [
        {}, { resource_id: "" }, { resource_id: 7 }, { resource_id: "x".repeat(201) },
        { resource_id: "home", offset: -1 }, { resource_id: "home", offset: 0.5 },
        { resource_id: "home", offset: Number.MAX_SAFE_INTEGER + 1 },
        { resource_id: "home", max_chars: 499 }, { resource_id: "home", max_chars: 12001 },
        { resource_id: "home", max_chars: "6000" }, { resource_id: "home", url: "https://example.com" }
    ]) errorCode(await h.call("read", input), "INVALID_INPUT");
    assert.equal(h.fetchCalls.length, 0);
});

test("navigation accepts catalog IDs, rejects arbitrary URLs and admin paths", async () => {
    const h = harness();
    for (const resource_id of [
        "https://example.com/", "https://knowandguide.com/admin.html", "/admin.html",
        "admin", "../admin", "javascript:alert(1)", "//example.com/", "/school/year9-maths/week1.html"
    ]) errorCode(await h.call("open", { resource_id }), "NOT_FOUND");
    errorCode(await h.call("open", { resource_id: "home", url: "https://example.com/" }), "INVALID_INPUT");
    assert.deepEqual(h.navigations, []);
    const result = await h.call("open", { resource_id: "school/year9-maths/week1" });
    assert.equal(result.ok, true);
    assert.equal(result.action, "navigation_requested");
    assert.deepEqual(h.navigations, ["https://knowandguide.com/school/year9-maths/week1.html"]);
});

test("pre-cancelled search, read and navigation perform no fetch or navigation", async () => {
    const h = harness();
    const controller = new AbortController();
    controller.abort();
    for (const [tool, input] of [
        ["search", { query: "exponents" }],
        ["read", { resource_id: "home" }],
        ["open", { resource_id: "home" }]
    ]) errorCode(await h.call(tool, input, { signal: controller.signal }), "CANCELLED");
    assert.equal(h.fetchCalls.length, 0);
    assert.deepEqual(h.navigations, []);
});

test("an aborted in-flight fetch does not poison the next search", async () => {
    let attempts = 0;
    const h = harness({ fetchImpl: (_url, { signal }) => {
        if (++attempts > 1) return { ok: true, json: async () => publicCatalog };
        return new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        });
    } });
    const controller = new AbortController();
    const pending = h.call("search", { query: "exponents" }, { signal: controller.signal });
    assert.equal(h.fetchCalls[0][1].signal, controller.signal);
    controller.abort();
    errorCode(await pending, "CANCELLED");
    const retry = await h.call("search", { query: "exponents" });
    assert.equal(retry.ok, true);
    assert.ok(retry.total > 0);
    assert.equal(attempts, 2);
});

test("cancellation during body parsing prevents cached results and navigation", async () => {
    let resolveBody;
    let attempts = 0;
    const h = harness({ fetchImpl: async () => ({ ok: true, json: () => {
        if (++attempts > 1) return publicCatalog;
        return new Promise(resolve => { resolveBody = resolve; });
    } }) });
    const controller = new AbortController();
    const pending = h.call("open", { resource_id: "home" }, { signal: controller.signal });
    await new Promise(setImmediate);
    assert.equal(typeof resolveBody, "function", "catalog body parsing should be pending");
    controller.abort();
    resolveBody(publicCatalog);
    errorCode(await pending, "CANCELLED");
    assert.deepEqual(h.navigations, []);
    assert.equal((await h.call("search", { query: "exponents" })).ok, true);
    assert.equal(h.fetchCalls.length, 2);
});

test("network, HTTP and JSON failures remain retryable and do not leak internal errors", async () => {
    for (const fail of [
        () => { throw new Error("internal connection details"); },
        () => ({ ok: false, json: () => { throw new Error("must not parse"); } }),
        () => ({ ok: true, json: () => { throw new SyntaxError("private parsing details"); } })
    ]) {
        let attempts = 0;
        const h = harness({ fetchImpl: () => ++attempts === 1 ? fail() : { ok: true, json: async () => publicCatalog } });
        const failed = await h.call("search", { query: "exponents" });
        errorCode(failed, "CATALOG_UNAVAILABLE");
        assert.doesNotMatch(failed.error.message, /internal|private parsing/);
        assert.equal((await h.call("search", { query: "exponents" })).ok, true);
        assert.equal(attempts, 2);
    }
});

test("malformed catalogs fail closed, perform no navigation, and can be retried", async () => {
    const malformed = [
        null, {}, { version: 2, resources: [] }, { version: 1, resources: {} },
        fixture(null), fixture(resource(), resource()),
        fixture(resource({ id: 10 })), fixture(resource({ category: "admin" })),
        fixture(resource({ text: null })), fixture(resource({ title: null })),
        fixture(resource({ description: null })), fixture(resource({ headings: [null] })),
        fixture(resource({ path: "https://example.com/lesson.html" })),
        fixture(resource({ path: "//example.com/lesson.html" })),
        fixture(resource({ path: "/admin.html" })),
        fixture(resource({ path: "/games/example.html" })),
        fixture(resource({ path: "/school/../admin.html" })),
        fixture(resource({ path: "/school/%2e%2e/admin.html" })),
        fixture(resource({ path: "/school/example.html?redirect=https://example.com" })),
        fixture(resource({ path: ["/school/example.html"] }))
    ];
    for (const data of malformed) {
        let attempts = 0;
        const h = harness({ fetchImpl: async () => ({ ok: true, json: async () => ++attempts === 1 ? data : publicCatalog }) });
        const result = await h.call("open", { resource_id: "school/example" });
        assert.equal(result.ok, false, `Malformed catalog must be rejected: ${JSON.stringify(data)}`);
        errorCode(result, "CATALOG_UNAVAILABLE");
        assert.deepEqual(h.navigations, []);
        assert.equal((await h.call("search", { query: "exponents" })).ok, true);
    }
});

test("catalog pages load the adapter exactly once with defer; admin and game embeds do not", () => {
    const scriptTags = html => [...html.matchAll(/<script\b[^>]*>/gi)].map(match => match[0]);
    const adapterSource = /\ssrc\s*=\s*(?:"\/js\/webmcp\.js"|'\/js\/webmcp\.js'|\/js\/webmcp\.js(?=[\s>]))/i;
    const deferred = /\sdefer(?=\s|=|>)/i;
    assert.ok(publicCatalog.resources.length > 0, "public catalog should contain resources");

    for (const item of publicCatalog.resources) {
        const relative = item.path === "/" ? "index.html" : item.path.slice(1);
        const file = path.resolve(root, relative);
        assert.ok(file.startsWith(root + path.sep), `${item.path} must stay within the site`);
        assert.equal(path.extname(file), ".html", `${item.path} must reference an HTML page`);
        assert.ok(fs.existsSync(file) && fs.statSync(file).isFile(), `${item.path} must exist`);
        const scripts = scriptTags(fs.readFileSync(file, "utf8")).filter(tag => adapterSource.test(tag));
        assert.equal(scripts.length, 1, `${item.path} must include the WebMCP adapter exactly once`);
        assert.match(scripts[0], deferred, `${item.path} must defer the adapter`);
        assert.doesNotMatch(item.path, /^\/(?:admin\.html|handball-watch\.html|watch\/|handball-agent-watch\/)/,
            `${item.path} must not expose an excluded surface in the public catalog`);
    }

    function htmlFiles(directory) {
        if (!fs.existsSync(directory)) return [];
        return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
            const file = path.join(directory, entry.name);
            return entry.isDirectory() ? htmlFiles(file) : entry.isFile() && file.endsWith(".html") ? [file] : [];
        });
    }
    const excludedPages = [
        path.join(root, "admin.html"),
        path.join(root, "handball-watch.html"),
        ...htmlFiles(path.join(root, "watch")),
        ...htmlFiles(path.join(root, "handball-agent-watch")),
        ...htmlFiles(path.join(root, "games"))
    ];
    for (const file of excludedPages) {
        const scripts = scriptTags(fs.readFileSync(file, "utf8")).filter(tag => /\bwebmcp\.js\b/i.test(tag));
        assert.equal(scripts.length, 0, `${path.relative(root, file)} must not load WebMCP`);
    }
});
