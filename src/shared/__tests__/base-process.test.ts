import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BaseProcess } from "../base-process.js";
import { envelopeSchema } from "../../protocol.js";

describe("BaseProcess", () => {
    let bp: BaseProcess;
    const processName = "test-process";

    beforeEach(() => {
        bp = new BaseProcess({ processName, heartbeatInterval: 100 });
    });

    afterEach(() => {
        bp.stop();
    });

    it("should start with 'starting' status", () => {
        // @ts-ignore - reaching into protected for test
        expect(bp.status).toBe("starting");
    });

    it("should change status to 'ready' on start", () => {
        bp.start();
        // @ts-ignore
        expect(bp.status).toBe("ready");
    });

    it("should emit heartbeats periodically", async () => {
        const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

        bp.start();

        // Wait for at least two heartbeats (one on start, one after 100ms)
        await new Promise(resolve => setTimeout(resolve, 150));

        expect(stdoutSpy).toHaveBeenCalled();

        const output = stdoutSpy.mock.calls.map(call => call[0].toString());
        const heartbeats = output.map(line => JSON.parse(line))
            .filter(env => env.type === "event.system.heartbeat");

        expect(heartbeats.length).toBeGreaterThanOrEqual(2);
        expect(heartbeats[0].payload.status).toBe("ready");
        expect(heartbeats[0].from).toBe(processName);

        stdoutSpy.mockRestore();
    });

    it("should include memory and uptime in heartbeat", async () => {
        const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

        bp.start();

        await new Promise(resolve => setTimeout(resolve, 50));

        const line = stdoutSpy.mock.calls[0][0].toString();
        const env = JSON.parse(line);

        expect(env.payload.memory).toBeDefined();
        expect(env.payload.memory.rss).toBeGreaterThan(0);
        expect(env.payload.uptime).toBeGreaterThanOrEqual(0);

        stdoutSpy.mockRestore();
    });
});
