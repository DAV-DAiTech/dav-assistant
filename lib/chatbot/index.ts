import * as eos from "./eosAdapter";
import * as mock from "./mockAdapter";

export const isMock = () => process.env.MOCK_CHATBOT === "true";
export const getAdapter = () => (isMock() ? mock : eos);
export { eosConfigured } from "./eosAdapter";
