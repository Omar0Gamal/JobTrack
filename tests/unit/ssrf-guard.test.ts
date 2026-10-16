import { describe, it, expect } from "vitest";
import {
  isPrivateOrReservedIp,
  validateSafeExternalUrl,
} from "@/server/security/ssrf-guard";

describe("SSRF Guard - IP Range & Safe URL Validator", () => {
  describe("isPrivateOrReservedIp", () => {
    describe("IPv4 Loopback (127.0.0.0/8)", () => {
      it("blocks standard loopback addresses", () => {
        expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
        expect(isPrivateOrReservedIp("127.0.0.2")).toBe(true);
        expect(isPrivateOrReservedIp("127.255.255.255")).toBe(true);
      });
    });

    describe("RFC 1918 Private Address Spaces", () => {
      it("blocks 10.0.0.0/8 private ranges", () => {
        expect(isPrivateOrReservedIp("10.0.0.1")).toBe(true);
        expect(isPrivateOrReservedIp("10.10.10.10")).toBe(true);
        expect(isPrivateOrReservedIp("10.255.255.255")).toBe(true);
      });

      it("blocks 172.16.0.0/12 private ranges", () => {
        expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
        expect(isPrivateOrReservedIp("172.24.1.100")).toBe(true);
        expect(isPrivateOrReservedIp("172.31.255.255")).toBe(true);
      });

      it("does not block addresses outside 172.16.0.0/12 range", () => {
        expect(isPrivateOrReservedIp("172.15.255.255")).toBe(false);
        expect(isPrivateOrReservedIp("172.32.0.1")).toBe(false);
      });

      it("blocks 192.168.0.0/16 private ranges", () => {
        expect(isPrivateOrReservedIp("192.168.0.1")).toBe(true);
        expect(isPrivateOrReservedIp("192.168.1.1")).toBe(true);
        expect(isPrivateOrReservedIp("192.168.254.254")).toBe(true);
        expect(isPrivateOrReservedIp("192.168.255.255")).toBe(true);
      });
    });

    describe("Cloud Metadata & Link-Local (169.254.0.0/16)", () => {
      it("blocks AWS / GCP / Azure metadata service address", () => {
        expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true);
      });

      it("blocks general link-local addresses", () => {
        expect(isPrivateOrReservedIp("169.254.0.1")).toBe(true);
        expect(isPrivateOrReservedIp("169.254.1.1")).toBe(true);
        expect(isPrivateOrReservedIp("169.254.255.255")).toBe(true);
      });
    });

    describe("Shared Address Space / CGNAT (100.64.0.0/10)", () => {
      it("blocks Carrier-Grade NAT addresses", () => {
        expect(isPrivateOrReservedIp("100.64.0.1")).toBe(true);
        expect(isPrivateOrReservedIp("100.100.50.1")).toBe(true);
        expect(isPrivateOrReservedIp("100.127.255.255")).toBe(true);
      });

      it("does not block addresses outside 100.64.0.0/10 range", () => {
        expect(isPrivateOrReservedIp("100.63.255.255")).toBe(false);
        expect(isPrivateOrReservedIp("100.128.0.1")).toBe(false);
      });
    });

    describe("IPv6 Loopback & Unspecified", () => {
      it("blocks ::1 and ::", () => {
        expect(isPrivateOrReservedIp("::1")).toBe(true);
        expect(isPrivateOrReservedIp("::")).toBe(true);
        expect(isPrivateOrReservedIp("[::1]")).toBe(true);
      });
    });

    describe("IPv6 Unique Local (fc00::/7)", () => {
      it("blocks fc00:: and fd00:: addresses", () => {
        expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
        expect(isPrivateOrReservedIp("fd00::1")).toBe(true);
        expect(isPrivateOrReservedIp("fd12:3456:789a::1")).toBe(true);
        expect(isPrivateOrReservedIp("fdfe:dcba:9876::1")).toBe(true);
      });
    });

    describe("IPv6 Link-Local (fe80::/10)", () => {
      it("blocks fe80:: addresses", () => {
        expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
        expect(isPrivateOrReservedIp("fe80::215:5dff:fe1a:9f8b")).toBe(true);
        expect(isPrivateOrReservedIp("febf::ffff")).toBe(true);
      });
    });

    describe("IPv4-Mapped IPv6 Addresses (::ffff:x.x.x.x)", () => {
      it("blocks loopback in mapped format", () => {
        expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true);
      });

      it("blocks cloud metadata in mapped format", () => {
        expect(isPrivateOrReservedIp("::ffff:169.254.169.254")).toBe(true);
      });

      it("blocks private RFC 1918 ranges in mapped format", () => {
        expect(isPrivateOrReservedIp("::ffff:10.0.0.1")).toBe(true);
        expect(isPrivateOrReservedIp("::ffff:172.16.0.1")).toBe(true);
        expect(isPrivateOrReservedIp("::ffff:192.168.1.1")).toBe(true);
      });

      it("permits public IPv4 in mapped format", () => {
        expect(isPrivateOrReservedIp("::ffff:8.8.8.8")).toBe(false);
        expect(isPrivateOrReservedIp("::ffff:1.1.1.1")).toBe(false);
      });
    });

    describe("Public IP Addresses", () => {
      it("permits standard public IPv4 and IPv6 addresses", () => {
        expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
        expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
        expect(isPrivateOrReservedIp("93.184.216.34")).toBe(false);
        expect(isPrivateOrReservedIp("142.250.190.46")).toBe(false);
        expect(isPrivateOrReservedIp("2607:f8b0:4005:805::200e")).toBe(false);
      });
    });

    describe("Malformed or Invalid Inputs", () => {
      it("treats invalid strings and empty inputs as reserved/blocked", () => {
        expect(isPrivateOrReservedIp("")).toBe(true);
        expect(isPrivateOrReservedIp("not-an-ip")).toBe(true);
        expect(isPrivateOrReservedIp("999.999.999.999")).toBe(true);
      });
    });
  });

  describe("validateSafeExternalUrl", () => {
    describe("Protocol Validation", () => {
      it("permits http: and https: protocols", async () => {
        const httpsResult = await validateSafeExternalUrl("https://example.com/job/123");
        expect(httpsResult.safe).toBe(true);

        const httpResult = await validateSafeExternalUrl("http://example.com/job/123");
        expect(httpResult.safe).toBe(true);
      });

      it("blocks non-HTTP protocols", async () => {
        const ftpResult = await validateSafeExternalUrl("ftp://files.example.com/export.csv");
        expect(ftpResult.safe).toBe(false);
        if (!ftpResult.safe) {
          expect(ftpResult.reason).toContain("Only http: and https: protocols are permitted");
        }

        const fileResult = await validateSafeExternalUrl("file:///etc/passwd");
        expect(fileResult.safe).toBe(false);

        const javascriptResult = await validateSafeExternalUrl("javascript:alert(1)");
        expect(javascriptResult.safe).toBe(false);

        const dataResult = await validateSafeExternalUrl("data:text/html,<h1>Hello</h1>");
        expect(dataResult.safe).toBe(false);

        const gopherResult = await validateSafeExternalUrl("gopher://evil.example.com");
        expect(gopherResult.safe).toBe(false);
      });
    });

    describe("Hostname and Domain Blocking", () => {
      it("blocks localhost hostnames", async () => {
        const res1 = await validateSafeExternalUrl("http://localhost:3000/api/secret");
        expect(res1.safe).toBe(false);

        const res2 = await validateSafeExternalUrl("https://sub.localhost:8080");
        expect(res2.safe).toBe(false);
      });

      it("blocks .local mDNS hostnames", async () => {
        const res = await validateSafeExternalUrl("http://internal-db.local:5432");
        expect(res.safe).toBe(false);
      });

      it("blocks .internal hostnames", async () => {
        const res = await validateSafeExternalUrl("http://service.internal/health");
        expect(res.safe).toBe(false);
      });

      it("blocks .lan, .home, and .corp hostnames", async () => {
        expect((await validateSafeExternalUrl("http://router.lan")).safe).toBe(false);
        expect((await validateSafeExternalUrl("http://nas.home")).safe).toBe(false);
        expect((await validateSafeExternalUrl("http://payroll.corp")).safe).toBe(false);
      });
    });

    describe("Literal IP Hostnames", () => {
      it("blocks loopback literal IPs", async () => {
        const res = await validateSafeExternalUrl("http://127.0.0.1:8000/api");
        expect(res.safe).toBe(false);
        if (!res.safe) {
          expect(res.reason).toContain("Private or reserved IP addresses are not permitted");
        }
      });

      it("blocks cloud metadata literal IP", async () => {
        const res = await validateSafeExternalUrl("http://169.254.169.254/latest/meta-data");
        expect(res.safe).toBe(false);
      });

      it("blocks RFC 1918 private literal IPs", async () => {
        expect((await validateSafeExternalUrl("http://10.0.0.5/api")).safe).toBe(false);
        expect((await validateSafeExternalUrl("http://172.16.5.5/api")).safe).toBe(false);
        expect((await validateSafeExternalUrl("http://192.168.1.100/status")).safe).toBe(false);
      });

      it("blocks IPv6 loopback literal [::1]", async () => {
        const res = await validateSafeExternalUrl("http://[::1]:3000/api");
        expect(res.safe).toBe(false);
      });

      it("permits public IP literals", async () => {
        const res = await validateSafeExternalUrl("http://93.184.216.34/index.html");
        expect(res.safe).toBe(true);
        if (res.safe) {
          expect(res.url.hostname).toBe("93.184.216.34");
        }
      });
    });

    describe("Invalid URL Inputs", () => {
      it("handles empty or malformed URL strings gracefully", async () => {
        expect((await validateSafeExternalUrl("")).safe).toBe(false);
        expect((await validateSafeExternalUrl("   ")).safe).toBe(false);
        expect((await validateSafeExternalUrl("not-a-valid-url")).safe).toBe(false);
        expect((await validateSafeExternalUrl("http://")).safe).toBe(false);
      });
    });
  });
});
