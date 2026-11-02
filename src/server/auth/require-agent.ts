import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { scopedDb } from "@/server/db/scoped-queries";
import { getAgentApiKey, getAgentUserEmail } from "@/lib/env";

export type AgentContext = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    timezone: string;
  };
  db: ReturnType<typeof scopedDb>;
};

export type AgentAuthResult =
  | { ok: true; context: AgentContext }
  | { ok: false; response: NextResponse };

function verifyBearerTokenConstantTime(provided: string, expected: string): boolean {
  const providedHash = crypto.createHash("sha256").update(provided).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(providedHash, expectedHash);
}

/**
 * Authenticates an incoming /api/agent/* request using Authorization: Bearer <AGENT_API_KEY>
 * and resolves the personal owner User record for scoped database operations.
 */
export async function requireAgent(request: NextRequest): Promise<AgentAuthResult> {
  const expectedKey = getAgentApiKey();
  if (!expectedKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "AGENT_API_KEY is not configured on this server" },
        { status: 500 }
      ),
    };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized: Missing Bearer token" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || !verifyBearerTokenConstantTime(token, expectedKey)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized: Invalid Bearer token" },
        { status: 401 }
      ),
    };
  }

  const targetEmail = getAgentUserEmail();

  let user = targetEmail
    ? await prisma.user.findFirst({
        where: {
          email: { equals: targetEmail, mode: "insensitive" },
          isGuest: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          timezone: true,
        },
      })
    : await prisma.user.findFirst({
        where: { isGuest: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          email: true,
          name: true,
          timezone: true,
        },
      });

  if (!user) {
    const fallbackEmail = targetEmail || "omargamal.dev@outlook.com";
    user = await prisma.user.create({
      data: {
        email: fallbackEmail,
        name: "Omar Gamal",
        isGuest: false,
        timezone: "Africa/Cairo",
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
      },
    });
  }

  return {
    ok: true,
    context: {
      user,
      db: scopedDb(user.id),
    },
  };
}
