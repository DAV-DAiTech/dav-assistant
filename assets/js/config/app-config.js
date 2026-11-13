// Legacy browser client retained for reference only; credentials now stay in server routes.
const override = (typeof window !== "undefined" && window.DAV_CONFIG) || {};

export const CHAT = {
  apiBase: "/api",
  connectionKey: "",
  fullScreenUrl: "https://dav.edu.vn/en/",
  ...override,
};

export const SITE = {
  officialUrl: "https://www.dav.edu.vn",
  officialHost: "dav.edu.vn",
};
