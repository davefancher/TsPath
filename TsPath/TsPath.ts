module TsPath {
    export interface IPathCommand {
        Invoke(context: CanvasRenderingContext2D): void;
    }

    class Point {
        private _xCoordinate: number;
        private _yCoordinate: number;

        get X(): number { return this._xCoordinate; }
        get Y(): number { return this._yCoordinate; }

        constructor(x: number, y: number) {
            this._xCoordinate = x;
            this._yCoordinate = y;
        }
    }

    enum FillRule {
        EvenOdd = 0,
        NonZero = 1
    }

    class FillRuleCommand implements IPathCommand {
        private _fillRule: FillRule;

        get FillRule(): FillRule { return this._fillRule; }

        constructor(rule: FillRule) {
            this._fillRule = rule;
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.msFillRule = this._fillRule === FillRule.EvenOdd ? "evenodd" : "nonzero";
        }
    }

    class MoveToCommand implements IPathCommand {
        private _point: Point;

        get Point(): Point { return this._point; }

        constructor(p: Point) {
            this._point = p;
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.moveTo(this._point.X, this.Point.Y);
        }
    }

    class LineToCommand implements IPathCommand {
        private _point: Point;

        get Point(): Point { return this._point; }

        constructor(p: Point) {
            this._point = p;
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.lineTo(this._point.X, this.Point.Y);
        }
    }

    class ClosePathCommand implements IPathCommand {
        constructor() {
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.closePath();
        }
    }

    class TextStream {
        private _source: string;
        private _position: number;

        get Current(): string {
            return this._position >= this._source.length ? null : this._source[this._position];
        }

        MoveNext() { return ++this._position < this._source.length; }
        Reset() { this._position = 0; }

        constructor(source: string) {
            this._source = source;
            this.Reset();
        }
    }

    export class PathParser {
        private _wsChars = [" ", "\t"];
        private _commandChars = ["M", "L", "C", "Q", "A", "Z"];

        private IsCommandCharacter(current: string): boolean {
            return this._commandChars.indexOf(current) !== -1;
        }

        private IsWhitespaceCharacter(current: string): boolean {
            return this._wsChars.indexOf(current) !== -1;
        }

        private IsComma(current: string): boolean {
            return current === ",";
        }

        private IsNumberOrDecimal(current: string) {
            return !isNaN(parseInt(current, 10)) || current === ".";
        }

        private SkipWhitespace(stream: TextStream) {
            while (this.IsWhitespaceCharacter(stream.Current) && stream.MoveNext()) { }
        }

        private SkipComma(stream: TextStream) {
            if (this.IsComma(stream.Current)) stream.MoveNext();
        }

        private ReadNumber(stream: TextStream): number {
            var numStr = "";

            while (this.IsNumberOrDecimal(stream.Current)) {
                numStr += stream.Current;
                if (!stream.MoveNext()) break;
            }

            return Number(numStr);
        }

        private ReadPoint(stream: TextStream): Point {
            var x = this.ReadNumber(stream);
            this.SkipWhitespace(stream);
            this.SkipComma(stream);
            this.SkipWhitespace(stream);
            var y = this.ReadNumber(stream);

            return new Point(x, y);
        }

        private ParseFillStyleCommand(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing fill style command";

            var fillRule: FillRule;

            switch (this.ReadNumber(stream)) {
                case 0:
                    fillRule = FillRule.EvenOdd;
                    break;
                case 1:
                    fillRule = FillRule.NonZero;
                    break;
                default:
                    throw "Invalid fill style option. Valid options are 0 (evenodd) and 1 (nonzero)";
            }

            this.SkipWhitespace(stream);

            return [new FillRuleCommand(fillRule)];
        }

        private ParseMoveToCommand(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing move to command";
            this.SkipWhitespace(stream);

            var p = this.ReadPoint(stream);

            this.SkipWhitespace(stream);

            return [new MoveToCommand(p)];
        }

        private ParseLineToCommand(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands: IPathCommand[] = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var p = this.ReadPoint(stream);
                this.SkipWhitespace(stream);
                commands.push(new LineToCommand(p));
            }

            return commands;
        }

        private ParseClosePathCommand(stream: TextStream): IPathCommand[] {
            stream.MoveNext();
            this.SkipWhitespace(stream);

            return [new ClosePathCommand()];
        }

        private ResolveInitialCommand(stream: TextStream): IPathCommand[] {
            this.SkipWhitespace(stream);

            switch (stream.Current) {
                case "F": return this.ParseFillStyleCommand(stream);
                case "M": return this.ParseMoveToCommand(stream);
            }

            throw "Invalid command";
        }

        private ResolveDrawingCommands(stream: TextStream) : IPathCommand[] {
            switch (stream.Current) {
                case "M": return this.ParseMoveToCommand(stream);
                case "L": return this.ParseLineToCommand(stream);
                case "C": return [];
                case "Q": return [];
                case "A": return [];
                case "Z": return this.ParseClosePathCommand(stream);
            }

            throw "Invalid command";
        }

        Parse(context: CanvasRenderingContext2D, path: string): IPathCommand[]{
            if (context === null) throw "Missing drawing context";
            if (path === "") return [];

            var stream = new TextStream(path);

            this.ResolveInitialCommand(stream).forEach(c => c.Invoke(context));

            while (true) {
                this.ResolveDrawingCommands(stream).forEach(c => c.Invoke(context));

                if (stream.Current != null && this.IsCommandCharacter(stream.Current)) continue;
                if (!stream.MoveNext()) break;
            }

            context.stroke();
            //context.fill();
        }
    }
}