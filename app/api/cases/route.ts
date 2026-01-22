import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bankruptcyCases } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.clientName) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    if (!body.caseType || !["chapter7", "chapter13"].includes(body.caseType)) {
      return NextResponse.json(
        { error: "Valid case type is required (chapter7 or chapter13)" },
        { status: 400 }
      );
    }

    // Create the case
    const [newCase] = await db
      .insert(bankruptcyCases)
      .values({
        userId: session.user.id,
        clientName: body.clientName,
        clientEmail: body.clientEmail || null,
        clientPhone: body.clientPhone || null,
        ssnLast4: body.ssnLast4 || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        county: body.county || null,
        caseType: body.caseType,
        filingType: body.filingType || "individual",
        householdSize: body.householdSize ? parseInt(body.householdSize) : null,
        status: "intake",
      })
      .returning();

    return NextResponse.json({
      success: true,
      caseId: newCase.id,
      case: newCase,
    });
  } catch (error) {
    console.error("Error creating case:", error);
    return NextResponse.json(
      { error: "Failed to create case" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all cases for this user
    const cases = await db
      .select()
      .from(bankruptcyCases)
      .where(eq(bankruptcyCases.userId, session.user.id))
      .orderBy(desc(bankruptcyCases.createdAt));

    return NextResponse.json({
      success: true,
      cases,
    });
  } catch (error) {
    console.error("Error fetching cases:", error);
    return NextResponse.json(
      { error: "Failed to fetch cases" },
      { status: 500 }
    );
  }
}
