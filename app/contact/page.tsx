"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactMethods = [
    {
      icon: EnvelopeIcon,
      title: "Email Us",
      description: "Send us an email anytime",
      value: "support@navlens.com",
      color: "blue",
    },
    {
      icon: PhoneIcon,
      title: "Call Us",
      description: "Mon-Fri, 9am-6pm UTC",
      value: "+94 77 467 1009",
      color: "purple",
    },
    {
      icon: MapPinIcon,
      title: "Visit Us",
      description: "Our headquarters",
      value: "Colombo, Sri Lanka",
      color: "blue",
    },
  ];

  return (
    <div className="min-h-screen text-gray-900 overflow-x-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 md:px-6 overflow-hidden">
        {/* Background Gradient Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-10 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-10 blur-3xl -z-10" />

        <div className="container mx-auto max-w-5xl text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-blue-50 to-purple-50 border border-purple-200 backdrop-blur-sm">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Get in Touch
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            <span className="text-gray-900">We&apos;d Love to</span>
            <br />
            <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Hear From You
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Have questions about Navlens? Need help with your account? Want to discuss enterprise solutions? 
            We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => {
              const Icon = method.icon;
              const bgColor = method.color === "blue" 
                ? "bg-blue-600 shadow-lg shadow-blue-500/30" 
                : "bg-purple-600 shadow-lg shadow-purple-500/30";
              const borderHover = method.color === "blue"
                ? "hover:border-blue-400"
                : "hover:border-purple-400";

              return (
                <div
                  key={index}
                  className={`group bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 ${borderHover} hover:shadow-xl transition-all duration-300 text-center`}
                >
                  <div className={`w-14 h-14 rounded-xl ${bgColor} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{method.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">{method.description}</p>
                  <p className="font-semibold text-gray-900">{method.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Side - Form */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-xl border border-gray-200">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center mx-auto mb-6">
                    <CheckCircleIcon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Message Sent!</h3>
                  <p className="text-gray-600 mb-6">
                    Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Send us a Message</h2>
                  <p className="text-gray-600 mb-8">Fill out the form below and we&apos;ll respond promptly.</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                          Your Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                        Subject
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                      >
                        <option value="">Select a subject...</option>
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="sales">Sales & Pricing</option>
                        <option value="enterprise">Enterprise Solutions</option>
                        <option value="partnership">Partnership Opportunities</option>
                        <option value="feedback">Feedback & Suggestions</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                        Your Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                        placeholder="Tell us how we can help you..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="w-5 h-5" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Right Side - Additional Info */}
            <div className="space-y-8">
              {/* Response Time Card */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-purple-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <ClockIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Quick Response Time</h3>
                    <p className="text-gray-600 text-sm">
                      We typically respond to all inquiries within 24 hours during business days. 
                      Enterprise customers receive priority support.
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ Preview */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  {[
                    { q: "How do I get started?", a: "Sign up for free and add our tracking script to your website." },
                    { q: "Is there a free trial?", a: "Yes! We offer a 14-day free trial with full access to all features." },
                    { q: "Can I cancel anytime?", a: "Absolutely. Cancel your subscription anytime with no questions asked." },
                  ].map((faq, idx) => (
                    <div key={idx} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">{faq.q}</h4>
                      <p className="text-gray-600 text-sm">{faq.a}</p>
                    </div>
                  ))}
                </div>
                <a 
                  href="/docs" 
                  className="inline-flex items-center gap-2 mt-4 text-blue-600 font-semibold text-sm hover:gap-3 transition-all"
                >
                  View all FAQs →
                </a>
              </div>

              {/* Social Links */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4">Connect With Us</h3>
                <div className="flex gap-3">
                  {["Twitter", "LinkedIn", "GitHub"].map((social) => (
                    <button
                      key={social}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                    >
                      {social}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden bg-purple-50 backdrop-blur-md rounded-3xl p-12 md:p-16 shadow-2xl border border-white/50">
            <div className="relative z-10 text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Ready to Get Started?
              </h2>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">
                Start tracking user behavior on your website today with our free trial. 
                No credit card required.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="/dashboard"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Start Free Trial
                </a>
                <a
                  href="/pricing"
                  className="px-8 py-4 bg-transparent text-gray-900 rounded-xl font-semibold border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all duration-300"
                >
                  View Pricing
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
