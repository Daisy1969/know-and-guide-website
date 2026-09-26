# WebMCP integration

Know & Guide exposes three browser tools for its public content catalogue. The shared adapter is loaded with a deferred `/js/webmcp.js` script on public HTML pages at the root and in `blog/`, `school/`, and `papers/`. `admin.html`, `handball-watch.html`, the `watch/` and `handball-agent-watch/` directories, and redirect stubs with a meta refresh are excluded. The public help page is `/webmcp.html`, linked from the home-page footer.

## Tool contract

| Tool | Inputs | Behavior |
| --- | --- | --- |
| `search_knowandguide_resources` | `query`: string, 1–200 characters; optional `category`: `learning`, `blog`, `research`, `apps`, `support`, `privacy`, `projects`, or `about`; optional `limit`: integer 1–20, default 5 | Searches the public catalogue and returns resource IDs with matching resource details. |
| `get_knowandguide_resource` | `resource_id`: an ID returned by search; optional `offset`: integer ≥ 0, default 0; optional `max_chars`: integer 500–12000, default 6000 | Returns a paginated slice of the indexed public text. Use the pagination information in the result to request the next slice. |
| `open_knowandguide_resource` | `resource_id`: an ID returned by search | Navigates the current tab to that resource’s allowlisted same-origin page. |

Search for a resource first and use its returned ID. Do not guess IDs or pass arbitrary URLs to the navigation tool. Indexed text is a publication snapshot; interactive state, media, and external app content are outside the catalogue.

## Browser availability

WebMCP is an experimental proposed standard. The adapter detects the current `document.modelContext` API and falls back to the earlier `navigator.modelContext` API when available. It does not install a polyfill, create a remote MCP server, or make an unsupported browser agent-capable. Browsers without the native API continue to use the site normally.

The [Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) describes an origin trial from Chrome 149 and a local testing flag:

1. In a supporting Chrome version, open `chrome://flags/#enable-webmcp-testing`.
2. Enable the flag and relaunch Chrome.
3. Open the site over HTTPS, or serve the repository on localhost for development.
4. Use the Model Context Tool Inspector extension linked from the Chrome guide to inspect and invoke the three tools.

No origin-trial token is configured in this change. Production tool availability therefore depends on the browser's enabled support; deploying these scripts alone does not enable WebMCP for every visitor. Do not enable `document.domain` or set `Origin-Agent-Cluster: ?0`, which can disable the API. Cross-origin iframe access is not configured.

The native console example below is for Chrome 155 and later and follows the [current imperative API documentation](https://developer.chrome.com/docs/ai/webmcp/imperative-api), reviewed September 26, 2026. It uses the tool descriptor returned by `getTools()`, with object arguments.

```js
const tools = await document.modelContext.getTools();
const search = tools.find(
  tool => tool.name === "search_knowandguide_resources"
);
const args = {
  query: "Year 9 maths",
  category: "learning",
  limit: 5
};
await document.modelContext.executeTool(search, args);
```

For Chrome 153–154, replace the last line with `await document.modelContext.executeTool(search, JSON.stringify(args))`. The native Chrome 153 check used this JSON-string form. Earlier experimental browsers can have different testing APIs; use a compatible inspector or their version-specific documentation.

## Catalogue maintenance and verification

Run these commands from the repository root after editing public content:

```sh
python3 scripts/build-webmcp-catalog.py
python3 scripts/build-webmcp-catalog.py --check
node --test tests/webmcp.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

The first command regenerates the static catalogue. The second checks that the committed catalogue agrees with the current source pages. The Node tests exercise tool logic and browser API registration through mocks; they do not prove interoperability with a native WebMCP implementation or an external agent.

The maintenance gate in `.github/workflows/webmcp-checks.yml` checks catalogue freshness, adapter JavaScript syntax, and the Node test suite. Regenerate and include the catalogue whenever a public source page changes so the freshness check passes.

For a native browser smoke test, confirm the following using an enabled browser and its inspector:

- All three tool names are present on the home page and a nested blog or lesson page.
- A learning search such as `Year 9 maths` returns useful resource IDs.
- Reading one returned ID gives public text, and pagination reads the next section of a long resource.
- Invalid IDs and out-of-range parameters produce an error without navigation.
- Opening a valid returned ID navigates the current tab to the expected same-origin page. Perform this check last because it leaves the current document.
- An ordinary browser without WebMCP still renders the site and follows normal links.

When reporting validation, distinguish automated/mock checks from an actual enabled-browser test. Do not claim native agent interoperability from the automated suite alone.

### Native validation recorded September 26, 2026

An enabled Chrome 153 browser passed native API checks for registration of the three tools, search for `year 9 exponents`, reading with 500-character pagination, rejection of an external resource ID, and navigation to `/blog/smithers.html`. The tools registered again on the destination page. The admin page exposed none of these tools. A 390-pixel-wide mobile viewport check found no horizontal overflow or page errors.

These checks exercised the native browser API; they were separate from the mocked Node suite. They do not establish compatibility with every browser version or end-to-end conversations with an external AI agent. Chrome 155 object-argument syntax is documented above but was not the browser version used for this native check.

## Privacy and scope

The integration reads a static public catalogue and permits only allowlisted same-origin navigation. It adds no AI backend, API key, query analytics, form access, form submission, or account actions. It neither reads admin data nor automates apps on subdomains. Existing site features and third-party services keep their separate behavior and policies. The user’s browser or assistant may process tool requests under its own settings.

## Reference

This implementation was inspired by the [ByteGrad video supplied in the request](https://www.youtube.com/watch?v=2HZOBs4sJlQ). Its description was reviewed; a transcript was unavailable, so this documentation does not claim a full review of the video. API decisions follow the official Chrome documentation linked above rather than assuming the video reflects the latest experimental API.
