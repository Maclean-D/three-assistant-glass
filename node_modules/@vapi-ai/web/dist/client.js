"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
const api_1 = require("./api");
const api = new api_1.Api({
    baseUrl: "https://api.vapi.ai",
    baseApiParams: {
        secure: true,
    },
    securityWorker: async (securityData) => {
        if (securityData) {
            return {
                headers: {
                    Authorization: `Bearer ${securityData}`,
                },
            };
        }
    },
});
exports.client = api;
