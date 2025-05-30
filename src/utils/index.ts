import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')
dayjs.extend(relativeTime)

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>

export interface SelectOption {
  label: string
  value: string
}

export const toFixed = (n: number, fractionDigits: number = 1) => {
  return Number.isInteger(n) ? n : parseFloat(n.toFixed(fractionDigits))
}

export const isString = (val: unknown): val is string => typeof val === 'string'

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export const isArray = Array.isArray
