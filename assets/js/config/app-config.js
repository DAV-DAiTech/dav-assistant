// connectionKey is the public widget key already shipped in the page; it is not a secret.
// The API only issues sessions to origins allowlisted in the FPT AI console.
const override = (typeof window !== "undefined" && window.DAV_CONFIG) || {};

export const CHAT = {
  apiBase: "https://console-agents.fpt.ai/direct-bff/v1",
  connectionKey: "wgt__u-Owby-sZBPvCC0_5h-Gw",
  fullScreenUrl: "https://console-agents.fpt.ai/chat-widget/?connectionKey=wgt__u-Owby-sZBPvCC0_5h-Gw",
  ...override,
};

export const SITE = {
  officialUrl: "https://www.dav.edu.vn",
  officialHost: "dav.edu.vn",
};
