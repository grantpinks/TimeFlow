'use client';

import Link from 'next/link';
import { getGoogleAuthUrl } from '@/lib/api';

export function HomepageFooter() {
  return (
    <footer className="bg-slate-900 text-white py-10 sm:py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Product */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Product</h3>
            <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-gray-400">
              <li><Link href="/features" className="hover:text-white active:text-gray-300 transition-colors inline-block min-h-[32px] py-1">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-white active:text-gray-300 transition-colors inline-block min-h-[32px] py-1">Pricing</Link></li>
              <li><a href={getGoogleAuthUrl()} className="hover:text-white active:text-gray-300 transition-colors inline-block min-h-[32px] py-1">Sign Up</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Company</h3>
            <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-white active:text-gray-300 transition-colors inline-block min-h-[32px] py-1">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white active:text-gray-300 transition-colors inline-block min-h-[32px] py-1">Contact</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h3>
            <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-gray-400">
              <li><Link href="/help" className="hover:text-white active:text-gray-300 transition-colors inline-block min-h-[32px] py-1">Help Center</Link></li>
              <li><a href="mailto:support@time-flow.app" className="hover:text-white active:text-gray-300 transition-colors inline-block min-h-[32px] py-1">Email Support</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Legal</h3>
            <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-gray-400">
              <li><Link href="/privacy" className="hover:text-white active:text-gray-300 transition-colors inline-block min-h-[32px] py-1">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white active:text-gray-300 transition-colors inline-block min-h-[32px] py-1">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-gray-400 text-xs sm:text-sm">
          © 2025 TimeFlow. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
