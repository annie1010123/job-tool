import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { createClient } from "@supabase/supabase-js";
import { transcribeAudio } from "@/lib/review/transcribe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await req.json();
  const review = await prisma.interviewReview.findUnique({
    where: { id: reviewId },
    include: { application: true },
  });

  if (!review || review.application.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!review.audioUrl) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 });
  }

  const { data, error } = await supabase.storage
    .from("interview-recordings")
    .download(review.audioUrl);

  if (error || !data) {
    return NextResponse.json({ error: "Failed to download audio" }, { status: 500 });
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const transcript = await transcribeAudio(buffer, "interview.mp3");

  await prisma.interviewReview.update({
    where: { id: reviewId },
    data: { transcript },
  });

  return NextResponse.json({ transcript });
}
