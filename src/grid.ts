import { Vec2 } from './vec2'
import { BoundArray } from './bound_array'

/* eslint-disable @typescript-eslint/no-namespace */
export namespace GridUtil {
  export function getIndex (x: number, y: number, width: number): number {
    return x + y * width
  }
  export function getX (index: number, width: number): number {
    return index % width
  }
  export function getY (index: number, width: number): number {
    return Math.floor(index / width)
  }
  export function getXY (index: number, width: number): [number, number] {
    return [getX(index, width), getY(index, width)]
  }

  export function checkGrid (array: unknown[][]): boolean {
    return (
      Array.isArray(array) &&
      array.every(Array.isArray) &&
      array.every(aisle => aisle.length === array[0].length)
    )
  }
  export function toGrid<T> (items: T[], width: number, height: number): T[][] {
    return [...Array(height)].map((_, y) => items.slice(y * width, (y + 1) * width))
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export class GridItem extends Vec2 {
  constructor (
    x: number,
    y: number,
    public index: number
  ) { super(x, y) }
}

export class Grid<T extends GridItem> extends BoundArray<T[]> {
  public readonly width: number
  public readonly height: number
  public get size (): number { return this.width * this.height }
  public constructor (array: T[][]) {
    super(...array)
    if (!GridUtil.checkGrid(this)) { throw new TypeError('invalid 2d array was given') }
    this.width = this[0].length
    this.height = array.length
  }

  private _1d: T[] | null = null
  private _2d: T[][] | null = null
  public to1d (): T[] {
    const result = this._1d ??= this.flat()
    return result
  }

  public to2d (): T[][] {
    const result = this._2d ??= Array.from(this)
    return result
  }

  public get (x: number, y: number): T {
    return this[y][x]
  }

  public set (x: number, y: number, item: T): this {
    this[y][x] = item
    item.x = x
    item.y = y
    item.index = GridUtil.getIndex(x, y, this.width)
    this._1d = this._2d = null
    return this
  }

  public swap (item1: T, item2: T): boolean {
    if (item1 === item2) return false
    const [x1, y1] = item1
    const [x2, y2] = item2
    this.set(x1, y1, item2)
    this.set(x2, y2, item1)
    return true
  }
}
