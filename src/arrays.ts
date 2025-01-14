export type MapFunc<T, U> = (value: T, index: number, array: T[]) => U
export type ElementOf<ArrayType extends readonly unknown[]> = ArrayType extends ReadonlyArray<infer ElementType> ? ElementType : never
