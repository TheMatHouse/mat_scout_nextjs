"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Editor from "@/components/shared/Editor";

export const metadata = {
  title: "Contact Us – MatScout",
  description:
    "Get in touch with the MatScout team. Questions, feedback, or issues? We’re here to help.",
  alternates: {
    canonical: `${
      process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
    }/contact`,
  },
  openGraph: {
    title: "Contact Us – MatScout",
    description:
      "Have a question, feedback, or need assistance? Contact MatScout today.",
    url: `${process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"}/contact`,
    images: [
      {
        url: `${
          process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
        }/default-og.png`,
        width: 1200,
        height: 630,
        alt: "Contact MatScout",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact MatScout",
    description:
      "Get in touch with the MatScout team for questions, feedback, or issues.",
    images: [
      `${
        process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
      }/default-og.png`,
    ],
  },
};

export default function ContactPage() {
  const router = useRouter();
  const [type, setType] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [phone, setPhone] = useState("");
  const [comments, setComments] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = {
      type,
      firstName: e.target.firstName.value,
      lastName: e.target.lastName.value,
      email: e.target.email.value,
      phone,
      comments,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormSubmitted(true);
      } else {
        alert("There was a problem submitting your form. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  };

  const thankYouLabel = {
    question: "your question",
    feedback: "your feedback",
    suggestion: "your suggestion",
    newStyle: "your request",
    problem: "reporting a problem",
  }[type];

  const domain = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    mainEntity: {
      "@type": "Organization",
      name: "MatScout",
      url: domain,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Customer Support",
        email: "support@matscout.com",
        areaServed: "US",
        availableLanguage: ["English"],
      },
    },
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-24 py-16 flex justify-center">
        <div className="w-full max-w-screen-xl bg-background text-foreground">
          <div className="w-full max-w-4xl mx-auto rounded-xl shadow-md bg-card p-8 md:p-12 border border-border">
            <h1 className="text-4xl font-bold mb-4 text-center">Contact Us</h1>
            <p className="text-muted-foreground text-center mb-6">
              Have a question, suggestion, or issue? We’d love to hear from you!
            </p>

            {formSubmitted ? (
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold">
                  Thank you for {thankYouLabel || "your message"}!
                </h2>
                <p className="text-muted-foreground">
                  We appreciate your input. A member of our team will be in
                  touch shortly.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {/* Subject */}
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background p-2 text-foreground"
                  >
                    <option value="">Select type...</option>
                    <option value="question">Ask a question</option>
                    <option value="feedback">Feedback</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="newStyle">Request new Style/Sport</option>
                    <option value="problem">Report a problem</option>
                  </select>
                </div>

                {/* Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      required
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="(555) 555-5555"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Comments (Editor) */}
                <div>
                  <Label
                    htmlFor="comments"
                    className="mb-1 block"
                  >
                    Message
                  </Label>
                  <Editor
                    name="comments"
                    text={comments}
                    onChange={setComments}
                  />
                </div>

                <div className="pt-4 text-center">
                  <Button
                    type="submit"
                    size="lg"
                  >
                    Submit Form
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
