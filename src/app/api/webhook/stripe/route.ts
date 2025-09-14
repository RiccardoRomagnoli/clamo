// app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "~/env";
import { db } from "~/server/db";

const stripe = new Stripe(process.env.STRIPE_API_KEY ?? "");

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature") ?? "";
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }

  console.log(`Event received: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      
      // // Check if this is a priority waitlist payment
      // if (session.metadata?.type === "priority_waitlist" && session.metadata?.userId) {
      //   try {
      //     // Update user's priority_waitlist flag
      //     await db.user.update({
      //       where: { id: session.metadata.userId },
      //       data: { priority_waitlist: true }
      //     });
          
      //     console.log(`Updated priority_waitlist for user ${session.metadata.userId}`);
      //   } catch (error) {
      //     console.error("Failed to update user priority_waitlist:", error);
      //     return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
      //   }
      // }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;



      break;
    }

    default:
      console.log(`Unhandled event`);
  }

  return NextResponse.json({ received: true });
}