"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";
import { guidesData, allGuideSlugs, GuideKey } from "../guideData";

export default function GuidePage() {
  const params = useParams();
  const guideName = (params["guide-name"] as string) || "";

  const guide = guidesData[guideName as GuideKey];

  if (!guide) {
    return (
      <div className="min-h-screen text-gray-900 overflow-x-hidden">
        <Navbar />
        <section className="relative pt-32 pb-20 px-4 md:px-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-10 blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-10 blur-3xl -z-10" />
          <div className="container mx-auto max-w-4xl text-center space-y-8">
            <h1 className="text-5xl font-bold text-gray-900">
              Guide Not Found
            </h1>
            <p className="text-xl text-gray-600">
              The guide you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Back to Documentation
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const GuideIcon = guide.icon;

  // Get current guide index for navigation
  const currentIndex = allGuideSlugs.indexOf(guideName as GuideKey);
  const prevGuide =
    currentIndex > 0 ? allGuideSlugs[currentIndex - 1] : undefined;
  const nextGuide =
    currentIndex < allGuideSlugs.length - 1
      ? allGuideSlugs[currentIndex + 1]
      : undefined;

  return (
    <div className="min-h-screen text-gray-900 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 md:px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-10 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-10 blur-3xl -z-10" />

        <div className="container mx-auto max-w-4xl">
          {/* Breadcrumb */}
          <div className="mb-8 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/docs" className="hover:text-blue-600">
              Documentation
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{guide.title}</span>
          </div>

          {/* Header */}
          <div className="space-y-6">
            <div className="inline-flex p-3 bg-blue-100 rounded-lg">
              <GuideIcon className="w-8 h-8 text-blue-600" />
            </div>

            <div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">
                {guide.title}
              </h1>
              <p className="text-xl text-gray-600 mb-8">{guide.description}</p>
            </div>

            {/* Meta Information */}
            <div className="flex flex-wrap gap-6 py-8 border-t border-b border-gray-200">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Estimated Time</div>
                  <div className="font-semibold text-gray-900">
                    {guide.estimatedTime}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BookmarkIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Difficulty</div>
                  <div className="font-semibold text-gray-900">
                    {guide.difficulty}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Guide Sections */}
          <div className="space-y-12 mb-16">
            {guide.sections.map((section, index) => (
              <div key={section.id} className="scroll-mt-20" id={section.id}>
                <div className="flex gap-4">
                  {/* Step Number */}
                  <div className="shrink-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-500 text-white font-bold">
                      {index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="grow">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {section.title}
                    </h2>
                    <p className="text-gray-600 mb-4">{section.description}</p>

                    <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-lg p-6 mb-6">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
                    </div>

                    {/* Code Block */}
                    {section.codeBlock && (
                      <div className="mb-6">
                        <p className="text-sm font-semibold text-gray-600 mb-3">
                          CODE EXAMPLE
                        </p>
                        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                          <pre className="font-mono text-sm leading-relaxed">
                            <code>{section.codeBlock}</code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                {index < guide.sections.length - 1 && (
                  <div className="mt-8 ml-5 h-8 border-l-2 border-gray-200" />
                )}
              </div>
            ))}
          </div>

          {/* Related Guides */}
          {guide.relatedGuides && guide.relatedGuides.length > 0 && (
            <div className="mb-16 py-12 border-t border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Related Guides
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {guide.relatedGuides.map((relatedSlug) => {
                  const relatedGuide = guidesData[relatedSlug as GuideKey];
                  if (!relatedGuide) return null;

                  const RelatedIcon = relatedGuide.icon;
                  return (
                    <Link
                      key={relatedSlug}
                      href={`/docs/guides/${relatedSlug}`}
                      className="group bg-white/70 backdrop-blur-md border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 p-2 bg-blue-100 rounded group-hover:bg-blue-200 transition-colors">
                          <RelatedIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="grow">
                          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {relatedGuide.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {relatedGuide.description}
                          </p>
                        </div>
                        <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="py-12 border-t border-gray-200">
            <div className="grid md:grid-cols-2 gap-6">
              {prevGuide ? (
                <Link
                  href={`/docs/guides/${prevGuide}`}
                  className="group flex items-center gap-4 p-6 bg-white/70 backdrop-blur-md border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-lg transition-all"
                >
                  <ArrowLeftIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <div className="text-sm text-gray-500">Previous Guide</div>
                    <div className="font-semibold text-gray-900">
                      {guidesData[prevGuide as GuideKey].title}
                    </div>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {nextGuide ? (
                <Link
                  href={`/docs/guides/${nextGuide}`}
                  className="group flex items-center justify-between gap-4 p-6 bg-white/70 backdrop-blur-md border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-lg transition-all text-right md:text-left"
                >
                  <div>
                    <div className="text-sm text-gray-500">Next Guide</div>
                    <div className="font-semibold text-gray-900">
                      {guidesData[nextGuide as GuideKey].title}
                    </div>
                  </div>
                  <ArrowRightIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                </Link>
              ) : (
                <div />
              )}
            </div>
          </div>

          {/* Call to Action */}
          <div className="py-12 px-8 bg-linear-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-gray-600 mb-6">
              Complete this guide and explore more resources to master Navlens
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
