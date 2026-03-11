import type { ConnPalette } from "./types"
import ms from 'ms'

export const API    = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
export const WS_URL = API.replace(/^http/, 'ws')

export const Connector = {
    DATAPIZZA: 'datapizza',
    RETE_INFORMATICA: 'reteInformatica',
} as const

export type ConnectorId = typeof Connector[keyof typeof Connector]

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