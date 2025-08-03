"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/shared/FormField";
import Editor from "@/components/shared/Editor";
import { Button } from "@/components/ui/button";

export default function ContactClient() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to send message");
      toast.success("Message sent successfully!");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-lg mx-auto"
    >
      {/* Name */}
      <FormField
        label="Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        required
      />

      {/* Email */}
      <FormField
        label="Email"
        type="email"
        name="email"
        value={form.email}
        onChange={handleChange}
        required
      />

      {/* Message */}
      <Editor
        name="message"
        text={form.message}
        onChange={(val) => setForm((prev) => ({ ...prev, message: val }))}
        label="Message"
      />

      {/* Submit Button */}
      <Button
        type="submit"
        className="btn-primary w-full"
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
