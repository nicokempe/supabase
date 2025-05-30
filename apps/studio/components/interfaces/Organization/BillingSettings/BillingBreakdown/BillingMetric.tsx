import Link from 'next/link'

import { PricingMetric } from 'data/analytics/org-daily-stats-query'
import type { OrgSubscription } from 'data/subscriptions/types'
import type { OrgUsageResponse } from 'data/usage/org-usage-query'
import { formatCurrency } from 'lib/helpers'
import { useMemo } from 'react'
import { Button, HoverCard, HoverCardContent, HoverCardTrigger } from 'ui'
import { billingMetricUnit, formatUsage } from '../helpers'
import { Metric, USAGE_APPROACHING_THRESHOLD } from './BillingBreakdown.constants'
import { ChevronRight } from 'lucide-react'

export interface BillingMetricProps {
  idx: number
  slug?: string
  metric: Metric
  usage: OrgUsageResponse
  subscription: OrgSubscription
  relativeToSubscription: boolean
}

const BillingMetric = ({
  slug,
  metric,
  usage,
  subscription,
  relativeToSubscription,
}: BillingMetricProps) => {
  const usageMeta = usage.usages.find((x) => x.metric === metric.key)

  const usageLabel = useMemo(() => {
    if (!usageMeta) return ''

    if (relativeToSubscription && usageMeta.available_in_plan === false) {
      return 'Unavailable in plan'
    } else if (
      (usageMeta.cost && usageMeta.cost > 0) ||
      !relativeToSubscription ||
      usageMeta.unlimited ||
      usageMeta.pricing_free_units === 0
    ) {
      return metric.units === 'bytes' || metric.units === 'gigabytes'
        ? `${usageMeta.usage.toLocaleString() ?? 0} GB`
        : usageMeta.usage.toLocaleString() + (metric.unitName ? ` ${metric.unitName}` : '')
    } else {
      return metric.units === 'bytes' || metric.units === 'gigabytes'
        ? `${usageMeta.usage.toLocaleString() ?? 0} / ${usageMeta.pricing_free_units ?? 0} GB`
        : `${usageMeta.usage.toLocaleString()} / ${usageMeta.pricing_free_units?.toLocaleString()}` +
            (metric.unitName ? ` ${metric.unitName}` : '')
    }
  }, [usageMeta, relativeToSubscription, metric])

  const sortedProjectAllocations = useMemo(() => {
    if (!usageMeta || !usageMeta.project_allocations) return []

    return usageMeta.project_allocations.sort((a, b) => b.usage - a.usage)
  }, [usageMeta])

  if (!usageMeta) return null

  const usageRatio =
    usageMeta.usage === 0 ? 0 : usageMeta.usage / (usageMeta.pricing_free_units ?? 0)

  const isUsageBillingEnabled = subscription?.usage_billing_enabled === true

  const hasLimit = !!usageMeta.unlimited === false
  const isApproachingLimit = hasLimit && usageRatio >= USAGE_APPROACHING_THRESHOLD
  const isExceededLimit = relativeToSubscription && hasLimit && usageRatio >= 1

  const unit = billingMetricUnit(usageMeta.metric as PricingMetric)

  const percentageLabel =
    usageMeta.usage === 0 || usageMeta.pricing_free_units === 0
      ? ''
      : usageRatio < 0.01
        ? '(<1%)'
        : `(${(+(usageRatio * 100).toFixed(0)).toLocaleString()}%)`

  return (
    <HoverCard openDelay={50} closeDelay={200}>
      <HoverCardTrigger asChild>
        <div className="flex items-center justify-between">
          <Link href={`/org/${slug}/usage#${metric.anchor}`} className="block w-full group">
            {metric.anchor ? (
              <div className="group flex items-center gap-1">
                <p className="text-sm text-foreground-light group-hover:text-foreground transition cursor-pointer">
                  {metric.name}
                </p>
                {usageMeta.available_in_plan && (
                  <span className="transition inline-block group-hover:transform group-hover:translate-x-0.5">
                    <ChevronRight strokeWidth={1.5} size={16} className="transition" />
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-foreground-light flex space-x-1">{metric.name}</p>
            )}
            <span className="text-sm">{usageLabel}</span>&nbsp;
            {relativeToSubscription && usageMeta.cost && usageMeta.cost > 0 ? (
              <span className="text-sm" translate="no">
                ({formatCurrency(usageMeta.cost)})
              </span>
            ) : usageMeta.available_in_plan && !usageMeta.unlimited && relativeToSubscription ? (
              <span className="text-sm">{percentageLabel}</span>
            ) : null}
          </Link>

          {usageMeta.available_in_plan ? (
            <div>
              {relativeToSubscription && !usageMeta.unlimited ? (
                <svg className="h-8 w-8 -rotate-90 transform">
                  <circle
                    cx={15}
                    cy={15}
                    r={12}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={4}
                    className="text-background-surface-300"
                  />
                  <circle
                    cx={15}
                    cy={15}
                    r={12}
                    fill="transparent"
                    stroke="currentColor"
                    strokeDasharray={75.398}
                    strokeDashoffset={`calc(75.39822 - ${
                      usageRatio < 1 ? usageRatio * 100 : 100
                    } / 100 * 75.39822)`}
                    strokeWidth={4}
                    className={
                      isUsageBillingEnabled
                        ? 'text-gray-dark-800'
                        : isExceededLimit
                          ? 'text-red-900'
                          : isApproachingLimit
                            ? 'text-yellow-1000'
                            : 'text-gray-dark-800'
                    }
                  />
                </svg>
              ) : null}
            </div>
          ) : (
            <div>
              <Button type="default" asChild>
                <Link
                  href={`/org/${slug}/billing?panel=subscriptionPlan&source=billingBreakdownUsage${metric.anchor}`}
                >
                  Upgrade
                </Link>
              </Button>
            </div>
          )}
        </div>
      </HoverCardTrigger>
      {usageMeta.available_in_plan && (
        <HoverCardContent side="bottom" align="center" className="w-[500px]" animate="slide-in">
          <div className="text-sm">
            <p className="font-medium" translate="no">
              {usageMeta.unit_price_desc}
            </p>

            {metric.tip && (
              <div className="my-2">
                <p className="text-sm">
                  {metric.tip}{' '}
                  {metric.docLink && (
                    <Link
                      href={metric.docLink.url}
                      target="_blank"
                      className="transition text-brand hover:text-brand-600 underline"
                    >
                      {metric.docLink.title}
                    </Link>
                  )}
                </p>
              </div>
            )}

            {subscription.usage_billing_enabled === false &&
              relativeToSubscription &&
              (isApproachingLimit || isExceededLimit) && (
                <div className="my-2">
                  <p className="text-sm">
                    Exceeding your plans included usage will lead to restrictions to your project.
                    Upgrade to a usage-based plan or disable the spend cap to avoid restrictions.
                  </p>
                </div>
              )}

            {sortedProjectAllocations && sortedProjectAllocations.length > 0 && (
              <table className="list-disc w-full">
                <thead>
                  <tr>
                    <th className="text-left">Project</th>
                    <th className="text-right">Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProjectAllocations.map((allocation) => (
                    <tr key={`${usageMeta.metric}_${allocation.ref}`}>
                      <td>{allocation.name}</td>
                      <td className="text-right">
                        {formatUsage(usageMeta.metric as PricingMetric, allocation)}
                      </td>
                    </tr>
                  ))}
                  <tr></tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-2 border-t text-left">
                      Total{unit && <span> ({unit})</span>}
                    </td>
                    <td className="py-2 border-t text-right">
                      {formatUsage(usageMeta.metric as PricingMetric, {
                        usage: usageMeta.usage_original,
                      })}{' '}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </HoverCardContent>
      )}
    </HoverCard>
  )
}

export default BillingMetric
