import type { ReactNode } from 'react'

export default function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <div className="relative group inline-block focus:outline-none">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none invisible group-hover:visible group-focus-within:visible opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute z-50 -top-2 left-1/2 -translate-x-1/2 -translate-y-full min-w-40 max-w-64 px-3 py-2 rounded-md border border-slate-700 bg-slate-900/95 text-slate-100 text-[11px] shadow-lg"
      >
        {content}
      </div>
    </div>
  )
}


