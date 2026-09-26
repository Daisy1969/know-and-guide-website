/* Public, browser-local tools. See /webmcp.html and docs/webmcp.md. */
(() => {
    "use strict";

    // The current API lives on Document; early Chrome previews used Navigator.
    const modern = typeof document.modelContext?.registerTool === "function";
    const context = modern ? document.modelContext : navigator.modelContext;
    if (typeof context?.registerTool !== "function" || !window.isSecureContext) return;
    // Never register tools in admin, game embeds, or an unrelated document.
    const allowedPath = path => typeof path === "string" && path !== "/handball-watch.html" && (path === "/" || /^\/(?!admin(?:[.-]|\/))(?:(?:blog|school|papers)\/[a-zA-Z0-9_/-]+|[a-zA-Z0-9_-]+)\.html$/.test(path));
    if (!allowedPath(location.pathname)) return;
    const marker = Symbol.for("knowandguide.webmcp");
    if (window[marker]) return;
    window[marker] = true;

    const categories = ["learning", "blog", "research", "apps", "support", "privacy", "projects", "about"];
    let catalog;
    class ToolError extends Error {
        constructor(code, message) { super(message); this.code = code; }
    }
    const fail = (message) => { throw new ToolError("INVALID_INPUT", message); };
    const checkAbort = signal => { if (signal?.aborted) throw new ToolError("CANCELLED", "The request was cancelled."); };
    const normalize = text => text.normalize("NFKC").toLocaleLowerCase("en");
    function objectInput(input, keys) {
        if (!input || typeof input !== "object" || Array.isArray(input)) fail("Provide an input object.");
        if (Object.keys(input).some(key => !keys.includes(key))) fail("An input property is not supported.");
        return input;
    }
    function integer(value, fallback, min, max, name) {
        if (value === undefined) return fallback;
        if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${name} must be an integer between ${min} and ${max}.`);
        return value;
    }
    async function resources(signal) {
        checkAbort(signal);
        if (catalog) return catalog;
        let data;
        try {
            const response = await fetch("/data/webmcp-resources.json", { credentials: "omit", signal });
            if (!response.ok) throw new Error("Catalog unavailable");
            data = await response.json();
        } catch (_) {
            checkAbort(signal);
            throw new ToolError("CATALOG_UNAVAILABLE", "Public resource search is temporarily unavailable. Try again or browse https://knowandguide.com/.");
        }
        checkAbort(signal);
        const ids = new Set();
        if (data?.version !== 1 || !Array.isArray(data.resources) || !data.resources.every(item => {
            if (!item || typeof item.id !== "string" || ids.has(item.id) || !allowedPath(item.path) ||
                typeof item.title !== "string" || typeof item.description !== "string" || typeof item.text !== "string" ||
                !Array.isArray(item.headings) || !item.headings.every(h => typeof h === "string") || !categories.includes(item.category)) return false;
            ids.add(item.id);
            return true;
        })) throw new ToolError("CATALOG_UNAVAILABLE", "The public resource index is invalid. Please browse the site directly.");
        catalog = data.resources;
        return catalog;
    }
    function summary(item) {
        return { resource_id: item.id, title: item.title, description: item.description, category: item.category, url: new URL(item.path, location.origin).href };
    }
    async function findResource(id, signal) {
        if (typeof id !== "string" || !id || id.length > 200) fail("resource_id must be an ID returned by search_knowandguide_resources.");
        const item = (await resources(signal)).find(item => item.id === id);
        if (!item) throw new ToolError("NOT_FOUND", "No public resource has that ID. Search first and use a returned resource_id.");
        return item;
    }
    // Current WebMCP callbacks return strings. Early Navigator previews used MCP content objects.
    function output(data) {
        const text = JSON.stringify(data);
        return modern ? text : { content: [{ type: "text", text }], ...(data.ok === false ? { isError: true } : {}) };
    }
    function handler(run) {
        return async (input, options = {}) => {
            try {
                checkAbort(options?.signal);
                return output({ ok: true, ...await run(input, options?.signal) });
            } catch (error) {
                return output({ ok: false, error: { code: error instanceof ToolError ? error.code : "TOOL_ERROR", message: error instanceof ToolError ? error.message : "The request could not be completed. Please try again." } });
            }
        };
    }
    const readAnnotations = { readOnlyHint: true, consequentialHint: false, untrustedContentHint: true };
    const resourceId = { type: "string", minLength: 1, maxLength: 200, description: "Exact resource_id from search_knowandguide_resources. URLs are not accepted." };
    const tools = [
        {
            name: "search_knowandguide_resources",
            description: "Find public Know & Guide learning hubs, maths lessons, articles, research, app support and privacy pages by keywords, e.g. 'year 9 exponents' or 'Smithers crafting'. Returns resource IDs and links; does not navigate. Searches the published site index, not subdomain apps or private/admin data.",
            inputSchema: {
                type: "object", additionalProperties: false,
                properties: {
                    query: { type: "string", minLength: 1, maxLength: 200, description: "Search keywords, not a full question." },
                    category: { type: "string", enum: categories, description: "Optional resource category." },
                    limit: { type: "integer", minimum: 1, maximum: 20, default: 5 }
                }, required: ["query"]
            }, annotations: readAnnotations,
            execute: handler(async (input, signal) => {
                const { query, category, limit } = objectInput(input, ["query", "category", "limit"]);
                if (typeof query !== "string" || !query.trim() || query.length > 200) fail("query must contain 1 to 200 characters.");
                if (category !== undefined && !categories.includes(category)) fail("Choose a category listed in the tool schema.");
                const count = integer(limit, 5, 1, 20, "limit");
                const terms = [...new Set(normalize(query).match(/[\p{L}\p{N}]+/gu) || [])];
                if (!terms.length) fail("query must contain letters or numbers.");
                const results = (await resources(signal)).filter(item => !category || item.category === category).map(item => {
                    const fields = [item.title, item.description, item.headings.join(" "), item.text].map(normalize);
                    const weights = [12, 6, 4, 1];
                    const matches = terms.map(term => fields.reduce((score, field, index) => score + (field.includes(term) ? weights[index] : 0), 0));
                    return { item, score: matches.every(Boolean) ? matches.reduce((a, b) => a + b, 0) : 0 };
                }).filter(hit => hit.score > 0).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
                checkAbort(signal);
                return { query: query.trim(), total: results.length, results: results.slice(0, count).map(({ item }) => summary(item)) };
            })
        },
        {
            name: "get_knowandguide_resource",
            description: "Read a public Know & Guide resource found by search. Returns indexed page text, headings and a source link; use next_offset to read more. This is published informational content, not access to an app, account, live student progress or admin data.",
            inputSchema: {
                type: "object", additionalProperties: false,
                properties: {
                    resource_id: resourceId,
                    offset: { type: "integer", minimum: 0, default: 0 },
                    max_chars: { type: "integer", minimum: 500, maximum: 12000, default: 6000 }
                }, required: ["resource_id"]
            }, annotations: readAnnotations,
            execute: handler(async (input, signal) => {
                const { resource_id, offset, max_chars } = objectInput(input, ["resource_id", "offset", "max_chars"]);
                const start = integer(offset, 0, 0, Number.MAX_SAFE_INTEGER, "offset");
                const size = integer(max_chars, 6000, 500, 12000, "max_chars");
                const item = await findResource(resource_id, signal);
                if (start > item.text.length) fail("offset exceeds this resource's total_chars.");
                const end = Math.min(start + size, item.text.length);
                checkAbort(signal);
                return { ...summary(item), headings: item.headings, text: item.text.slice(start, end), offset: start, total_chars: item.text.length, next_offset: end < item.text.length ? end : null };
            })
        },
        {
            name: "open_knowandguide_resource",
            description: "Open a public Know & Guide resource in the user's current browser tab. Call when the user wants to visit a result. Only IDs from the public resource index are accepted. This navigates away from the current page; it does not submit forms or perform purchases.",
            inputSchema: { type: "object", additionalProperties: false, properties: { resource_id: resourceId }, required: ["resource_id"] },
            annotations: { readOnlyHint: false, consequentialHint: false, untrustedContentHint: false },
            execute: handler(async (input, signal) => {
                const { resource_id } = objectInput(input, ["resource_id"]);
                const item = await findResource(resource_id, signal);
                checkAbort(signal);
                const url = new URL(item.path, location.origin).href;
                location.assign(url);
                return { resource_id: item.id, url, action: "navigation_requested" };
            })
        }
    ];
    // Registration failures must not affect the site's ordinary scripts or navigation.
    for (const tool of tools) {
        try {
            Promise.resolve(context.registerTool(tool)).catch(() => console.warn(`Know & Guide: WebMCP tool ${tool.name} could not register.`));
        } catch (_) {
            console.warn(`Know & Guide: WebMCP tool ${tool.name} could not register.`);
        }
    }
})();
