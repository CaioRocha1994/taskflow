const TASKFLOW_PREFIX = "/taskflow";

function createAssetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

function withOriginHeader(response) {
  const headers = new Headers(response.headers);
  headers.set("X-TaskFlow-Origin", "cloudflare-worker");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isTaskFlowRoute = url.pathname === TASKFLOW_PREFIX
      || url.pathname.startsWith(`${TASKFLOW_PREFIX}/`);

    if (!isTaskFlowRoute) {
      return new Response("Not found", { status: 404 });
    }

    const assetPath = url.pathname.slice(TASKFLOW_PREFIX.length) || "/";
    let response = await env.ASSETS.fetch(createAssetRequest(request, assetPath));

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (response.status === 404 && request.method === "GET" && acceptsHtml) {
      response = await env.ASSETS.fetch(createAssetRequest(request, "/index.html"));
    }

    return withOriginHeader(response);
  },
};
