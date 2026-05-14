import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[100px] w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-base font-sans text-charcoal placeholder:text-charcoal-muted',
          'focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-none transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
