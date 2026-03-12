import type { SpinnerProps, ConnPalette } from "./types"
import ms from 'ms'

export const API    = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
export const WS_URL = API.replace(/^http/, 'ws')

export const Connector = {
    DATAPIZZA: 'datapizza',
    RETE_INFORMATICA: 'reteInformatica',
} as const

export type ConnectorId = typeof Connector[keyof typeof Connector]

/**
 * Generates the geometry and style properties for an SVG spinner.
 * @param {Partial<SpinnerProps>} [customProps] - Configuration to override default spinner dimensions and colors.
 * @returns {SpinnerProps} A complete set of properties for rendering the spinner.
 */export function generateSpinner(customProps?: Partial<SpinnerProps>): SpinnerProps {
    const radius = customProps?.radius ?? 13
    const strokeWidth = customProps?.strokeWidth ?? 2
    const size = customProps?.size ?? 40 
    
    const circumference = 2 * Math.PI * radius
    const centerPoint = size / 2
    
    const isDeterminate = customProps?.isDeterminate ?? false
    const progress = Math.min(100, Math.max(0, customProps?.progress ?? 0))
    const offset = circumference - (circumference * progress) / 100
    
    return {
        radius,
        strokeWidth,
        size,
        centerPoint,
        circumference,
        color: customProps?.color ?? 'rgba(255,255,255,0.85)',
        trackColor: customProps?.trackColor ?? 'rgba(255,255,255,0.08)',
        isDeterminate,
        progress,
        offset
    }
}

const CONNECTOR_COLOR: Record<ConnectorId, string> = {
    [Connector.DATAPIZZA]:       '124,106,255',
    [Connector.RETE_INFORMATICA]: '255,120,73',
}

const CONNECTOR_STYLE: Record<ConnectorId, React.CSSProperties> = {
    [Connector.DATAPIZZA]: {
        borderColor: `rgba(${ CONNECTOR_COLOR['datapizza'] },0.4)`,
        color: `rgba(${ CONNECTOR_COLOR['datapizza'] },1)`
    },
    [Connector.RETE_INFORMATICA]: {
        borderColor: `rgba(${ CONNECTOR_COLOR['reteInformatica'] },0.4)`,
        color: `rgba(${ CONNECTOR_COLOR['reteInformatica'] },1)`
    },
}

/**
 * @param {ConnectorId} id: Must be one of the keys defined in ConnectorId
 * @returns {ConnPalette}
 */
export const connPalette = (id: ConnectorId): ConnPalette => {
    return {
        color: CONNECTOR_COLOR[id],
        style: CONNECTOR_STYLE[id]
    }
}

/**
 * @param {string | Date} date
 * @param {boolean} long
 * @returns {string}
 */
export function timeAgo(date: string | Date, long: boolean): string {
    const diff = Date.now() - new Date(date).getTime()
    if (diff < 5000) return 'just now'
    return `${ms(diff, { long })} ago`
}