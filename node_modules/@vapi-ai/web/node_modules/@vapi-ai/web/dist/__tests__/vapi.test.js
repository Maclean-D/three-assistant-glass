"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vapi_1 = __importDefault(require("../vapi")); // Adjust the import path based on your project structure
describe("Vapi", () => {
    let vapi;
    let mockCall;
    beforeEach(() => {
        // Mock the DailyCall object
        mockCall = {
            setLocalAudio: jest.fn(),
            localAudio: jest.fn(),
        };
        // Initialize Vapi instance and inject the mock
        vapi = new vapi_1.default("dummy_token");
        vapi["call"] = mockCall; // Assuming you have a way to set this for testing
    });
    describe("setMuted", () => {
        it("should mute the audio", () => {
            vapi["setMuted"](true);
            expect(mockCall.setLocalAudio).toHaveBeenCalledWith(false);
        });
        it("should unmute the audio", () => {
            vapi["setMuted"](false);
            expect(mockCall.setLocalAudio).toHaveBeenCalledWith(true);
        });
        it("should handle errors when call object is not available", () => {
            vapi["call"] = null; // Simulate call object not being available
            expect(() => vapi["setMuted"](true)).toThrow("Call object is not available.");
        });
    });
    describe("isMuted", () => {
        it("should return false if false", () => {
            mockCall.localAudio.mockReturnValue(false); // Initially not muted
            const res = vapi.isMuted();
            expect(res).toBe(true);
        });
        it("should return true if true", () => {
            mockCall.localAudio.mockReturnValue(true); // Initially not muted
            const res = vapi.isMuted();
            expect(res).toBe(false);
        });
        it("should return false if no call in progress", () => {
            vapi["call"] = null; // Simulate call object not being available
            const res = vapi.isMuted();
            expect(res).toBe(false);
        });
    });
});
