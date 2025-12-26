'use client';

export function PlanMeetingsPlaceholderPanel() {
  return (
    <div className="bg-white overflow-hidden opacity-70 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50/50">
        <h3 className="text-sm font-semibold text-slate-600">Plan Meetings</h3>
        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full font-medium">
          Coming Soon
        </span>
      </div>

      {/* Placeholder Content */}
      <div className="p-3">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-100 to-primary-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-primary-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"
              />
            </svg>
          </div>

          <h4 className="text-xs font-semibold text-slate-700 mb-1.5">
            Meeting Planning
          </h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            Find optimal times, share booking<br />
            links, and coordinate with team<br />
            availability.
          </p>

          <div className="inline-block bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1.5">
            <p className="text-[11px] text-primary-700 font-semibold">
              Coming in Sprint 15
            </p>
          </div>
        </div>

        {/* Mock UI Preview */}
        <div className="mt-5 space-y-1.5 opacity-40">
          <div className="h-6 bg-slate-100 rounded"></div>
          <div className="h-6 bg-slate-100 rounded w-3/4"></div>
          <div className="h-6 bg-slate-100 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}
