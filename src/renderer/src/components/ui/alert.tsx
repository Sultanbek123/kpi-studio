import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@renderer/lib/utils'

const alertVariants = cva('flex items-start gap-2 rounded-md border p-3 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-muted text-foreground',
      destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
      warning: 'border-warning/40 bg-warning/10 text-warning-foreground',
      success: 'border-success/30 bg-success/10 text-success-foreground'
    }
  },
  defaultVariants: { variant: 'default' }
})

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps): React.JSX.Element {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}
