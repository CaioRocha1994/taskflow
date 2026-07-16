export const TASKFLOW_PATHS = {
  landing: "/taskflow",
  login: "/taskflow/login",
  app: "/taskflow/app",
} as const;

function normalizePath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function isTaskFlowLandingPath(pathname = window.location.pathname) {
  const path = normalizePath(pathname);
  return path === "/" || path === TASKFLOW_PATHS.landing;
}

export function isTaskFlowLoginPath(pathname = window.location.pathname) {
  return normalizePath(pathname) === TASKFLOW_PATHS.login;
}

export function taskFlowUrl(path: string, search = "") {
  return new URL(`${path}${search}`, window.location.origin).toString();
}
