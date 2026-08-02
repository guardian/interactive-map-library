export function zInterp(stops: Record<number, any>, base?: number): {
    base?: undefined;
} | {
    base: number;
};
export function zInterpExpr(stops: Record<number, number>, base?: number): unknown[];
export function zStep(base: any, stops: Record<number, any>): any[];
