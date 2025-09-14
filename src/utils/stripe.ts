import { env } from "~/env";
import Stripe from "stripe";

// Initialize Stripe client
export const stripe = new Stripe(env.STRIPE_API_KEY ?? "");