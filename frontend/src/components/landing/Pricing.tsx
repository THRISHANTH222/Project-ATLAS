"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Info } from "lucide-react";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Starter",
      description: "Perfect for exploring semantic search capabilities.",
      priceMonthly: 0,
      priceAnnual: 0,
      features: [
        "1 Connected Brain",
        "Up to 50 documents/sources",
        "100 AI queries per month",
        "Standard semantic recall (95%)",
        "Community support"
      ],
      cta: "Get Started Free",
      popular: false,
      href: "/signup",
      color: "bg-white"
    },
    {
      name: "Professional",
      description: "The complete setup for growing teams & startups.",
      priceMonthly: 49,
      priceAnnual: 39,
      features: [
        "3 Connected Brains",
        "Up to 1,000 documents/sources",
        "Unlimited AI queries",
        "Deep semantic recall (99.8%)",
        "Granular access control & roles",
        "API Integration & Webhooks",
        "Priority Slack & email support"
      ],
      cta: "Start 14-Day Free Trial",
      popular: true,
      href: "/signup",
      color: "bg-purple-50"
    },
    {
      name: "Enterprise",
      description: "Custom capabilities for security-sensitive teams.",
      priceMonthly: 199,
      priceAnnual: 159,
      features: [
        "Unlimited Connected Brains",
        "Unlimited documents & datasets",
        "Custom dedicated vector index",
        "SSO, SAML & SOC2 verification",
        "Custom LLM fine-tuning",
        "Dedicated Solutions Architect",
        "99.9% uptime SLA"
      ],
      cta: "Contact Enterprise",
      popular: false,
      href: "/signup",
      color: "bg-white"
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-[#FAF9F6] border-b-3 border-black relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
          <h2 className="inline-block px-4 py-1.5 rounded-lg border-2 border-black bg-pink-200 text-xs font-black text-black uppercase tracking-widest mb-4 shadow-[2px_2px_0px_#000000]">
            Pricing Plans
          </h2>
          <p className="text-3xl sm:text-4xl font-black text-black tracking-tight uppercase">
            Flexible packages for any scale
          </p>
          <p className="mt-4 text-slate-800 font-extrabold text-base mb-8">
            Choose a plan that fits your organizational needs. Switch or cancel anytime.
          </p>

          {/* Billing Switcher */}
          <div className="inline-flex items-center p-1.5 rounded-xl bg-white border-2 border-black shadow-[3px_3px_0px_#000000]">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer uppercase ${
                billingCycle === "monthly"
                  ? "bg-black text-white"
                  : "text-black hover:bg-slate-100"
              }`}
            >
              Billed Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer uppercase ${
                billingCycle === "annual"
                  ? "bg-black text-white"
                  : "text-black hover:bg-slate-100"
              }`}
            >
              <span>Billed Annually</span>
              <span className="px-1.5 py-0.5 rounded border border-black bg-yellow-200 text-black text-[9px] font-black shadow-[1px_1px_0px_#000000]">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-stretch max-w-6xl mx-auto px-4 md:px-0">
          {plans.map((plan, i) => {
            const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnual;
            return (
              <div
                key={i}
                className={`rounded-3xl p-8 flex flex-col justify-between border-2 border-black relative transition-all duration-200 ${
                  plan.popular
                    ? "bg-purple-100 border-3 border-black shadow-[8px_8px_0px_#000000] md:scale-105 z-10"
                    : "bg-white shadow-[6px_6px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_#000000]"
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-lg border-2 border-black bg-yellow-200 text-black text-[10px] font-black tracking-wider uppercase shadow-[3px_3px_0px_#000000]">
                    Most Popular
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-black text-black mb-2 uppercase tracking-wide">{plan.name}</h3>
                  <p className="text-xs text-slate-800 font-semibold leading-relaxed mb-6">
                    {plan.description}
                  </p>

                  <div className="flex items-baseline mb-8">
                    <span className="text-4xl sm:text-5xl font-black text-black tracking-tight">
                      ${price}
                    </span>
                    <span className="text-xs text-slate-500 ml-2 font-bold uppercase">/ month</span>
                  </div>

                  <hr className="border-black border mb-8" />

                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-3 text-xs leading-normal">
                        <Check className="w-5 h-5 text-black stroke-[3px] shrink-0 mt-0.5" />
                        <span className="text-slate-850 font-bold">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-10">
                  <Link
                    href={plan.href}
                    className={`block w-full py-4 rounded-xl text-center text-xs font-black transition-all border-2 border-black uppercase tracking-wider ${
                      plan.popular
                        ? "bg-yellow-200 hover:bg-yellow-300 text-black shadow-[4px_4px_0px_#000000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2.5px_2.5px_0px_#000000]"
                        : "bg-white hover:bg-slate-100 text-black shadow-[4px_4px_0px_#000000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2.5px_2.5px_0px_#000000]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                  {plan.name === "Starter" && (
                    <p className="text-[10px] text-slate-500 font-bold text-center mt-3 flex items-center justify-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-black" /> No credit card required.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
