import { NotImplementedError } from './classes'
import { OwnedEventEmitter } from './events'
import { Grid, GridItem } from './grid'
import { range, repeat } from './utils'
import { Vec2 } from './vec2'
import { insert } from './strings'

export class Piece extends GridItem {
  constructor (
    x: number,
    y: number,
    index: number,
    public readonly id: number
  ) { super(x, y, index) }

  isCorrect (): boolean {
    return this.id === this.index + 1
  }
}

export interface TapData {
  time: number
  delta: number
  x: number
  y: number
  index: number
  piece: Piece
  movedPieces: Piece[]
}

interface ToStringOptions {
  marginWidth?: number
  marginHeight?: number
  color?: number
}
export class Puzzle extends Grid<Piece> {
  public readonly events: OwnedEventEmitter<Puzzle>
  public taps: TapData[] = []
  public constructor (pieces: Piece[][] | number[][]) {
    super(pieces[0][0] instanceof Piece
      ? pieces as Piece[][]
      : pieces.map((row, indexOfRow) => row.map((id, indexInRow) => (
        new Piece(indexInRow, indexOfRow, indexOfRow * pieces[0].length + indexInRow, id as number)
      )))
    )
    this.events = new OwnedEventEmitter(this)
  }

  public clone (): Puzzle {
    if (Object.getPrototypeOf(this) !== Puzzle.prototype) throw new NotImplementedError('clone')
    return new Puzzle(this.to2d().map(row => row.map(piece => piece.id)))
  }

  public readonly timeGenerated = +new Date()
  public get timeStarted (): number | null {
    const tapData = this.taps.at(0)
    const result = tapData !== undefined && this.taps.length > 0 ? tapData.time : null
    return result
  }

  public get timeSolved (): number | null {
    const tapData = this.taps.at(-1)
    const result = tapData !== undefined && (this.taps.length > 0 && this.isSolved()) ? tapData.time : null
    return result
  }

  protected _isSolvable: boolean | null = null
  protected _isSolving: boolean | null = null
  protected _isSolved: boolean | null = null
  public isSolvable (): boolean {
    const result = this._isSolvable ??= this.checkSolvable()
    return result
  }

  public isSolving (): boolean {
    const result = this._isSolving ??= this.checkSolving()
    return result
  }

  public isSolved (): boolean {
    const result = this._isSolved ??= this.checkSolved()
    return result
  }

  public checkSolvable (): boolean {
    const cloned = this.clone()
    if (!cloned.get(0).equals(new Vec2(cloned.width - 1, cloned.height - 1))) {
      cloned.tap(cloned.width - 1, cloned.get(0).y)
      cloned.tap(cloned.width - 1, cloned.height - 1)
    }
    const swapCount = range(cloned.size - 2).reduce((acc, i) => {
      const j = cloned.to1d()[i]
      const k = cloned.get(i + 1)
      if (j !== k) {
        cloned.swap(j, k)
        return acc + 1
      } else return acc
    }, 0)
    return swapCount % 2 === 0
  }

  public checkSolving (): boolean {
    return this.timeStarted !== null && this.timeSolved === null
  }

  public checkSolved (): boolean {
    return this.isSolvable() &&
        range(1, this.width * this.height).concat(0).every((n, i) => this.to1d()[i].id === n)
  }

  public toString ({ marginWidth, marginHeight, color }: ToStringOptions = {}): string {
    const flip = '\x1b[30;47m'
    const reset = '\x1b[0m'

    const maxLength = Math.floor(Math.log(this.width * this.height - 1) / Math.log(10)) + 1
    const gridWidth = 2 * (marginWidth ?? 0) + maxLength
    const gridHeight = 2 * (marginHeight ?? 0) + 1
    const separator = '+' + ('-'.repeat(gridWidth) + '+').repeat(this.width)
    const row = '|' + (' '.repeat(gridWidth) + '|').repeat(this.width)

    const grid = [separator, ...Array(this.height).fill(Array(gridHeight).fill(row).concat(separator)).flat()]

    for (const row of this.map(row => row.slice().reverse())) {
      for (const piece of row) {
        const y1 = (1 + gridHeight) * piece.y + 1 + (marginHeight ?? 0)
        grid[y1] = insert(grid[y1], (piece.id ?? '').toString().padStart(maxLength, ' '), (1 + gridWidth) * piece.x + 1 + (marginWidth ?? 0), true)

        if (color !== undefined && piece.isCorrect()) {
          repeat(gridHeight, i => {
            const y2 = (1 + gridHeight) * piece.y + 1 + i
            grid[y2] = insert(grid[y2], reset, (1 + gridWidth) * piece.x + 1 + gridWidth)
            grid[y2] = insert(grid[y2], flip, (1 + gridWidth) * piece.x + 1)
          })
        }
      }
    }

    return grid.join('\n')
  }

  public get (x: number, y: number): Piece
  public get (id: number): Piece
  public get (...args: number[]): Piece {
    // @ts-expect-error
    if (args.length === 2) return super.get(...args)
    const [id] = args
    if (id < 0 || this.size <= id) throw new RangeError('invalid id')
    return this.to1d().find(piece => piece.id === id) as Piece
  }

  public set (x: number, y: number, piece: Piece): this {
    this._isSolvable = null
    this._isSolving = null
    this._isSolved = null
    return super.set(x, y, piece)
  }

  public tap (x: number, y: number): TapData | null {
    if (!Number.isInteger(x) || x < 0 || this.width <= x) throw new RangeError('x is out of range')
    if (!Number.isInteger(y) || y < 0 || this.height <= y) throw new RangeError('y is out of range')
    const tappedPiece = this.get(x, y)
    const emptyPiece = this.get(0)
    const xor = (emptyPiece.x === tappedPiece.x) !== (emptyPiece.y === tappedPiece.y)
    if (!xor) return null

    const distance = Math.abs(emptyPiece.x - tappedPiece.x + emptyPiece.y - tappedPiece.y)
    const direction = new Vec2(
      -(tappedPiece.x < emptyPiece.x) + +(emptyPiece.x < tappedPiece.x),
      -(tappedPiece.y < emptyPiece.y) + +(emptyPiece.y < tappedPiece.y)
    )

    const movedPieces: Piece[] = []

    repeat(distance, () => {
      const emptyPiece = this.get(0)
      const movedPiece = this.get(...emptyPiece.add(direction) as [number, number])
      movedPieces.push(movedPiece)
      this.swap(movedPiece, emptyPiece)
    })

    const time = +new Date()
    const tapData: TapData = {
      time,
      delta: time - (this.taps.at(-1)?.delta ?? this.timeGenerated),
      x,
      y,
      index: tappedPiece.index,
      piece: tappedPiece,
      movedPieces
    }

    this.taps.push(tapData)
    this.events.emit('tap', tapData)

    return tapData
  }
}
