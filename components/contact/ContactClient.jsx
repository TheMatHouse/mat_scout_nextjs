"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import Editor from "@/components/shared/Editor";
import { Button } from "@/components/ui/button";

const messageTypes = [
  { value: "General Inquiry", label: "General Inquiry" },
  { value: "Support", label: "Support" },
  { value: "Feature Request", label: "Feature Request" },
  { value: "Bug Report", label: "Bug Report" },
];

export default function ContactClient() {
  const [form, setForm] = useState({
    type: "",
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      setSubmitted(true);
      toast.success("Message sent successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center bg-green-50 dark:bg-green-900 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-green-700 dark:text-green-300">
          Thank you!
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mt-2">
          Your message has been sent. We’ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-lg mx-auto"
    >
      <FormSelect
        label="Message Type"
        value={form.type}
        onChange={(val) => setForm((prev) => ({ ...prev, type: val }))}
        placeholder="Select type..."
        options={messageTypes}
      />

      <FormField
        label="Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        required
      />

      <FormField
        label="Email"
        type="email"
        name="email"
        value={form.email}
        onChange={handleChange}
        required
      />

      <FormField
        label="Phone"
        name="phone"
        value={form.phone}
        onChange={handleChange}
      />

      <Editor
        name="message"
        text={form.message}
        onChange={(val) => setForm((prev) => ({ ...prev, message: val }))}
        label="Message"
      />

      <Button
        type="submit"
        className="btn-submit"
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
